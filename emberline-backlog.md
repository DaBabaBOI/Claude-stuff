# Emberline backlog (from email and in-game feedback)

Big changes people asked for, kept here until Prithu asks for a summary.
Small bugs found in the same messages are fixed straight away and listed
under "Fixed" so they aren't picked up twice.

## Big changes (waiting)

- **Bring back the pixel-art cutscenes** (Patrick, "Emberline Review", 8 Oct 07:05 UTC).
  "ADD BACK THE PIXEL ANIMATIONS. It adds its own identity to the game,
  everything 3D isn't great, the pixel animations had their own thing."
  The 2D scenes were replaced by 3D ones in commit d845d1b (the old code is
  in git history). Options: restore the 2D scenes, or offer a setting
  (Pixel / 3D cutscenes). A design call for Prithu.
- **Make "Emberline 2" official, or ship more updates** (Raghuvir, "Emberline 2", 8 Oct).
  An unofficial fork: https://froodyofficial-maker.github.io/Emberline-2/ .
  Prithu replied "tell me what u guys want"; no list yet.
- **Speedrun mode / controls** (Patrick, 7 Oct). A dedicated game mode or
  controls for speedrunning, introduced later once more people have beaten
  the game (worry: speedrunning may cause game fatigue).

## Needs a repro

- "There's a glitch where the scouts never head out" (in-game feedback #14,
  7 Oct, Stone Age). The scout logic checks out; no steps to reproduce.

## Fixed

- 8 Oct: first person "can't move" (Patrick + in-game #15): the chief could
  start inside the campfire. Also added touch controls (phones and tablets
  had no way to move). Commit 5c3296c.
- 8 Oct: "wtf does planning do" / "planning is not clear" (Patrick + in-game
  #16): Plan mode now shows a how-to banner while on. Commit 5c3296c.
- 8 Oct: "still haven't fully understood story mode" (Patrick): the story
  panel explains how chapters work. Commit 5c3296c.
- Older "warning before your village dies" (in-game #13): famine, unrest
  and collapse already show countdown warnings.

## Already read (don't re-process)

- Gmail thread 1a11483dcaf2b6ed ("Emberline Review"), up to message 1a11a553db950c5a (8 Oct 07:05 UTC)
- Gmail thread 1a119edf1c61d057 ("Emberline 2"), up to message 1a11adef4ef86bbc (8 Oct 09:36 UTC)
- Supabase `feedback` table, up to id 16
