from datetime import date

import pytest

from localagent.config import CalendarSource, load_config
from localagent.tools import REGISTRY, all_tools
from localagent.tools.calendar import CalendarStore, parse_day

all_tools()

# 2030-01-07 is a Monday. Times are India Standard Time (UTC+05:30).
ICS = b"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Google Inc//Google Calendar 70.9054//EN
X-WR-CALNAME:Personal
X-WR-TIMEZONE:Asia/Kolkata
BEGIN:VEVENT
UID:standup@x
DTSTART;TZID=Asia/Kolkata:20300107T093000
DTEND;TZID=Asia/Kolkata:20300107T100000
RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
EXDATE;TZID=Asia/Kolkata:20300109T093000
SUMMARY:Standup
LOCATION:Zoom
END:VEVENT
BEGIN:VEVENT
UID:holiday@x
DTSTART;VALUE=DATE:20300108
DTEND;VALUE=DATE:20300109
SUMMARY:Bank holiday
END:VEVENT
BEGIN:VEVENT
UID:dentist@x
DTSTART:20300107T083000Z
DTEND:20300107T100000Z
SUMMARY:Dentist
LOCATION:12 Main St
DESCRIPTION:<b>Bring</b> insurance card
END:VEVENT
BEGIN:VEVENT
UID:cancelled@x
DTSTART;TZID=Asia/Kolkata:20300107T120000
DTEND;TZID=Asia/Kolkata:20300107T130000
STATUS:CANCELLED
SUMMARY:Lunch with Sam
END:VEVENT
BEGIN:VEVENT
UID:free@x
DTSTART;TZID=Asia/Kolkata:20300107T160000
DTEND;TZID=Asia/Kolkata:20300107T170000
TRANSP:TRANSPARENT
SUMMARY:Gym (optional)
END:VEVENT
END:VCALENDAR
"""


@pytest.fixture
def cal_ctx(ctx, home):
    ctx.config.timezone = "Asia/Kolkata"
    src = CalendarSource(name="Personal", url="https://calendar.google.com/calendar/ical/x/private-y/basic.ics")
    ctx.calendar = CalendarStore([src], home / ".localagent" / "cache", 15, "Asia/Kolkata", fetch=lambda url: ICS)
    return ctx


def run(ctx, name, **args):
    return REGISTRY[name].run(ctx, args)


def test_events_for_a_day(cal_ctx):
    out = run(cal_ctx, "calendar_events", start_date="2030-01-07")
    assert "Monday 07 January 2030" in out
    assert "09:30–10:00  Standup @ Zoom" in out
    assert "14:00–15:30  Dentist @ 12 Main St" in out  # converted from UTC
    assert "Lunch with Sam" not in out  # cancelled
    assert out.index("Standup") < out.index("Dentist")


def test_week_view_handles_recurrence_exceptions_and_all_day(cal_ctx):
    out = run(cal_ctx, "calendar_events", start_date="2030-01-07", days=5)
    assert out.count("Standup") == 4  # Mon–Fri minus the cancelled Wednesday
    assert "Tue 08 Jan:\n  all day  Bank holiday" in out


def test_search(cal_ctx, monkeypatch):
    monkeypatch.setattr(cal_ctx.calendar, "now", lambda: cal_ctx.calendar.at(date(2030, 1, 1)))
    out = run(cal_ctx, "calendar_search", text="dentist")
    assert "Mon 07 Jan 2030" in out and "Bring insurance card" in out
    assert "No events matching" in run(cal_ctx, "calendar_search", text="wedding")


def test_free_time_ignores_transparent_events(cal_ctx):
    out = run(cal_ctx, "calendar_free_time", date="2030-01-07")
    assert "09:00–09:30  (30m)" in out
    assert "10:00–14:00  (4h)" in out
    assert "15:30–18:00  (2h 30m)" in out
    out = run(cal_ctx, "calendar_free_time", date="2030-01-07", min_minutes=60, from_time="9am", to_time="12:00")
    assert "10:00–12:00" in out and "09:00" not in out.split("\n", 1)[1]


def test_offline_falls_back_to_cached_copy(cal_ctx):
    store = cal_ctx.calendar
    run(cal_ctx, "calendar_events", start_date="2030-01-07")  # fills the cache
    store.refresh = 0

    def offline(url):
        raise OSError("network is unreachable")

    store._fetch = offline
    out = run(cal_ctx, "calendar_events", start_date="2030-01-07")
    assert "Standup" in out and "Couldn't refresh" in out


def test_bad_link_explains_itself(cal_ctx):
    cal_ctx.calendar._fetch = lambda url: b"<html>Not Found</html>"
    assert "didn't return a calendar" in run(cal_ctx, "calendar_events")


def test_no_calendar_configured(ctx):
    assert "Secret address in iCal format" in run(ctx, "calendar_events")


def test_parse_day():
    mon = date(2030, 1, 7)
    assert parse_day("today", mon) == mon
    assert parse_day("tomorrow", mon) == date(2030, 1, 8)
    assert parse_day("friday", mon) == date(2030, 1, 11)
    assert parse_day("monday", mon) == mon
    assert parse_day("next monday", mon) == date(2030, 1, 14)
    assert parse_day("2030-02-01", mon) == date(2030, 2, 1)
    assert parse_day("14 Feb", mon) == date(2030, 2, 14)


def test_config_loading(tmp_path, monkeypatch, home):
    (home / "Downloads").mkdir(exist_ok=True)
    cfg_file = tmp_path / "config.toml"
    cfg_file.write_text("""
[model]
name = "llama3.1:8b"
[files]
allowed_folders = ["~/Downloads"]
[files.categories]
"Ebooks" = [".EPUB"]
[[calendar.sources]]
name = "Personal"
url = "PASTE-YOUR-SECRET-ICAL-ADDRESS-HERE"
[[calendar.sources]]
name = "Work"
url = "webcal://example.com/work.ics"
""")
    cfg = load_config(str(cfg_file))
    assert cfg.model == "llama3.1:8b"
    assert cfg.allowed_folders == [home / "Downloads"]
    assert cfg.extra_categories == {"Ebooks": ["epub"]}
    assert [c.name for c in cfg.calendars] == ["Work"]  # placeholder skipped
    assert cfg.calendars[0].url == "https://example.com/work.ics"
