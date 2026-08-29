// Pure game logic for the pattern-memory game: no DOM, no audio, no timers,
// so it's directly unit-testable. main.js is the only thing that touches the
// page; this module just answers "what happens if X".

export const TILE_COUNT = 9;

// Traps don't start appearing until a few rounds in, and get slightly more
// likely as the sequence grows, capped so the game stays winnable.
const TRAP_START_ROUND = 4;
const TRAP_BASE_CHANCE = 0.12;
const TRAP_CHANCE_STEP = 0.03;
const TRAP_MAX_CHANCE = 0.4;

export function trapChanceForRound(round) {
  if (round < TRAP_START_ROUND) return 0;
  return Math.min(TRAP_BASE_CHANCE + (round - TRAP_START_ROUND) * TRAP_CHANCE_STEP, TRAP_MAX_CHANCE);
}

// Appends one step to the sequence for the next round. `rng` is injectable
// so tests can drive it deterministically instead of stubbing Math.random.
export function extendSequence(sequence, rng = Math.random) {
  const round = sequence.length + 1;
  const tile = Math.floor(rng() * TILE_COUNT);
  const trap = rng() < trapChanceForRound(round);
  return [...sequence, { tile, trap }];
}

// The steps the player actually has to click, in order — traps are flashed
// but must be skipped, so they're never part of what's expected back.
export function expectedClicks(sequence) {
  return sequence.filter((step) => !step.trap).map((step) => step.tile);
}

// Judges one click during the recall phase. `recallIndex` is how many
// expected (non-trap) clicks have already landed correctly this round.
//
// A click that matches the next expected tile is always correct, even if
// that same tile index was flashed as a trap earlier in this same sequence
// — a real replay of that tile is a legitimate click, not a repeat of the
// trap. Only a click that does NOT match what's expected is checked against
// the trap set, to decide whether it's a dramatic trap fail or a plain
// wrong-click fail.
export function judgeClick(sequence, recallIndex, clickedTile) {
  const expected = expectedClicks(sequence);
  if (clickedTile === expected[recallIndex]) {
    const nextIndex = recallIndex + 1;
    return nextIndex === expected.length
      ? { result: "round-complete" }
      : { result: "correct", recallIndex: nextIndex };
  }
  const trapTiles = new Set(sequence.filter((step) => step.trap).map((step) => step.tile));
  return trapTiles.has(clickedTile) ? { result: "trap" } : { result: "wrong" };
}

// Flash timing shortens as rounds climb, with a floor so it never becomes
// unplayable.
export function flashTimingForRound(round) {
  const duration = Math.max(650 - round * 25, 280);
  const gap = Math.max(350 - round * 15, 140);
  return { duration, gap };
}
