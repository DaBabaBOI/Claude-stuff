# Emberline: work waiting for the game repo

This session can't push to `DaBabaBOI/emberline-game-actual` right now (the
request to attach it with push access was blocked). Everything here goes into
that repo once access is back.

## Already live on Supabase (repo copy pending)

`trainer.patch` adds, to the game repo:

- `supabase/functions/agent-trainer/index.ts`: the trainer for Elder Ama and
  the villagers (deployed as `agent-trainer`, v2).
- `supabase/functions/ask-ama/index.ts`: the live function now reads the
  trainer's worked examples (deployed as `clever-endpoint`, v11).
- `supabase/agent-trainer.sql`: the tables, the progress view and the
  pg_cron schedule (every two hours, at 23 past), already applied.

Apply with `git apply emberline-pending/trainer.patch` in the game repo.

## Queued game changes (need the repo)

1. Feedback #19-21 and first person:
   - scouts must not reveal what's under the fog (the target errors say land
     or sea; "Unexplored land"), and a nicer scouting look;
   - the walking band is confusing (smaller, further back, clearer);
   - the "raiders are attacking" shot plays after losing the battle;
   - event cards in first person don't make sense;
   - people move too fast in first person (villager speed follows the game
     speed while the chief walks in real time; the band runs at 4.4).
   - Also: warnings say "about a fews left" (the {secs} text).
2. Fight as any character; select and move units in command battles.
3. Warfare levels with more kinds of warriors (archers and more), easy to
   recruit.
4. Councils like the UN for the peoples you have met (votes on peace,
   trade, climate, aid).
5. Income level (low / middle / high) worked out from how the civilisation
   is doing (output per person, trade, education, health, homes, the land),
   each with its own challenges and goals; capitalism / communism / mixed
   economies and wages.
6. Enemy tactics trainer: self-play battles in GitHub Actions (free for a
   public repo), the best tactics written back into the game.
