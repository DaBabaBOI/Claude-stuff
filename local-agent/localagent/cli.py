"""Command-line chat: `localagent` (or `python -m localagent`)."""

from __future__ import annotations

import argparse
import os
import sys
from datetime import timedelta

from . import __version__
from .agent import Agent
from .config import load_config
from .llm import OllamaClient, OllamaError
from .safety import Journal, Sandbox, pretty
from .tools import Context, all_tools
from .tools.calendar import CalendarStore
from .tools.todos import TodoStore

HELP = """Just type what you want, for example:
  • what's on my calendar today?            • am I free tomorrow afternoon?
  • what's taking up space in Downloads?    • tidy up my Downloads folder
  • find duplicate files in Pictures        • move all screenshots on my Desktop into Pictures/Screenshots
  • add "renew passport" to my to-do list   • open my resume

Commands:  /undo  undo the last change    /tools  list tools    /check  test your setup
           /reset start a fresh chat      /help   this help     /quit   exit"""


class Style:
    def __init__(self) -> None:
        on = sys.stdout.isatty() and not os.environ.get("NO_COLOR")
        if on and os.name == "nt":
            os.system("")  # turns on colour support in the Windows console
        self.dim = "\033[2m" if on else ""
        self.bold = "\033[1m" if on else ""
        self.yellow = "\033[33m" if on else ""
        self.green = "\033[32m" if on else ""
        self.red = "\033[31m" if on else ""
        self.cyan = "\033[36m" if on else ""
        self.reset = "\033[0m" if on else ""


S = Style()


def confirm(title: str, details: list[str]) -> bool:
    """Every change to your files goes through here: you see the plan and say yes or no."""
    print(f"\n{S.yellow}{S.bold}⚠  {title}{S.reset}")
    for line in details[:30]:
        print(f"   {line}")
    if len(details) > 30:
        print(f"   … and {len(details) - 30} more")
    if not sys.stdin.isatty():
        print(f"{S.dim}   (not running interactively, so the answer is no){S.reset}")
        return False
    try:
        answer = input(f"{S.bold}   Go ahead? [y/N] {S.reset}").strip().lower()
    except EOFError:
        return False
    return answer in ("y", "yes")


def show_tool(name: str, args: dict) -> None:
    shown = ", ".join(f"{k}={v!r}" for k, v in args.items())
    if len(shown) > 100:
        shown = shown[:100] + "…"
    print(f"{S.dim}  → {name}({shown}){S.reset}")


def build(cfg, confirm_fn=confirm):
    ctx = Context(
        sandbox=Sandbox(cfg.allowed_folders),
        journal=Journal(cfg.data_dir / "undo.jsonl"),
        confirm=confirm_fn,
        config=cfg,
        calendar=CalendarStore(cfg.calendars, cfg.data_dir / "cache", cfg.calendar_refresh_minutes, cfg.timezone),
        todos=TodoStore(cfg.data_dir / "todos.json"),
    )
    if cfg.timezone:
        ctx.now = ctx.calendar.now
    llm = OllamaClient(cfg.ollama_host, cfg.model, cfg.temperature, cfg.context_window, cfg.think)
    return ctx, llm


def check(cfg, ctx, llm) -> bool:
    ok = True

    def line(good: bool | None, text: str) -> None:
        mark = f"{S.green}✓{S.reset}" if good else (f"{S.yellow}!{S.reset}" if good is None else f"{S.red}✗{S.reset}")
        print(f"  {mark} {text}")

    print(f"{S.bold}Checking your setup{S.reset}  (config: {cfg.source or 'none found, using defaults'})")
    try:
        line(True, f"Ollama {llm.version()} is running at {cfg.ollama_host}")
        if llm.has_model():
            line(True, f"Model '{cfg.model}' is downloaded")
        else:
            ok = False
            have = ", ".join(llm.installed_models()) or "none"
            line(False, f"Model '{cfg.model}' isn't downloaded. Run: ollama pull {cfg.model}   (you have: {have})")
    except OllamaError as e:
        ok = False
        line(False, str(e))

    if ctx.sandbox.roots:
        line(True, f"Allowed folders: {ctx.sandbox.describe_roots()}")
    else:
        ok = False
        line(False, "No allowed folders exist. Set [files] allowed_folders in config.toml.")
    missing = [pretty(p) for p in cfg.allowed_folders if not p.is_dir()]
    if missing:
        line(None, f"These folders in your config don't exist and are ignored: {', '.join(missing)}")

    if not cfg.calendars:
        line(None, "No calendar set up (optional). See README → 'Connect Google Calendar'.")
    store = ctx.calendar
    for src in cfg.calendars:
        single = CalendarStore([src], store.cache_dir, 0, cfg.timezone)  # 0 = always fetch fresh
        try:
            today = single.now().date()
            events, notes = single.events(single.at(today), single.at(today + timedelta(days=7)))
            if notes and not events and any("Couldn't" in n for n in notes):
                raise Exception(notes[0])
            line(True, f"Calendar '{src.name}': {len(events)} event(s) in the next 7 days")
        except Exception as e:
            ok = False
            line(False, f"Calendar '{src.name}': {e}")

    try:
        cfg.data_dir.mkdir(parents=True, exist_ok=True)
        line(True, f"Data folder: {pretty(cfg.data_dir)} (undo log, to-dos, calendar cache)")
    except OSError as e:
        ok = False
        line(False, f"Can't create {cfg.data_dir}: {e}")
    print("All good!" if ok else "Fix the ✗ items above, then run --check again.")
    return ok


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="replace")  # never crash on odd characters in file names
        except AttributeError:
            pass

    ap = argparse.ArgumentParser(prog="localagent", description="A private AI assistant that runs on your own computer.")
    ap.add_argument("question", nargs="*", help="ask one question and exit (otherwise starts a chat)")
    ap.add_argument("--config", help="path to config.toml")
    ap.add_argument("--model", help="Ollama model to use, e.g. qwen3:8b (overrides config)")
    ap.add_argument("--check", action="store_true", help="test Ollama, folders and calendars, then exit")
    ap.add_argument("--verbose", "-v", action="store_true", help="also show what each tool returned")
    ap.add_argument("--version", action="version", version=f"localagent {__version__}")
    args = ap.parse_args(argv)

    try:
        cfg = load_config(args.config)
    except Exception as e:
        print(f"{S.red}Couldn't read config: {e}{S.reset}")
        return 2
    if args.model:
        cfg.model = args.model
    ctx, llm = build(cfg)

    if args.check:
        return 0 if check(cfg, ctx, llm) else 1

    on_result = (lambda name, result: print(f"{S.dim}{result}{S.reset}")) if args.verbose else None
    agent = Agent(llm, all_tools(), ctx, on_tool=show_tool, on_result=on_result)

    if args.question:
        try:
            print(agent.ask(" ".join(args.question)))
            return 0
        except OllamaError as e:
            print(f"{S.red}{e}{S.reset}")
            return 1

    try:
        import readline  # noqa: F401  (arrow-key history on macOS/Linux)
    except ImportError:
        pass

    print(f"{S.bold}LocalAgent{S.reset} · model {S.cyan}{cfg.model}{S.reset} · everything stays on this computer")
    print(f"{S.dim}Folders: {ctx.sandbox.describe_roots()}")
    print(f"Calendars: {', '.join(c.name for c in cfg.calendars) or 'none (see README)'}")
    print(f"Type /help for ideas, /quit to leave.{S.reset}")
    while True:
        try:
            text = input(f"\n{S.bold}you ›{S.reset} ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        if not text:
            continue
        cmd = text.lower()
        if cmd in ("/quit", "/exit", "quit", "exit", "/q"):
            return 0
        if cmd == "/help":
            print(HELP)
            continue
        if cmd == "/reset":
            agent.reset()
            print(f"{S.dim}Started a fresh conversation.{S.reset}")
            continue
        if cmd == "/tools":
            for t in agent.tools.values():
                print(f"  {S.bold}{t.name}{S.reset} — {t.description.split('. ')[0]}")
            continue
        if cmd == "/check":
            check(cfg, ctx, llm)
            continue
        if cmd in ("/undo", "undo"):
            print(agent.tools["undo_last_change"].run(ctx, {}))
            continue
        before = len(agent.history)
        try:
            print(f"{S.dim}  thinking…{S.reset}", end="\r", flush=True)
            answer = agent.ask(text)
            print(" " * 14, end="\r")
            print(f"\n{S.cyan}agent ›{S.reset} {answer}")
        except (OllamaError, KeyboardInterrupt) as e:
            agent.history = agent.history[:before]  # forget the half-finished turn
            print(f"\n{S.red}{e}{S.reset}" if isinstance(e, OllamaError) else f"\n{S.dim}(stopped){S.reset}")
