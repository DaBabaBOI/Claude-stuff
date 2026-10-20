"""File tools: look around, search, and tidy up — only inside the allowed folders.

Nothing here ever deletes a file. Anything that moves or renames asks the user first
and is written to the undo journal.
"""

from __future__ import annotations

import hashlib
import os
import re
import shutil
import subprocess
import sys
import time
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from ..safety import ToolError, apply_moves, is_inside, pretty, same_file, unique_destination
from . import Context, tool

CATEGORIES: dict[str, list[str]] = {
    "Images": ["jpg", "jpeg", "png", "gif", "heic", "heif", "webp", "bmp", "tif", "tiff", "svg", "raw", "cr2", "nef", "arw", "dng", "ico"],
    "Documents": ["pdf", "doc", "docx", "txt", "rtf", "odt", "md", "pages", "tex", "epub", "mobi"],
    "Spreadsheets": ["xls", "xlsx", "xlsm", "csv", "tsv", "ods", "numbers"],
    "Presentations": ["ppt", "pptx", "key", "odp"],
    "Audio": ["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus", "aiff", "wma"],
    "Videos": ["mp4", "mov", "avi", "mkv", "webm", "m4v", "wmv", "flv", "3gp"],
    "Archives": ["zip", "rar", "7z", "tar", "gz", "tgz", "bz2", "xz", "zst"],
    "Installers": ["dmg", "pkg", "exe", "msi", "deb", "rpm", "appimage", "apk", "iso"],
    "Code": ["py", "ipynb", "js", "ts", "jsx", "tsx", "html", "css", "json", "xml", "yaml", "yml", "java", "c", "h", "cpp", "go", "rs", "rb", "php", "sh", "sql", "kt", "swift"],
    "Fonts": ["ttf", "otf", "woff", "woff2"],
    "Design": ["psd", "ai", "sketch", "fig", "xd", "indd", "blend", "stl", "obj"],
}
OTHER = "Other"

# Files that are still downloading or are OS clutter are never moved.
PARTIAL_EXTS = {"crdownload", "part", "partial", "download", "tmp", "opdownload", "!ut"}
JUNK_NAMES = {".ds_store", "desktop.ini", "thumbs.db", "icon\r"}
SKIP_DIRS = {"node_modules", "__pycache__", "$recycle.bin", "system volume information"}
# Never "open" these: opening them would run a program.
RISKY_EXTS = {"exe", "msi", "bat", "cmd", "com", "scr", "ps1", "vbs", "vbe", "js", "jse", "wsf", "hta", "jar",
              "sh", "command", "app", "pkg", "dmg", "appimage", "deb", "rpm", "run", "bin", "lnk", "reg"}

MAX_SCAN = 200_000


# ---------------------------------------------------------------- helpers

def human_size(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024 or unit == "TB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def fmt_date(ts: float) -> str:
    return datetime.fromtimestamp(ts).strftime("%Y-%m-%d")


def ext_of(path: Path) -> str:
    return path.suffix.lower().lstrip(".")


def categories(ctx: Context) -> dict[str, str]:
    """extension -> category name, with the user's config overriding the defaults."""
    out = {}
    for cat, exts in CATEGORIES.items():
        for e in exts:
            out[e] = cat
    for cat, exts in (getattr(ctx.config, "extra_categories", None) or {}).items():
        for e in exts:
            out[e] = cat
    return out


def is_hidden(name: str) -> bool:
    return name.startswith(".") or name.lower() in JUNK_NAMES


def scan(root: Path, recursive: bool, show_hidden: bool = False, scanned: list | None = None):
    """Yield (path, stat) for files under root. Doesn't follow symlinked folders."""
    stack = [root]
    count = 0
    while stack:
        d = stack.pop()
        try:
            with os.scandir(d) as it:
                entries = list(it)
        except OSError:
            continue
        for e in entries:
            if not show_hidden and is_hidden(e.name):
                continue
            try:
                if e.is_dir(follow_symlinks=False):
                    if recursive and e.name.lower() not in SKIP_DIRS and not e.name.endswith(".app"):
                        stack.append(Path(e.path))
                    continue
                if not e.is_file(follow_symlinks=False):
                    continue
                st = e.stat(follow_symlinks=False)
            except OSError:
                continue
            count += 1
            if scanned is not None:
                scanned[0] = count
            if count > MAX_SCAN:
                return
            yield Path(e.path), st


def parse_exts(extension: str | None) -> set[str]:
    if not extension:
        return set()
    return {e.strip().lower().lstrip("*").lstrip(".") for e in re.split(r"[,\s]+", extension) if e.strip()}


def preview(names: list[str], n: int = 4) -> str:
    shown = ", ".join(names[:n])
    return shown + (f", … (+{len(names) - n} more)" if len(names) > n else "")


def run_moves(ctx: Context, title: str, moves: list[tuple[Path, Path]], details: list[str]) -> str:
    """Ask the user, move the files, write the undo journal, and report back."""
    if not moves:
        return "Nothing to move."
    if not ctx.confirm(title, details):
        return "The user said no, so nothing was moved. Don't retry unless they ask."
    done, created, errors = apply_moves(moves)
    ctx.journal.record(title.rstrip("?"), done, created)
    msg = f"Moved {len(done)} item(s)."
    if errors:
        msg += f" {len(errors)} failed: " + "; ".join(errors[:5])
    if done:
        msg += " The user can say 'undo' to put them back."
    return msg


# ---------------------------------------------------------------- looking around

@tool(
    "List what's inside a folder (files and sub-folders, with sizes and dates).",
    path={"type": "string", "description": "Folder path, e.g. ~/Downloads"},
    sort_by={"type": "string", "enum": ["name", "size", "modified"], "description": "Default: name"},
    show_hidden={"type": "boolean", "description": "Include hidden files. Default false"},
)
def list_folder(ctx: Context, path: str, sort_by: str = "name", show_hidden: bool = False) -> str:
    folder = ctx.sandbox.resolve(path)
    if not folder.is_dir():
        raise ToolError(f"{pretty(folder)} is a file, not a folder.")
    dirs, files = [], []
    for e in os.scandir(folder):
        if not show_hidden and is_hidden(e.name):
            continue
        try:
            st = e.stat()
            (dirs if e.is_dir() else files).append((e.name, st.st_size, st.st_mtime))
        except OSError:
            continue
    key = {"name": lambda x: x[0].lower(), "size": lambda x: -x[1], "modified": lambda x: -x[2]}[sort_by]
    dirs.sort(key=key if sort_by == "modified" else (lambda x: x[0].lower()))
    files.sort(key=key)
    total = sum(f[1] for f in files)
    rows = [f"[folder] {n}/  (modified {fmt_date(m)})" for n, _, m in dirs]
    rows += [f"{n}  {human_size(s)}  modified {fmt_date(m)}" for n, s, m in files]
    lines = [f"{pretty(folder)} — {len(dirs)} folder(s), {len(files)} file(s), {human_size(total)} in loose files"]
    lines += rows[:80]
    if len(rows) > 80:
        lines.append(f"… {len(rows) - 80} more not shown (use find_files to search).")
    return "\n".join(lines)


@tool(
    "Summarize a folder: how many files of each kind, total size, biggest and oldest files. "
    "Good first step before tidying a folder.",
    path={"type": "string", "description": "Folder path, e.g. ~/Desktop"},
    include_subfolders={"type": "boolean", "description": "Also count files inside sub-folders. Default false"},
)
def folder_summary(ctx: Context, path: str, include_subfolders: bool = False) -> str:
    folder = ctx.sandbox.resolve(path)
    if not folder.is_dir():
        raise ToolError(f"{pretty(folder)} is not a folder.")
    cats = categories(ctx)
    by_cat: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    files = []
    scanned = [0]
    for p, st in scan(folder, include_subfolders, scanned=scanned):
        c = by_cat[cats.get(ext_of(p), OTHER)]
        c[0] += 1
        c[1] += st.st_size
        files.append((p, st.st_size, st.st_mtime))
    subdirs = sum(1 for e in os.scandir(folder) if e.is_dir() and not is_hidden(e.name))
    if not files:
        return f"{pretty(folder)} has no {'' if include_subfolders else 'loose '}files ({subdirs} sub-folder(s))."
    total = sum(f[1] for f in files)
    scope = "including sub-folders" if include_subfolders else "loose files only, not inside sub-folders"
    lines = [f"{pretty(folder)}: {len(files)} files, {human_size(total)} ({scope}); {subdirs} sub-folder(s)."]
    if scanned[0] > MAX_SCAN:
        lines.append(f"(Stopped counting after {MAX_SCAN:,} files.)")
    lines.append("By kind: " + ", ".join(
        f"{cat} {n} ({human_size(sz)})" for cat, (n, sz) in sorted(by_cat.items(), key=lambda kv: -kv[1][1])))
    lines.append("Largest: " + "; ".join(
        f"{pretty(p) if include_subfolders else p.name} {human_size(s)}" for p, s, _ in sorted(files, key=lambda f: -f[1])[:5]))
    year_ago = time.time() - 365 * 86400
    old = [f for f in files if f[2] < year_ago]
    if old:
        lines.append(f"{len(old)} file(s) ({human_size(sum(f[1] for f in old))}) haven't changed in over a year.")
    newest = max(files, key=lambda f: f[2])
    lines.append(f"Most recent: {newest[0].name} ({fmt_date(newest[2])}).")
    return "\n".join(lines)


@tool(
    "Search for files by name, type, size or age inside a folder and its sub-folders.",
    folder={"type": "string", "description": "Where to search, e.g. ~/Documents, or ~ to search all allowed folders"},
    name_contains={"type": "string", "description": "Part of the file name, case-insensitive"},
    extension={"type": "string", "description": "File type(s), e.g. 'pdf' or 'jpg,png'"},
    min_size_mb={"type": "number", "description": "Only files at least this big (MB)"},
    modified_within_days={"type": "integer", "description": "Only files changed in the last N days"},
    older_than_days={"type": "integer", "description": "Only files NOT changed in the last N days"},
    sort_by={"type": "string", "enum": ["modified", "size", "name"], "description": "Default: modified (newest first)"},
    limit={"type": "integer", "description": "Max results. Default 30"},
)
def find_files(ctx: Context, folder: str, name_contains: str | None = None, extension: str | None = None,
               min_size_mb: float | None = None, modified_within_days: int | None = None,
               older_than_days: int | None = None, sort_by: str = "modified", limit: int = 30) -> str:
    roots = ctx.sandbox.search_roots(folder)
    matches = [m for root in roots
               for m in _matching(root, True, name_contains, extension, min_size_mb, modified_within_days, older_than_days)]
    where = ", ".join(pretty(r) for r in roots)
    if not matches:
        return f"No matching files in {where}."
    key = {"modified": lambda m: -m[2], "size": lambda m: -m[1], "name": lambda m: m[0].name.lower()}[sort_by]
    matches.sort(key=key)
    limit = max(1, min(limit, 200))
    total = sum(m[1] for m in matches)
    lines = [f"{len(matches)} match(es) in {where}, {human_size(total)} total. Showing {min(limit, len(matches))}:"]
    for p, size, mtime in matches[:limit]:
        lines.append(f"{pretty(p)}  {human_size(size)}  modified {fmt_date(mtime)}")
    return "\n".join(lines)


def _matching(root, recursive, name_contains, extension, min_size_mb, modified_within_days, older_than_days):
    exts = parse_exts(extension)
    needle = (name_contains or "").lower()
    now = time.time()
    for p, st in scan(root, recursive):
        if needle and needle not in p.name.lower():
            continue
        if exts and ext_of(p) not in exts:
            continue
        if min_size_mb and st.st_size < min_size_mb * 1024 * 1024:
            continue
        if modified_within_days is not None and st.st_mtime < now - modified_within_days * 86400:
            continue
        if older_than_days is not None and st.st_mtime > now - older_than_days * 86400:
            continue
        yield p, st.st_size, st.st_mtime


@tool(
    "Find files that are exact duplicates (same content) inside a folder and its sub-folders. "
    "Set move_extras=true to move the extra copies into a 'Duplicates (review)' folder; one copy of each stays put.",
    folder={"type": "string", "description": "Where to look, e.g. ~/Downloads"},
    move_extras={"type": "boolean", "description": "Move extra copies aside (asks the user first). Default false"},
)
def find_duplicates(ctx: Context, folder: str, move_extras: bool = False) -> str:
    root = ctx.sandbox.resolve(folder)
    by_size: dict[int, list[Path]] = defaultdict(list)
    for p, st in scan(root, True):
        if st.st_size >= 1024:  # ignore tiny files
            by_size[st.st_size].append(p)

    groups: list[list[Path]] = []
    for size, paths in by_size.items():
        if len(paths) < 2:
            continue
        by_head: dict[str, list[Path]] = defaultdict(list)
        for p in paths:
            by_head[_hash(p, 65536)].append(p)
        for same_head in by_head.values():
            if len(same_head) < 2:
                continue
            by_full: dict[str, list[Path]] = defaultdict(list)
            for p in same_head:
                by_full[_hash(p) if size > 65536 else "same"].append(p)
            groups += [g for g in by_full.values() if len(g) > 1]

    if not groups:
        return f"No duplicate files found in {pretty(root)}."
    groups = [sorted(g, key=_keep_rank) for g in groups]
    groups.sort(key=lambda g: -(g[0].stat().st_size * (len(g) - 1)))
    wasted = sum(g[0].stat().st_size * (len(g) - 1) for g in groups)
    extras = [p for g in groups for p in g[1:]]

    lines = [f"{len(groups)} set(s) of duplicates, {len(extras)} extra copies wasting {human_size(wasted)}:"]
    for g in groups[:15]:
        lines.append(f"- keep {pretty(g[0])} ({human_size(g[0].stat().st_size)}); copies: " + ", ".join(pretty(p) for p in g[1:]))
    if len(groups) > 15:
        lines.append(f"… and {len(groups) - 15} more set(s).")
    if not move_extras:
        lines.append("Nothing was moved. Call again with move_extras=true to move the extra copies aside.")
        return "\n".join(lines)

    review = root / "Duplicates (review)"
    taken: set[str] = set()
    moves = []
    for p in extras:
        if p.parent == review:
            continue
        dst = unique_destination(review / p.name, taken)
        taken.add(os.path.normcase(str(dst)))
        moves.append((p, dst))
    details = [f"{pretty(s)}  →  {pretty(review)}/" for s, _ in moves]
    result = run_moves(ctx, f"Move {len(moves)} duplicate copies into {pretty(review)} (one copy of each file stays)?", moves, details)
    return "\n".join(lines[:1]) + "\n" + result


_COPY_MARK = re.compile(r"(\s\(\d+\)|[\s_-]copy(\s?\d+)?|\s-\s?copy)$", re.IGNORECASE)


def _keep_rank(p: Path):
    """Prefer keeping the copy without '(1)'/'copy' in its name, then the oldest, then the shortest path."""
    try:
        mtime = p.stat().st_mtime
    except OSError:
        mtime = 0
    return (bool(_COPY_MARK.search(p.stem)), mtime, len(str(p)))


def _hash(p: Path, limit: int | None = None) -> str:
    h = hashlib.sha256()
    try:
        with open(p, "rb") as f:
            if limit:
                h.update(f.read(limit))
            else:
                for chunk in iter(lambda: f.read(1 << 20), b""):
                    h.update(chunk)
    except OSError:
        return f"unreadable:{p}"
    return h.hexdigest()


@tool(
    "Free and used disk space on this computer.",
)
def disk_space(ctx: Context) -> str:
    seen = set()
    lines = []
    for root in [Path.home(), *ctx.sandbox.roots]:
        try:
            dev = root.stat().st_dev
        except OSError:
            continue
        if dev in seen:
            continue
        seen.add(dev)
        u = shutil.disk_usage(root)
        lines.append(f"Drive holding {pretty(root)}: {human_size(u.free)} free of {human_size(u.total)} "
                     f"({u.used / u.total:.0%} used)")
    return "\n".join(lines)


# ---------------------------------------------------------------- tidying up (all ask first, all undoable)

@tool(
    "Tidy a messy folder by moving its loose files into sub-folders, either by kind "
    "(Images, Documents, Videos, Installers, …) or by date (2026/2026-10). Sub-folders that already exist are left alone. "
    "Shows the user the plan and asks before moving anything.",
    folder={"type": "string", "description": "Folder to tidy, e.g. ~/Downloads"},
    by={"type": "string", "enum": ["type", "date"], "description": "Group by file type (default) or by month modified"},
)
def organize_folder(ctx: Context, folder: str, by: str = "type") -> str:
    root = ctx.sandbox.resolve(folder)
    if not root.is_dir():
        raise ToolError(f"{pretty(root)} is not a folder.")
    cats = categories(ctx)
    plan: dict[str, list[Path]] = defaultdict(list)
    skipped = 0
    for p, st in scan(root, recursive=False):
        if ext_of(p) in PARTIAL_EXTS:
            skipped += 1
            continue
        if by == "date":
            d = datetime.fromtimestamp(st.st_mtime)
            plan[f"{d:%Y}/{d:%Y-%m}"].append(p)
        else:
            plan[cats.get(ext_of(p), OTHER)].append(p)
    if not plan:
        return f"{pretty(root)} has no loose files to organize."

    moves, details, taken = [], [], set()
    for sub, paths in sorted(plan.items()):
        for p in sorted(paths):
            dst = unique_destination(root / sub / p.name, taken)
            taken.add(os.path.normcase(str(dst)))
            moves.append((p, dst))
        details.append(f"{sub}/  ←  {len(paths)} file(s): {preview([p.name for p in sorted(paths)])}")
    if skipped:
        details.append(f"({skipped} file(s) still downloading are left alone)")
    title = f"Organize {len(moves)} file(s) in {pretty(root)} into {len(plan)} folder(s) by {by}?"
    return run_moves(ctx, title, moves, details)


@tool(
    "Move specific files or folders into a destination folder (created if needed). Asks the user first.",
    paths={"type": "array", "items": {"type": "string"}, "description": "Files/folders to move, e.g. ['~/Desktop/a.pdf']"},
    destination={"type": "string", "description": "Folder to move them into, e.g. ~/Documents/Taxes"},
)
def move_files(ctx: Context, paths: list[str], destination: str) -> str:
    dest = ctx.sandbox.resolve(destination, must_exist=False)
    if dest.exists() and not dest.is_dir():
        raise ToolError(f"{pretty(dest)} is a file, not a folder.")
    moves, problems, taken = [], [], set()
    for raw in paths:
        try:
            src = ctx.sandbox.resolve(raw)
        except ToolError as e:
            problems.append(str(e))
            continue
        if ctx.sandbox.is_root(src):
            problems.append(f"{pretty(src)} is one of your main folders; I won't move it.")
            continue
        if src.parent == dest:
            problems.append(f"{src.name} is already in {pretty(dest)}.")
            continue
        if src.is_dir() and is_inside(dest, src):
            problems.append(f"Can't move {pretty(src)} into itself.")
            continue
        dst = unique_destination(dest / src.name, taken)
        taken.add(os.path.normcase(str(dst)))
        moves.append((src, dst))
    note = ("Skipped: " + " ".join(problems) + "\n") if problems else ""
    if not moves:
        return note + "Nothing to move."
    details = [f"{pretty(s)}" + (f"  (will be named {d.name})" if d.name != s.name else "") for s, d in moves]
    return note + run_moves(ctx, f"Move {len(moves)} item(s) into {pretty(dest)}?", moves, details)


@tool(
    "Move every file in a folder that matches a filter (name, type, age) into a destination folder. "
    "Use this instead of move_files when there are many files, e.g. 'move all screenshots on my Desktop into Screenshots'. "
    "Asks the user first.",
    folder={"type": "string", "description": "Folder to take files from, e.g. ~/Desktop"},
    destination={"type": "string", "description": "Folder to move them into, e.g. ~/Pictures/Screenshots"},
    name_contains={"type": "string", "description": "Part of the file name, case-insensitive"},
    extension={"type": "string", "description": "File type(s), e.g. 'png' or 'jpg,png'"},
    older_than_days={"type": "integer", "description": "Only files not changed in the last N days"},
    include_subfolders={"type": "boolean", "description": "Also take matching files from sub-folders. Default false"},
)
def move_matching_files(ctx: Context, folder: str, destination: str, name_contains: str | None = None,
                        extension: str | None = None, older_than_days: int | None = None,
                        include_subfolders: bool = False) -> str:
    if not (name_contains or extension or older_than_days):
        raise ToolError("Give at least one filter (name_contains, extension or older_than_days).")
    root = ctx.sandbox.resolve(folder)
    dest = ctx.sandbox.resolve(destination, must_exist=False)
    moves, taken = [], set()
    for p, _, _ in _matching(root, include_subfolders, name_contains, extension, None, None, older_than_days):
        if is_inside(p, dest):
            continue
        dst = unique_destination(dest / p.name, taken)
        taken.add(os.path.normcase(str(dst)))
        moves.append((p, dst))
    if not moves:
        return f"No matching files in {pretty(root)}."
    details = [pretty(s) for s, _ in moves]
    return run_moves(ctx, f"Move {len(moves)} matching file(s) from {pretty(root)} into {pretty(dest)}?", moves, details)


@tool(
    "Rename one file or folder (it stays in the same place). Asks the user first.",
    path={"type": "string", "description": "The file to rename, e.g. ~/Downloads/IMG_2041.jpg"},
    new_name={"type": "string", "description": "Just the new name, e.g. passport.jpg"},
)
def rename_file(ctx: Context, path: str, new_name: str) -> str:
    src = ctx.sandbox.resolve(path)
    if ctx.sandbox.is_root(src):
        raise ToolError(f"{pretty(src)} is one of your main folders; I won't rename it.")
    new_name = new_name.strip()
    if not new_name or new_name in (".", "..") or "/" in new_name or "\\" in new_name or "\0" in new_name:
        raise ToolError("new_name must be a plain file name, without any folder part.")
    if src.is_file() and src.suffix and not Path(new_name).suffix:
        new_name += src.suffix  # keep the extension if the model dropped it
    dst = src.with_name(new_name)
    if dst.exists() and not same_file(src, dst):
        raise ToolError(f"Something called {new_name} already exists there.")
    return run_moves(ctx, f"Rename {src.name} → {new_name}?", [(src, dst)], [f"in {pretty(src.parent)}"])


@tool(
    "Create a new folder.",
    path={"type": "string", "description": "Folder to create, e.g. ~/Documents/Receipts/2026"},
)
def create_folder(ctx: Context, path: str) -> str:
    target = ctx.sandbox.resolve(path, must_exist=False)
    if target.exists():
        return f"{pretty(target)} already exists."
    missing, p = [], target
    while not p.exists():
        missing.append(p)
        p = p.parent
    target.mkdir(parents=True)
    ctx.journal.record(f"Create folder {pretty(target)}", [], list(reversed(missing)))
    return f"Created {pretty(target)}."


@tool(
    "Open a file or folder with its normal app (e.g. a PDF in the PDF viewer, a folder in the file manager).",
    path={"type": "string", "description": "What to open, e.g. ~/Documents/resume.pdf"},
)
def open_file(ctx: Context, path: str) -> str:
    target = ctx.sandbox.resolve(path)
    if ext_of(target) in RISKY_EXTS or (target.is_dir() and target.suffix.lower() == ".app"):
        raise ToolError(f"For safety I don't open programs or installers ({target.name}). The user can open it themselves.")
    if sys.platform.startswith("win"):
        os.startfile(str(target))  # type: ignore[attr-defined]
    elif sys.platform == "darwin":
        subprocess.Popen(["open", str(target)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        subprocess.Popen(["xdg-open", str(target)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return f"Opened {pretty(target)}."


@tool(
    "Undo the most recent change made by this assistant (puts moved/renamed files back). Asks the user first.",
)
def undo_last_change(ctx: Context) -> str:
    batch = ctx.journal.last()
    if not batch:
        return "There's nothing to undo."
    n = len(batch["moves"])
    what = f"{n} file move(s)" if n else "a new folder"
    if not ctx.confirm(f"Undo \"{batch['description']}\" from {batch['time']}?", [f"Puts back {what}."]):
        return "The user said no; nothing was undone."
    batch, problems = ctx.journal.undo_last()
    msg = f"Undid: {batch['description']}."
    if problems:
        msg += " Some items couldn't be restored: " + "; ".join(problems[:5])
    return msg
