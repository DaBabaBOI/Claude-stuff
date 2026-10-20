"""A simple to-do list kept in ~/.localagent/todos.json."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from ..safety import ToolError
from . import Context, tool


class TodoStore:
    def __init__(self, path: Path):
        self.path = path

    def load(self) -> list[dict]:
        if not self.path.exists():
            return []
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return []

    def save(self, items: list[dict]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(items, indent=2), encoding="utf-8")
        tmp.replace(self.path)


def _fmt(item: dict) -> str:
    due = f" (due {item['due']})" if item.get("due") else ""
    return f"#{item['id']} {item['text']}{due}"


@tool(
    "The user's personal to-do list. action='add' adds an item (text, optional due), 'list' shows open items, "
    "'done' ticks an item off by its number, 'remove' deletes an item by its number.",
    action={"type": "string", "enum": ["add", "list", "done", "remove"], "description": "What to do"},
    text={"type": "string", "description": "The to-do text (for add)"},
    item_id={"type": "integer", "description": "The item number (for done / remove)"},
    due={"type": "string", "description": "Optional due date for add, preferably YYYY-MM-DD"},
)
def todo(ctx: Context, action: str, text: str | None = None, item_id: int | None = None, due: str | None = None) -> str:
    store: TodoStore = ctx.todos
    items = store.load()

    if action == "add":
        if not text:
            raise ToolError("Say what the to-do is (text).")
        item = {"id": max((i["id"] for i in items), default=0) + 1, "text": text.strip(), "due": due,
                "done": False, "created": datetime.now().strftime("%Y-%m-%d %H:%M")}
        items.append(item)
        store.save(items)
        return f"Added {_fmt(item)}."

    if action in ("done", "remove"):
        if item_id is None:
            raise ToolError("Which item? Give its number (item_id). Use action='list' to see the numbers.")
        match = next((i for i in items if i["id"] == item_id), None)
        if not match:
            raise ToolError(f"There's no to-do #{item_id}.")
        if action == "done":
            match["done"] = True
            match["completed"] = datetime.now().strftime("%Y-%m-%d %H:%M")
        else:
            items.remove(match)
        store.save(items)
        return f"{'Ticked off' if action == 'done' else 'Removed'} {_fmt(match)}."

    open_items = sorted((i for i in items if not i["done"]), key=lambda i: (i.get("due") or "9999", i["id"]))
    done_count = sum(1 for i in items if i["done"])
    if not open_items:
        return "The to-do list is empty." + (f" ({done_count} done)" if done_count else "")
    return "\n".join([f"{len(open_items)} open to-do(s):"] + [_fmt(i) for i in open_items]
                     + ([f"({done_count} already done)"] if done_count else []))
