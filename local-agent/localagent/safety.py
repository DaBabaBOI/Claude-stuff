"""Guard rails: which folders the agent may touch, and an undo log for every change."""

from __future__ import annotations

import json
import os
import shutil
import time
import uuid
from pathlib import Path


class ToolError(Exception):
    """An error message meant to be shown to the model (and user) as-is."""


def _key(p: Path) -> str:
    return os.path.normcase(str(p))


def is_inside(path: Path, root: Path) -> bool:
    p, r = _key(path), _key(root)
    return p == r or p.startswith(r.rstrip(os.sep) + os.sep)


class Sandbox:
    """Every path the model mentions is resolved here and must land inside an allowed folder.

    Paths are fully resolved (symlinks included) before the check, so a link that
    points outside the allowed folders can't be used to escape them.
    """

    def __init__(self, roots: list[Path]):
        self.roots = []
        for r in roots:
            r = r.expanduser()
            if r.is_dir():
                self.roots.append(r.resolve())

    def allows(self, path: Path) -> bool:
        return any(is_inside(path, r) for r in self.roots)

    def is_root(self, path: Path) -> bool:
        return any(_key(path) == _key(r) for r in self.roots)

    def resolve(self, raw: str, must_exist: bool = True) -> Path:
        s = str(raw).strip().strip('"').strip("'")
        if not s:
            raise ToolError("No path was given.")
        if not self.roots:
            raise ToolError("No folders are allowed. Add some under [files] allowed_folders in config.toml.")
        p = Path(os.path.expandvars(s)).expanduser()
        if p.is_absolute():
            candidates = [p]
        else:
            # "Downloads/foo", "foo" -> try home first, then each allowed folder and its parent.
            candidates = [Path.home() / p] + [r / p for r in self.roots] + [r.parent / p for r in self.roots]
        resolved = [c.resolve() for c in candidates]
        inside = [c for c in resolved if self.allows(c)]
        for c in inside:
            if c.exists():
                return c
        if must_exist or not inside:
            if not inside:
                raise ToolError(f"'{raw}' is outside the folders I'm allowed to use ({self.describe_roots()}).")
            raise ToolError(f"'{raw}' doesn't exist.")
        return inside[0]

    def search_roots(self, raw: str) -> list[Path]:
        """For read-only searches: '~' (or any folder that contains allowed folders) means all allowed folders in it."""
        try:
            return [self.resolve(raw)]
        except ToolError:
            p = Path(os.path.expandvars(str(raw).strip().strip("\"'") or "~")).expanduser()
            p = (p if p.is_absolute() else Path.home() / p).resolve()
            inner = [r for r in self.roots if is_inside(r, p)]
            if not inner:
                raise
            return inner

    def describe_roots(self) -> str:
        return ", ".join(pretty(r) for r in self.roots) or "none"


def pretty(path: Path) -> str:
    """Show paths under the home folder as ~/..."""
    try:
        return "~/" + path.relative_to(Path.home()).as_posix() if path != Path.home() else "~"
    except ValueError:
        return str(path)


def same_file(a: Path, b: Path) -> bool:
    """True when two paths are the same file (e.g. 'a.txt' vs 'A.txt' on a case-insensitive disk)."""
    try:
        return os.path.samefile(a, b)
    except OSError:
        return False


def unique_destination(dest: Path, taken: set[str] | None = None) -> Path:
    """Return dest, or 'name (1).ext', 'name (2).ext' ... if it already exists."""
    taken = taken or set()
    if not dest.exists() and _key(dest) not in taken:
        return dest
    stem, suffix = dest.stem, dest.suffix
    n = 1
    while True:
        cand = dest.with_name(f"{stem} ({n}){suffix}")
        if not cand.exists() and _key(cand) not in taken:
            return cand
        n += 1


class Journal:
    """Append-only log of file moves so any batch can be undone.

    Each line in undo.jsonl is one batch: {"id", "time", "description", "moves": [[src, dst]], "created_dirs": [...]}.
    """

    def __init__(self, path: Path):
        self.path = path

    def _read(self) -> list[dict]:
        if not self.path.exists():
            return []
        out = []
        for line in self.path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                try:
                    out.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        return out

    def _write(self, batches: list[dict]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text("".join(json.dumps(b) + "\n" for b in batches), encoding="utf-8")
        tmp.replace(self.path)

    def record(self, description: str, moves: list[tuple[Path, Path]], created_dirs: list[Path] = ()) -> None:
        if not moves and not created_dirs:
            return
        batches = self._read()
        batches.append({
            "id": uuid.uuid4().hex[:8],
            "time": time.strftime("%Y-%m-%d %H:%M"),
            "description": description,
            "moves": [[str(s), str(d)] for s, d in moves],
            "created_dirs": [str(d) for d in created_dirs],
        })
        self._write(batches[-200:])

    def last(self) -> dict | None:
        batches = self._read()
        return batches[-1] if batches else None

    def undo_last(self) -> tuple[dict, list[str]]:
        batches = self._read()
        if not batches:
            raise ToolError("There's nothing to undo.")
        batch = batches.pop()
        problems = []
        for src, dst in reversed(batch["moves"]):
            src, dst = Path(src), Path(dst)
            if not dst.exists():
                problems.append(f"{pretty(dst)} is gone, can't move it back")
                continue
            if src.exists():
                problems.append(f"{pretty(src)} already exists, left {pretty(dst)} where it is")
                continue
            src.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(dst), str(src))
        for d in sorted(batch["created_dirs"], key=len, reverse=True):
            try:
                Path(d).rmdir()  # only succeeds if empty
            except OSError:
                pass
        self._write(batches)
        return batch, problems


def apply_moves(moves: list[tuple[Path, Path]]) -> tuple[list[tuple[Path, Path]], list[Path], list[str]]:
    """Move files, creating folders as needed. Returns (done, created_dirs, errors)."""
    done, created, errors = [], [], []
    for src, dst in moves:
        try:
            parent = dst.parent
            missing = []
            while not parent.exists():
                missing.append(parent)
                parent = parent.parent
            dst.parent.mkdir(parents=True, exist_ok=True)
            created += reversed(missing)
            if dst.exists() and not same_file(src, dst):  # appeared since planning
                dst = unique_destination(dst)
            shutil.move(str(src), str(dst))
            done.append((src, dst))
        except OSError as e:
            errors.append(f"{src.name}: {e.strerror or e}")
    return done, created, errors
