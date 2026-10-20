"""Loads settings from config.toml (or falls back to sensible defaults)."""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

if sys.version_info >= (3, 11):
    import tomllib
else:  # pragma: no cover
    import tomli as tomllib

DATA_DIR = Path.home() / ".localagent"

DEFAULT_FOLDERS = ["~/Desktop", "~/Documents", "~/Downloads", "~/Pictures", "~/Music", "~/Videos", "~/Movies"]


@dataclass
class CalendarSource:
    name: str
    url: str | None = None
    path: Path | None = None


@dataclass
class Config:
    model: str = "qwen3:8b"
    ollama_host: str = "http://localhost:11434"
    temperature: float = 0.2
    context_window: int = 8192
    think: bool | None = False
    allowed_folders: list[Path] = field(default_factory=list)
    extra_categories: dict[str, list[str]] = field(default_factory=dict)
    calendars: list[CalendarSource] = field(default_factory=list)
    calendar_refresh_minutes: int = 15
    workday_start: str = "09:00"
    workday_end: str = "18:00"
    timezone: str | None = None
    data_dir: Path = DATA_DIR
    source: Path | None = None  # the config file that was loaded, if any


def find_config_file(explicit: str | None = None) -> Path | None:
    candidates = []
    if explicit:
        candidates.append(Path(explicit).expanduser())
    if os.environ.get("LOCALAGENT_CONFIG"):
        candidates.append(Path(os.environ["LOCALAGENT_CONFIG"]).expanduser())
    candidates += [Path.cwd() / "config.toml", DATA_DIR / "config.toml"]
    for c in candidates:
        if c.is_file():
            return c
    if explicit:
        raise FileNotFoundError(f"Config file not found: {explicit}")
    return None


def load_config(explicit: str | None = None) -> Config:
    path = find_config_file(explicit)
    raw: dict = {}
    if path:
        with open(path, "rb") as f:
            raw = tomllib.load(f)

    model = raw.get("model", {})
    files = raw.get("files", {})
    cal = raw.get("calendar", {})
    general = raw.get("general", {})

    cfg = Config(source=path)
    cfg.model = model.get("name", cfg.model)
    cfg.ollama_host = model.get("host", cfg.ollama_host).rstrip("/")
    cfg.temperature = float(model.get("temperature", cfg.temperature))
    cfg.context_window = int(model.get("context_window", cfg.context_window))
    cfg.think = model.get("think", cfg.think)

    folders = files.get("allowed_folders", DEFAULT_FOLDERS)
    expanded = [Path(os.path.expandvars(f)).expanduser() for f in folders]
    # Silently skip default folders that don't exist on this OS (e.g. ~/Movies on Windows).
    cfg.allowed_folders = [p for p in expanded if p.is_dir()] if "allowed_folders" not in files else expanded
    cfg.extra_categories = {k: [e.lower().lstrip(".") for e in v] for k, v in files.get("categories", {}).items()}

    for i, src in enumerate(cal.get("sources", []), 1):
        name = src.get("name") or f"Calendar {i}"
        url = src.get("url")
        p = src.get("path")
        if url and url.startswith("webcal://"):
            url = "https://" + url[len("webcal://"):]
        if url and "PASTE" in url.upper():
            continue  # untouched placeholder from config.example.toml
        if url or p:
            cfg.calendars.append(CalendarSource(name=name, url=url, path=Path(p).expanduser() if p else None))
    cfg.calendar_refresh_minutes = int(cal.get("refresh_minutes", cfg.calendar_refresh_minutes))
    cfg.workday_start = cal.get("workday_start", cfg.workday_start)
    cfg.workday_end = cal.get("workday_end", cfg.workday_end)
    cfg.timezone = cal.get("timezone") or general.get("timezone")

    if general.get("data_dir"):
        cfg.data_dir = Path(general["data_dir"]).expanduser()
    return cfg
