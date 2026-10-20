"""The agent loop: the model decides which tool to call, we run it, and feed the result back."""

from __future__ import annotations

import json
import platform
import re
from pathlib import Path
from typing import Callable

from .safety import pretty
from .tools import Context, Tool

MAX_STEPS = 10

SYSTEM_PROMPT = """You are LocalAgent, a helpful assistant that runs entirely on the user's own computer. \
You can look at and tidy the user's files, read their calendar, and keep their to-do list, using the tools provided.

Now: {now}
Computer: {os}, home folder {home}
Folders you may use: {folders}
Calendars: {calendars}

Rules:
- Use a tool whenever the answer depends on the user's files, calendar or to-dos. Never guess or make up file names, events or results.
- Paths can be written like ~/Downloads/report.pdf.
- Tools that move or rename files show the user a plan and ask permission themselves, so just call them. If the user says no, accept it.
- Nothing is ever deleted. Clutter and duplicates get moved into a folder for the user to review instead.
- Before tidying a folder you haven't looked at yet, look at it first (folder_summary).
- After using tools, reply briefly: a few sentences or a short list, in plain language, using the user's local time."""


class Agent:
    def __init__(self, llm, tools: list[Tool], ctx: Context,
                 on_tool: Callable[[str, dict], None] | None = None,
                 on_result: Callable[[str, str], None] | None = None):
        self.llm = llm
        self.tools = {t.name: t for t in tools}
        self.schemas = [t.schema() for t in tools]
        self.ctx = ctx
        self.on_tool = on_tool or (lambda name, args: None)
        self.on_result = on_result or (lambda name, result: None)
        self.history: list[dict] = []

    def reset(self) -> None:
        self.history = []

    def system_prompt(self) -> str:
        cfg = self.ctx.config
        cals = getattr(cfg, "calendars", [])
        return SYSTEM_PROMPT.format(
            now=self.ctx.now().strftime("%A %d %B %Y, %H:%M (UTC%z)"),
            os=f"{platform.system()} {platform.release()}",
            home=pretty(Path.home()) + f" ({Path.home()})",
            folders=self.ctx.sandbox.describe_roots(),
            calendars=", ".join(c.name for c in cals) if cals else "none set up yet",
        )

    def ask(self, text: str) -> str:
        self.history.append({"role": "user", "content": text})
        self._trim()
        for _ in range(MAX_STEPS):
            messages = [{"role": "system", "content": self.system_prompt()}] + self.history
            reply = self.llm.chat(messages, self.schemas)
            calls = reply["tool_calls"] or self._calls_from_text(reply["content"])
            if not calls:
                answer = reply["content"] or "(no reply)"
                self.history.append({"role": "assistant", "content": answer})
                return answer
            self.history.append({"role": "assistant", "content": reply["content"], "tool_calls": calls})
            for call in calls:
                fn = call.get("function", {})
                name = fn.get("name", "")
                args = fn.get("arguments") or {}
                if isinstance(args, str):  # some models send arguments as a JSON string
                    try:
                        args = json.loads(args)
                    except json.JSONDecodeError:
                        args = {}
                self.on_tool(name, args)
                tool = self.tools.get(name)
                result = tool.run(self.ctx, args) if tool else f"Error: there's no tool called '{name}'."
                self.on_result(name, result)
                self.history.append({"role": "tool", "tool_name": name, "content": result})
        answer = "Sorry, I went round in circles on that one. Could you rephrase or break it into smaller steps?"
        self.history.append({"role": "assistant", "content": answer})
        return answer

    def _calls_from_text(self, content: str) -> list[dict]:
        """Some small models write the tool call as JSON text instead of using the tool API. Accept that too."""
        text = content.strip()
        m = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
        if m:
            text = m.group(1)
        m = re.fullmatch(r"<tool_call>\s*(.*?)\s*</tool_call>", text, re.DOTALL)
        if m:
            text = m.group(1)
        if not (text.startswith("{") and text.endswith("}")):
            return []
        try:
            obj = json.loads(text)
        except json.JSONDecodeError:
            return []
        name = obj.get("name") or obj.get("function") or obj.get("tool")
        args = obj.get("arguments") or obj.get("parameters") or obj.get("args") or {}
        if isinstance(name, str) and name in self.tools and isinstance(args, (dict, str)):
            return [{"function": {"name": name, "arguments": args}}]
        return []

    def _trim(self) -> None:
        """Keep the conversation within the model's context window by dropping the oldest whole turns."""
        budget = int(getattr(self.ctx.config, "context_window", 8192) * 0.6 * 3.5)  # ~3.5 chars per token
        budget -= sum(len(json.dumps(s)) for s in self.schemas) + 1500  # tool list + system prompt
        while sum(len(str(m.get("content", ""))) for m in self.history) > budget:
            starts = [i for i, m in enumerate(self.history) if m["role"] == "user"]
            if len(starts) < 2:
                break
            self.history = self.history[starts[1]:]
