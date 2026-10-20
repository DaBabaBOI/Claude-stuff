import os
import time

import pytest

from conftest import Confirmer, touch
from localagent.safety import ToolError
from localagent.tools import REGISTRY, all_tools

all_tools()


def run(ctx, name, **args):
    return REGISTRY[name].run(ctx, args)


# ---------------------------------------------------------------- sandbox

def test_paths_outside_allowed_folders_are_refused(ctx, home):
    assert "outside the folders" in run(ctx, "list_folder", path="~/secret")
    assert "outside the folders" in run(ctx, "list_folder", path=str(home / "Downloads" / ".." / "secret"))
    assert "outside the folders" in run(ctx, "list_folder", path="/")
    assert "outside the folders" in run(ctx, "find_files", folder="~/secret")


def test_symlink_cannot_escape_sandbox(ctx, home):
    link = home / "Downloads" / "sneaky"
    try:
        link.symlink_to(home / "secret", target_is_directory=True)
    except OSError:
        pytest.skip("symlinks not available")
    assert "outside the folders" in run(ctx, "list_folder", path="~/Downloads/sneaky")
    with pytest.raises(ToolError):
        ctx.sandbox.resolve("~/Downloads/sneaky/passwords.txt")


def test_relative_and_tilde_paths(ctx, home):
    touch(home / "Downloads" / "a.pdf")
    assert ctx.sandbox.resolve("Downloads/a.pdf") == (home / "Downloads" / "a.pdf").resolve()
    assert ctx.sandbox.resolve("~/Downloads") == (home / "Downloads").resolve()


# ---------------------------------------------------------------- looking around

def test_list_and_summary(ctx, home):
    touch(home / "Downloads" / "photo.JPG", b"x" * 2048)
    touch(home / "Downloads" / "report.pdf")
    (home / "Downloads" / "Old").mkdir()
    touch(home / "Downloads" / ".DS_Store")
    out = run(ctx, "list_folder", path="~/Downloads")
    assert "photo.JPG" in out and "[folder] Old/" in out and ".DS_Store" not in out
    out = run(ctx, "folder_summary", path="~/Downloads")
    assert "2 files" in out and "Images 1" in out and "Documents 1" in out


def test_find_files_filters(ctx, home):
    old = time.time() - 400 * 86400
    touch(home / "Documents" / "tax" / "2024-return.pdf", mtime=old)
    touch(home / "Documents" / "notes.txt")
    touch(home / "Documents" / "big.mov", b"x" * (2 * 1024 * 1024))
    assert "2024-return.pdf" in run(ctx, "find_files", folder="~/Documents", extension=".PDF")
    out = run(ctx, "find_files", folder="~/Documents", older_than_days=365)
    assert "2024-return.pdf" in out and "notes.txt" not in out
    out = run(ctx, "find_files", folder="~/Documents", min_size_mb="1")  # string coerced to number
    assert "big.mov" in out and "notes.txt" not in out
    touch(home / "Desktop" / "flyer.pdf")
    touch(home / "secret" / "hidden.pdf")
    out = run(ctx, "find_files", folder="~", extension="pdf")  # whole home = every allowed folder, nothing else
    assert "2 match(es)" in out and "flyer.pdf" in out and "hidden.pdf" not in out


# ---------------------------------------------------------------- organizing + undo

def test_organize_by_type_then_undo(ctx, home):
    dl = home / "Downloads"
    touch(dl / "IMG_1.png")
    touch(dl / "cv.pdf")
    touch(dl / "setup.exe")
    touch(dl / "movie.mp4.crdownload")  # still downloading: must be left alone
    (dl / "Images").mkdir()
    touch(dl / "Images" / "IMG_1.png")  # name clash in the destination

    out = run(ctx, "organize_folder", folder="~/Downloads")
    assert "Moved 3" in out
    assert (dl / "Documents" / "cv.pdf").exists()
    assert (dl / "Installers" / "setup.exe").exists()
    assert (dl / "Images" / "IMG_1 (1).png").exists()
    assert (dl / "movie.mp4.crdownload").exists()
    title, details = ctx.confirm.asked[0]
    assert "3 file(s)" in title and any("Installers/" in d for d in details)

    assert "Undid" in run(ctx, "undo_last_change")
    assert (dl / "cv.pdf").exists() and (dl / "setup.exe").exists() and (dl / "IMG_1.png").exists()
    assert not (dl / "Documents").exists() and not (dl / "Installers").exists()  # folders it created are removed
    assert (dl / "Images" / "IMG_1.png").exists()  # pre-existing stuff untouched
    assert "nothing to undo" in run(ctx, "undo_last_change")


def test_saying_no_changes_nothing(ctx, home):
    ctx.confirm = Confirmer(False)
    touch(home / "Desktop" / "a.png")
    out = run(ctx, "organize_folder", folder="~/Desktop", by="date")
    assert "said no" in out
    assert (home / "Desktop" / "a.png").exists()
    assert ctx.journal.last() is None


def test_organize_by_date(ctx, home):
    ts = time.mktime((2025, 3, 15, 12, 0, 0, 0, 0, -1))
    touch(home / "Pictures" / "a.jpg", mtime=ts)
    run(ctx, "organize_folder", folder="~/Pictures", by="DATE")
    assert (home / "Pictures" / "2025" / "2025-03" / "a.jpg").exists()


def test_bad_enum_value_is_reported(ctx, home):
    assert "must be one of" in run(ctx, "organize_folder", folder="~/Pictures", by="colour")


def test_move_files_and_guards(ctx, home):
    touch(home / "Desktop" / "a.pdf")
    touch(home / "Desktop" / "b.pdf")
    out = run(ctx, "move_files", paths=["~/Desktop/a.pdf", "~/Desktop/b.pdf", "~/secret/passwords.txt"],
              destination="~/Documents/Taxes")
    assert "Moved 2" in out and "outside the folders" in out
    assert (home / "Documents" / "Taxes" / "a.pdf").exists()
    assert "main folders" in run(ctx, "move_files", paths=["~/Downloads"], destination="~/Documents")
    (home / "Documents" / "Proj").mkdir()
    assert "into itself" in run(ctx, "move_files", paths=["~/Documents/Proj"], destination="~/Documents/Proj/sub")
    assert "outside the folders" in run(ctx, "move_files", paths=["~/Desktop"], destination="~/secret")


def test_move_matching_files(ctx, home):
    touch(home / "Desktop" / "Screenshot 2026-01-01.png")
    touch(home / "Desktop" / "Screenshot 2026-01-02.png")
    touch(home / "Desktop" / "todo.txt")
    out = run(ctx, "move_matching_files", folder="~/Desktop", destination="~/Pictures/Screenshots",
              name_contains="screenshot")
    assert "Moved 2" in out
    assert (home / "Desktop" / "todo.txt").exists()
    assert len(list((home / "Pictures" / "Screenshots").iterdir())) == 2
    assert "at least one filter" in run(ctx, "move_matching_files", folder="~/Desktop", destination="~/Pictures")


def test_rename_keeps_extension(ctx, home):
    touch(home / "Downloads" / "IMG_2041.jpg")
    assert "Moved 1" in run(ctx, "rename_file", path="~/Downloads/IMG_2041.jpg", new_name="passport")
    assert (home / "Downloads" / "passport.jpg").exists()
    assert "plain file name" in run(ctx, "rename_file", path="~/Downloads/passport.jpg", new_name="../x.jpg")


def test_duplicates(ctx, home):
    data = os.urandom(5000)
    touch(home / "Downloads" / "song.mp3", data, mtime=time.time() - 1000)
    touch(home / "Downloads" / "song (1).mp3", data)
    touch(home / "Downloads" / "sub" / "song copy.mp3", data)
    touch(home / "Downloads" / "other.mp3", os.urandom(5000))  # same size, different content
    out = run(ctx, "find_duplicates", folder="~/Downloads")
    assert "1 set(s)" in out and "keep ~/Downloads/song.mp3" in out and "other.mp3" not in out
    out = run(ctx, "find_duplicates", folder="~/Downloads", move_extras=True)
    assert "Moved 2" in out
    assert (home / "Downloads" / "song.mp3").exists()
    assert len(list((home / "Downloads" / "Duplicates (review)").iterdir())) == 2


def test_open_file_refuses_programs(ctx, home):
    touch(home / "Downloads" / "setup.exe")
    assert "don't open programs" in run(ctx, "open_file", path="~/Downloads/setup.exe")


def test_create_folder_undo(ctx, home):
    assert "Created" in run(ctx, "create_folder", path="~/Documents/Receipts/2026")
    assert (home / "Documents" / "Receipts" / "2026").is_dir()
    run(ctx, "undo_last_change")
    assert not (home / "Documents" / "Receipts").exists()


def test_todo(ctx):
    assert "Added #1" in run(ctx, "todo", action="add", text="renew passport", due="2026-11-01")
    run(ctx, "todo", action="add", text="call mum")
    assert "2 open" in run(ctx, "todo", action="list")
    assert "Ticked off #1" in run(ctx, "todo", action="done", item_id="1")
    out = run(ctx, "todo", action="list")
    assert "renew passport" not in out and "1 already done" in out
    assert "no to-do #9" in run(ctx, "todo", action="remove", item_id=9)
