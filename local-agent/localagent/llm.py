"""Talks to Ollama, the free app that runs AI models on your own machine.

Ollama listens on http://localhost:11434. Nothing leaves your computer: requests
go straight to it and never through a proxy.
"""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request

_THINK = re.compile(r"<think>.*?</think>", re.DOTALL)


class OllamaError(Exception):
    pass


class OllamaClient:
    def __init__(self, host: str, model: str, temperature: float = 0.2, num_ctx: int = 8192,
                 think: bool | None = False, timeout: float = 600):
        self.host = host.rstrip("/")
        self.model = model
        self.temperature = temperature
        self.num_ctx = num_ctx
        self.think = think
        self.timeout = timeout
        # An empty ProxyHandler means "never use a proxy" — this traffic stays on your machine.
        self._opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def _request(self, path: str, payload: dict | None = None, timeout: float | None = None) -> dict:
        data = json.dumps(payload).encode() if payload is not None else None
        req = urllib.request.Request(self.host + path, data=data, headers={"Content-Type": "application/json"})
        try:
            with self._opener.open(req, timeout=timeout or self.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            try:
                detail = json.loads(e.read().decode("utf-8")).get("error", "")
            except Exception:
                detail = ""
            raise OllamaError(_explain(e.code, detail, self.model)) from None
        except (urllib.error.URLError, ConnectionError, TimeoutError) as e:
            raise OllamaError(
                f"Can't reach Ollama at {self.host} ({getattr(e, 'reason', e)}). "
                "Is it running? Open the Ollama app, or run `ollama serve` in another terminal."
            ) from None

    def version(self) -> str:
        return self._request("/api/version", timeout=5).get("version", "?")

    def installed_models(self) -> list[str]:
        return [m["name"] for m in self._request("/api/tags", timeout=10).get("models", [])]

    def has_model(self) -> bool:
        want = self.model if ":" in self.model else self.model + ":latest"
        return any(m == want or m == self.model for m in self.installed_models())

    def chat(self, messages: list[dict], tools: list[dict] | None = None) -> dict:
        """Send the conversation, get back the assistant's next message (text and/or tool calls)."""
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": self.temperature, "num_ctx": self.num_ctx},
        }
        if tools:
            payload["tools"] = tools
        if self.think is not None:
            payload["think"] = self.think
        try:
            resp = self._request("/api/chat", payload)
        except OllamaError as e:
            # Older Ollama versions / some models reject the "think" switch: retry once without it.
            if "think" in payload and "think" in str(e).lower():
                self.think = None
                payload.pop("think")
                resp = self._request("/api/chat", payload)
            else:
                raise
        msg = resp.get("message") or {}
        content = _THINK.sub("", msg.get("content") or "").strip()
        return {"role": "assistant", "content": content, "tool_calls": msg.get("tool_calls") or []}


def _explain(code: int, detail: str, model: str) -> str:
    low = detail.lower()
    if code == 404 or "not found" in low:
        return f"The model '{model}' isn't downloaded yet. Run:  ollama pull {model}"
    if "does not support tools" in low:
        return (f"The model '{model}' can't use tools, so it can't act on your computer. "
                "Pick one that can, e.g. qwen3:8b or llama3.1:8b, and set it in config.toml.")
    return f"Ollama returned an error ({code}): {detail or 'no details'}"
