"""Tool registry: each tool is a plain Python function plus a JSON schema the model sees."""

from __future__ import annotations

import inspect
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable

from ..safety import Journal, Sandbox, ToolError

MAX_RESULT_CHARS = 4000


@dataclass
class Context:
    """Everything a tool needs, passed in so tools stay easy to test."""

    sandbox: Sandbox
    journal: Journal
    confirm: Callable[[str, list[str]], bool]
    config: Any
    calendar: Any = None  # CalendarStore
    todos: Any = None  # TodoStore
    now: Callable[[], datetime] = field(default=lambda: datetime.now().astimezone())


@dataclass
class Tool:
    name: str
    description: str
    params: dict[str, dict]
    required: list[str]
    func: Callable[..., str]

    def schema(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {"type": "object", "properties": self.params, "required": self.required},
            },
        }

    def run(self, ctx: Context, args: dict | None) -> str:
        args = dict(args or {})
        clean = {}
        for key, spec in self.params.items():
            if key in args and args[key] is not None and args[key] != "":
                try:
                    clean[key] = _coerce(args[key], spec)
                except (ValueError, TypeError) as e:
                    return f"Error: bad value for {key} — {e}"
        missing = [r for r in self.required if r not in clean]
        if missing:
            return f"Error: missing required argument(s): {', '.join(missing)}"
        try:
            out = self.func(ctx, **clean)
        except ToolError as e:
            return f"Error: {e}"
        except (ValueError, TypeError) as e:
            return f"Error: bad argument — {e}"
        except OSError as e:
            return f"Error: {e.strerror or e}"
        out = str(out)
        if len(out) > MAX_RESULT_CHARS:
            out = out[:MAX_RESULT_CHARS] + "\n… (output truncated)"
        return out


def _coerce(value: Any, spec: dict) -> Any:
    """Small models often send "5" for 5 or "true" for True; be forgiving."""
    t = spec.get("type")
    if t == "integer":
        return int(float(value))
    if t == "number":
        return float(value)
    if t == "boolean":
        if isinstance(value, str):
            return value.strip().lower() in ("true", "yes", "1", "y")
        return bool(value)
    if t == "array":
        if isinstance(value, str):
            return [v.strip() for v in value.split("\n") if v.strip()] if "\n" in value else [value]
        return list(value)
    if t == "string":
        if "enum" in spec:
            v = str(value).strip().lower()
            if v not in spec["enum"]:
                raise ValueError(f"must be one of {', '.join(spec['enum'])}, not '{value}'")
            return v
        return str(value)
    return value


REGISTRY: dict[str, Tool] = {}


def tool(description: str, **params: dict) -> Callable:
    """Register a function as a tool. Parameters without a default in the function are required."""

    def wrap(func: Callable) -> Callable:
        sig = inspect.signature(func)
        required = [
            n for n, p in sig.parameters.items() if n != "ctx" and p.default is inspect.Parameter.empty
        ]
        REGISTRY[func.__name__] = Tool(func.__name__, description.strip(), params, required, func)
        return func

    return wrap


def all_tools() -> list[Tool]:
    # Import side effect: each module registers its tools.
    from . import calendar, files, todos  # noqa: F401

    return list(REGISTRY.values())
