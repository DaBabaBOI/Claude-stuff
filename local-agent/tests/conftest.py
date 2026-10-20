from pathlib import Path

import pytest

from localagent.config import Config
from localagent.safety import Journal, Sandbox
from localagent.tools import Context
from localagent.tools.todos import TodoStore


class Confirmer:
    """Stands in for the user at the y/N prompt."""

    def __init__(self, answer=True):
        self.answer = answer
        self.asked = []

    def __call__(self, title, details):
        self.asked.append((title, details))
        return self.answer


@pytest.fixture
def home(tmp_path, monkeypatch):
    h = tmp_path / "home"
    for d in ("Desktop", "Documents", "Downloads", "Pictures"):
        (h / d).mkdir(parents=True)
    (h / "secret").mkdir()
    (h / "secret" / "passwords.txt").write_text("nope")
    monkeypatch.setenv("HOME", str(h))
    monkeypatch.setenv("USERPROFILE", str(h))
    return h


@pytest.fixture
def ctx(home):
    cfg = Config(allowed_folders=[home / d for d in ("Desktop", "Documents", "Downloads", "Pictures")],
                 data_dir=home / ".localagent")
    return Context(
        sandbox=Sandbox(cfg.allowed_folders),
        journal=Journal(cfg.data_dir / "undo.jsonl"),
        confirm=Confirmer(True),
        config=cfg,
        todos=TodoStore(cfg.data_dir / "todos.json"),
    )


def touch(path: Path, content: bytes | str = b"x", mtime: float | None = None) -> Path:
    import os

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content if isinstance(content, bytes) else content.encode())
    if mtime is not None:
        os.utime(path, (mtime, mtime))
    return path
