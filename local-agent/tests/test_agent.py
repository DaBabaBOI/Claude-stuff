"""The agent loop, end to end, against a fake Ollama server speaking the real HTTP API."""

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from conftest import touch
from localagent.agent import Agent
from localagent.llm import OllamaClient, OllamaError
from localagent.tools import all_tools


class FakeLLM:
    def __init__(self, replies):
        self.replies = list(replies)
        self.seen = []

    def chat(self, messages, tools):
        self.seen.append(messages)
        return self.replies.pop(0)


def call(name, **args):
    return {"role": "assistant", "content": "", "tool_calls": [{"function": {"name": name, "arguments": args}}]}


def text(t):
    return {"role": "assistant", "content": t, "tool_calls": []}


def test_tool_call_then_answer(ctx, home):
    touch(home / "Downloads" / "holiday.jpg")
    llm = FakeLLM([call("list_folder", path="~/Downloads"), text("You have one photo.")])
    agent = Agent(llm, all_tools(), ctx)
    assert agent.ask("what's in downloads?") == "You have one photo."
    tool_msg = llm.seen[1][-1]
    assert tool_msg["role"] == "tool" and tool_msg["tool_name"] == "list_folder"
    assert "holiday.jpg" in tool_msg["content"]
    assert "Folders you may use: ~/Desktop" in llm.seen[0][0]["content"]


def test_json_text_tool_call_fallback(ctx, home):
    touch(home / "Desktop" / "a.txt")
    llm = FakeLLM([
        text('```json\n{"name": "list_folder", "arguments": {"path": "~/Desktop"}}\n```'),
        text("Done."),
    ])
    agent = Agent(llm, all_tools(), ctx)
    assert agent.ask("desktop?") == "Done."
    assert "a.txt" in llm.seen[1][-1]["content"]


def test_unknown_tool_and_string_arguments(ctx):
    llm = FakeLLM([
        {"role": "assistant", "content": "", "tool_calls": [
            {"function": {"name": "delete_everything", "arguments": {}}},
            {"function": {"name": "todo", "arguments": '{"action": "add", "text": "buy milk"}'}},
        ]},
        text("ok"),
    ])
    agent = Agent(llm, all_tools(), ctx)
    agent.ask("x")
    results = [m["content"] for m in llm.seen[1] if m["role"] == "tool"]
    assert "no tool called 'delete_everything'" in results[0]
    assert "Added #1 buy milk" in results[1]


def test_gives_up_after_too_many_steps(ctx):
    llm = FakeLLM([call("disk_space")] * 20)
    assert "went round in circles" in Agent(llm, all_tools(), ctx).ask("loop forever")


def test_history_is_trimmed(ctx):
    ctx.config.context_window = 4096
    llm = FakeLLM([text("y" * 3000) for _ in range(10)])
    agent = Agent(llm, all_tools(), ctx)
    for i in range(10):
        agent.ask(f"question {i}")
    assert agent.history[0] == {"role": "user", "content": "question 9"}


# ---------------------------------------------------------------- real HTTP client vs a fake Ollama

class FakeOllama(BaseHTTPRequestHandler):
    requests = []
    reject_think = False

    def log_message(self, *a):
        pass

    def _send(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/version":
            self._send(200, {"version": "0.12.0"})
        elif self.path == "/api/tags":
            self._send(200, {"models": [{"name": "qwen3:8b"}]})

    def do_POST(self):
        req = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        FakeOllama.requests.append(req)
        if req["model"] != "qwen3:8b":
            return self._send(404, {"error": f"model '{req['model']}' not found"})
        if FakeOllama.reject_think and "think" in req:
            return self._send(400, {"error": f"\"{req['model']}\" does not support thinking"})
        if req["messages"][-1]["role"] == "user":
            msg = {"role": "assistant", "content": "", "tool_calls": [
                {"function": {"name": "todo", "arguments": {"action": "list"}}}]}
        else:
            msg = {"role": "assistant", "content": "<think>hmm</think>Your list is empty."}
        self._send(200, {"model": req["model"], "message": msg, "done": True})


@pytest.fixture
def server():
    FakeOllama.requests = []
    FakeOllama.reject_think = False
    srv = HTTPServer(("127.0.0.1", 0), FakeOllama)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_port}"
    srv.shutdown()


def test_ollama_round_trip(ctx, server):
    llm = OllamaClient(server, "qwen3:8b")
    assert llm.version() == "0.12.0" and llm.has_model()
    agent = Agent(llm, all_tools(), ctx)
    assert agent.ask("what's on my to-do list?") == "Your list is empty."
    first = FakeOllama.requests[0]
    assert first["stream"] is False and first["think"] is False
    assert any(t["function"]["name"] == "calendar_events" for t in first["tools"])
    assert FakeOllama.requests[1]["messages"][-1] == {"role": "tool", "tool_name": "todo",
                                                      "content": "The to-do list is empty."}


def test_ollama_think_rejected_is_retried(ctx, server):
    FakeOllama.reject_think = True
    llm = OllamaClient(server, "qwen3:8b")
    assert Agent(llm, all_tools(), ctx).ask("hi") == "Your list is empty."
    assert llm.think is None


def test_ollama_errors_are_friendly(server):
    with pytest.raises(OllamaError, match="ollama pull mistral"):
        OllamaClient(server, "mistral").chat([{"role": "user", "content": "hi"}])
    with pytest.raises(OllamaError, match="Is it running"):
        OllamaClient("http://127.0.0.1:9", "qwen3:8b").version()
