"""Calendar tools: read your Google Calendar (or any .ics calendar) with no API key.

Google gives every calendar a private "Secret address in iCal format". Fetching that
link returns the whole calendar as a standard .ics file, no login or key needed.
We download it, keep a cached copy in ~/.localagent/cache, and expand recurring
events locally. This is read-only: changing events would need Google OAuth.
"""

from __future__ import annotations

import hashlib
import re
import time as _time
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from ..safety import ToolError
from . import Context, tool

WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
NOT_SET_UP = (
    "No calendar is set up yet. To connect Google Calendar: open Google Calendar on the web → Settings → "
    "click the calendar under 'Settings for my calendars' → 'Integrate calendar' → copy 'Secret address in iCal format', "
    "then paste it into config.toml under [[calendar.sources]] and restart."
)


@dataclass
class Event:
    title: str
    start: datetime
    end: datetime
    all_day: bool
    calendar: str
    location: str = ""
    notes: str = ""
    busy: bool = True


def _http_get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "LocalAgent/0.1 (calendar reader)"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()


class CalendarStore:
    def __init__(self, sources, cache_dir: Path, refresh_minutes: int = 15, tz_name: str | None = None, fetch=None):
        self.sources = sources
        self.cache_dir = cache_dir
        self.refresh = refresh_minutes * 60
        self.tz = ZoneInfo(tz_name) if tz_name else None
        self._fetch = fetch or _http_get
        self._parsed: dict[str, tuple[str, object]] = {}

    # -- time helpers: everything is shown in the user's local time

    def local(self, dt: datetime) -> datetime:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=self.tz) if self.tz else dt.astimezone()
        return dt.astimezone(self.tz) if self.tz else dt.astimezone()

    def at(self, d: date, t: time = time.min) -> datetime:
        naive = datetime.combine(d, t)
        return naive.replace(tzinfo=self.tz) if self.tz else naive.astimezone()

    def now(self) -> datetime:
        return self.local(datetime.now().astimezone())

    # -- loading

    def _raw(self, src) -> tuple[bytes, str | None]:
        if src.path:
            if not src.path.is_file():
                raise ToolError(f"Calendar file for '{src.name}' not found: {src.path}")
            return src.path.read_bytes(), None
        cache = self.cache_dir / f"{hashlib.sha1(src.url.encode()).hexdigest()[:16]}.ics"
        if cache.exists() and _time.time() - cache.stat().st_mtime < self.refresh:
            return cache.read_bytes(), None
        try:
            data = self._fetch(src.url)
            if b"BEGIN:VCALENDAR" not in data[:4096]:
                raise ValueError("the link didn't return a calendar — double-check you copied the iCal address")
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            cache.write_bytes(data)
            return data, None
        except Exception as e:  # network down, bad link, …
            reason = getattr(e, "reason", None) or e
            if cache.exists():
                when = datetime.fromtimestamp(cache.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
                return cache.read_bytes(), f"(Couldn't refresh '{src.name}' ({reason}); showing the copy saved {when}.)"
            raise ToolError(f"Couldn't load calendar '{src.name}': {reason}")

    def _calendar(self, src):
        import icalendar

        data, note = self._raw(src)
        digest = hashlib.sha1(data).hexdigest()
        cached = self._parsed.get(src.name)
        if cached and cached[0] == digest:
            return cached[1], note
        cal = icalendar.Calendar.from_ical(data)
        self._parsed[src.name] = (digest, cal)
        return cal, note

    def events(self, start: datetime, end: datetime) -> tuple[list[Event], list[str]]:
        import recurring_ical_events

        if not self.sources:
            raise ToolError(NOT_SET_UP)
        out, notes = [], []
        for src in self.sources:
            try:
                cal, note = self._calendar(src)
            except ToolError as e:
                notes.append(str(e))
                continue
            if note:
                notes.append(note)
            for comp in recurring_ical_events.of(cal).between(start, end):
                ev = self._to_event(comp, src.name)
                if ev and ev.end > start and ev.start < end:
                    out.append(ev)
        if not out and notes and len(notes) == len(self.sources) and all("Couldn't load" in n for n in notes):
            raise ToolError(" ".join(notes))
        out.sort(key=lambda e: (e.start, not e.all_day, e.title.lower()))
        return out, notes

    def _to_event(self, comp, cal_name: str) -> Event | None:
        if str(comp.get("STATUS", "")).upper() == "CANCELLED" or "DTSTART" not in comp:
            return None
        s = comp.decoded("DTSTART")
        if "DTEND" in comp:
            e = comp.decoded("DTEND")
        elif "DURATION" in comp:
            e = s + comp.decoded("DURATION")
        else:
            e = s if isinstance(s, datetime) else s + timedelta(days=1)
        if isinstance(s, datetime):
            start, end, all_day = self.local(s), self.local(e if isinstance(e, datetime) else datetime.combine(e, time.min)), False
        else:
            start, end, all_day = self.at(s), self.at(e if not isinstance(e, datetime) else e.date()), True
        notes = re.sub(r"<[^>]+>", " ", str(comp.get("DESCRIPTION", "")))
        return Event(
            title=str(comp.get("SUMMARY", "")).strip() or "(no title)",
            start=start, end=max(end, start), all_day=all_day, calendar=cal_name,
            location=str(comp.get("LOCATION", "")).strip(),
            notes=re.sub(r"\s+", " ", notes).strip(),
            busy=str(comp.get("TRANSP", "OPAQUE")).upper() != "TRANSPARENT",
        )


# ---------------------------------------------------------------- formatting & parsing

def parse_day(text: str | None, today: date) -> date:
    t = (text or "today").strip().lower()
    if t in ("today", "now", "tonight"):
        return today
    if t == "tomorrow":
        return today + timedelta(days=1)
    if t == "yesterday":
        return today - timedelta(days=1)
    m = re.fullmatch(r"(next |this |coming )?(\w+)", t)
    if m and m.group(2) in WEEKDAYS:
        ahead = (WEEKDAYS.index(m.group(2)) - today.weekday()) % 7
        if ahead == 0 and m.group(1) == "next ":
            ahead = 7
        return today + timedelta(days=ahead)
    try:
        return date.fromisoformat(t[:10])
    except ValueError:
        pass
    t = t.replace(",", "")
    if not re.search(r"\d{4}", t):
        t += f" {today.year}"  # "14 feb" -> "14 feb 2030"
    for fmt in ("%d %b %Y", "%b %d %Y", "%d %B %Y", "%B %d %Y"):
        try:
            return datetime.strptime(t, fmt).date()
        except ValueError:
            continue
    raise ToolError(f"I couldn't understand the date '{text}'. Use YYYY-MM-DD, 'today', 'tomorrow' or a weekday.")


def parse_clock(text: str) -> time:
    t = text.strip().lower().replace(".", ":")
    for fmt in ("%H:%M", "%H", "%I%p", "%I:%M%p", "%I %p", "%I:%M %p"):
        try:
            return datetime.strptime(t, fmt).time()
        except ValueError:
            continue
    raise ToolError(f"I couldn't understand the time '{text}'. Use HH:MM, e.g. 09:00.")


def _fmt_time(dt: datetime) -> str:
    return dt.strftime("%H:%M")


def format_event(ev: Event, many_calendars: bool, with_notes: bool = False) -> str:
    if ev.all_day:
        last_day = (ev.end - timedelta(seconds=1)).date()
        when = "all day" if last_day <= ev.start.date() else f"all day, until {last_day:%a %d %b}"
    elif ev.end.date() != ev.start.date():
        when = f"{_fmt_time(ev.start)} → {ev.end:%a %d %b} {_fmt_time(ev.end)}"
    else:
        when = f"{_fmt_time(ev.start)}–{_fmt_time(ev.end)}"
    line = f"{when}  {ev.title}"
    if ev.location:
        line += f" @ {ev.location}"
    if many_calendars:
        line += f"  [{ev.calendar}]"
    if with_notes and ev.notes:
        line += f"  — {ev.notes[:120]}{'…' if len(ev.notes) > 120 else ''}"
    return line


def _store(ctx: Context) -> CalendarStore:
    if ctx.calendar is None or not ctx.calendar.sources:
        raise ToolError(NOT_SET_UP)
    return ctx.calendar


# ---------------------------------------------------------------- tools

@tool(
    "Show the user's calendar events for a day or a range of days.",
    start_date={"type": "string", "description": "'today', 'tomorrow', a weekday like 'friday', or YYYY-MM-DD. Default today"},
    days={"type": "integer", "description": "How many days to show starting from start_date (1 = just that day, 7 = a week). Default 1"},
)
def calendar_events(ctx: Context, start_date: str = "today", days: int = 1) -> str:
    store = _store(ctx)
    first = parse_day(start_date, store.now().date())
    days = max(1, min(days, 62))
    start, end = store.at(first), store.at(first + timedelta(days=days))
    events, notes = store.events(start, end)
    many = len(store.sources) > 1
    label = f"{first:%A %d %B %Y}" if days == 1 else f"{first:%a %d %b} to {first + timedelta(days=days - 1):%a %d %b %Y}"
    lines = [f"Calendar for {label}:"]
    if not events:
        lines.append("Nothing scheduled.")
    for i in range(days):
        day = first + timedelta(days=i)
        # Events that began before the range (e.g. a multi-day trip) are listed on its first day.
        todays = [e for e in events if max(e.start, start).date() == day]
        if todays and days > 1:
            lines.append(f"{day:%a %d %b}:")
        for e in todays:
            lines.append(("  " if days > 1 else "") + format_event(e, many))
    return "\n".join(lines + notes)


@tool(
    "Search the user's calendar for events whose title, place or notes contain some text, e.g. 'dentist' or 'flight'.",
    text={"type": "string", "description": "What to look for"},
    days_ahead={"type": "integer", "description": "How far ahead to search. Default 90"},
    days_back={"type": "integer", "description": "How far back to search. Default 0"},
)
def calendar_search(ctx: Context, text: str, days_ahead: int = 90, days_back: int = 0) -> str:
    store = _store(ctx)
    today = store.now().date()
    start, end = store.at(today - timedelta(days=max(0, days_back))), store.at(today + timedelta(days=max(1, min(days_ahead, 730))))
    events, notes = store.events(start, end)
    needle = text.lower().strip()
    hits = [e for e in events if needle in e.title.lower() or needle in e.location.lower() or needle in e.notes.lower()]
    if not hits:
        return f"No events matching '{text}' between {start:%d %b %Y} and {end:%d %b %Y}." + "".join("\n" + n for n in notes)
    many = len(store.sources) > 1
    lines = [f"{len(hits)} event(s) matching '{text}':"]
    lines += [f"{e.start:%a %d %b %Y}  " + format_event(e, many, with_notes=True) for e in hits[:40]]
    return "\n".join(lines + notes)


@tool(
    "Find free gaps in the user's calendar on a given day (within working hours unless other times are given).",
    date={"type": "string", "description": "'today', 'tomorrow', a weekday, or YYYY-MM-DD. Default today"},
    min_minutes={"type": "integer", "description": "Shortest gap worth listing, in minutes. Default 30"},
    from_time={"type": "string", "description": "Start of the window, HH:MM (default: workday start from config)"},
    to_time={"type": "string", "description": "End of the window, HH:MM (default: workday end from config)"},
)
def calendar_free_time(ctx: Context, date: str = "today", min_minutes: int = 30,
                       from_time: str | None = None, to_time: str | None = None) -> str:
    store = _store(ctx)
    now = store.now()
    day = parse_day(date, now.date())
    ws = store.at(day, parse_clock(from_time or ctx.config.workday_start))
    we = store.at(day, parse_clock(to_time or ctx.config.workday_end))
    if we <= ws:
        raise ToolError("The end time must be after the start time.")
    if day == now.date() and now > ws:
        # Round up to the next 5 minutes so we don't offer time that's already gone.
        ws = now.replace(second=0, microsecond=0) + timedelta(minutes=-now.minute % 5)
        if ws >= we:
            return f"The {from_time or ctx.config.workday_start}–{to_time or ctx.config.workday_end} window today is already over."
    events, notes = store.events(ws, we)
    busy = sorted((max(e.start, ws), min(e.end, we)) for e in events if e.busy and not e.all_day)
    free, cursor = [], ws
    for s, e in busy:
        if s > cursor:
            free.append((cursor, s))
        cursor = max(cursor, e)
    if cursor < we:
        free.append((cursor, we))
    free = [(s, e) for s, e in free if (e - s) >= timedelta(minutes=min_minutes)]
    head = f"Free time on {day:%A %d %B} between {_fmt_time(ws)} and {_fmt_time(we)} (gaps of {min_minutes}+ min):"
    if not free:
        return head + "\nNone — the day is fully booked." + "".join("\n" + n for n in notes)
    lines = [head] + [f"{_fmt_time(s)}–{_fmt_time(e)}  ({_dur(e - s)})" for s, e in free]
    return "\n".join(lines + notes)


def _dur(td: timedelta) -> str:
    mins = int(td.total_seconds() // 60)
    h, m = divmod(mins, 60)
    return f"{h}h {m}m" if h and m else (f"{h}h" if h else f"{m}m")
