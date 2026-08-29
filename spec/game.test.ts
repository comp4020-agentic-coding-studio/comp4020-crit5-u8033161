import { describe, expect, it } from "vitest";
import { extendSequence, judgeClick, trapChanceForRound } from "../game.js";

// The one rule the brief calls out for a focused test: a wrong click during
// recall ends the round. judgeClick is the pure decision at the heart of
// that rule, so it's tested directly rather than by driving the DOM.
describe("crit 5: judgeClick — a wrong click ends the round", () => {
  const sequence = [{ tile: 3, trap: false }, { tile: 6, trap: false }, { tile: 1, trap: false }];

  it("reports a click on the wrong tile as wrong", () => {
    expect(judgeClick(sequence, 0, 5)).toEqual({ result: "wrong" });
  });

  it("reports a click that's out of order (right tile, wrong turn) as wrong", () => {
    // tile 1 is correct eventually, but not until recallIndex 2
    expect(judgeClick(sequence, 0, 1)).toEqual({ result: "wrong" });
  });

  it("still reports wrong after some correct clicks, not just on the first", () => {
    expect(judgeClick(sequence, 1, 3)).toEqual({ result: "wrong" });
  });

  it("advances recallIndex on a correct click that isn't the last", () => {
    expect(judgeClick(sequence, 0, 3)).toEqual({ result: "correct", recallIndex: 1 });
  });

  it("reports round-complete on the last correct click", () => {
    expect(judgeClick(sequence, 2, 1)).toEqual({ result: "round-complete" });
  });
});

describe("crit 5: judgeClick — the trap tile is a distinct, more severe fail", () => {
  const sequence = [
    { tile: 3, trap: false },
    { tile: 7, trap: true },
    { tile: 1, trap: false },
  ];

  it("reports clicking the trap tile as trap, not a plain wrong click", () => {
    expect(judgeClick(sequence, 1, 7)).toEqual({ result: "trap" });
  });

  it("skips the trap step entirely when judging what's expected next", () => {
    // after correctly clicking tile 3 (recallIndex 1), the next expected
    // click is tile 1 — the trap step is never part of what's expected back
    expect(judgeClick(sequence, 1, 1)).toEqual({ result: "round-complete" });
  });

  it("still accepts a later legitimate click on the same tile a trap used", () => {
    // tile 7 was flashed as a trap, but if a *different*, later step in the
    // sequence legitimately reuses tile 7, clicking it there is correct —
    // only a click that doesn't match what's expected gets checked against
    // the trap set at all.
    const withReuse = [
      { tile: 3, trap: false },
      { tile: 7, trap: true },
      { tile: 7, trap: false },
    ];
    expect(judgeClick(withReuse, 1, 7)).toEqual({ result: "round-complete" });
  });
});

describe("crit 5: extendSequence and trapChanceForRound", () => {
  it("never introduces a trap before the configured start round", () => {
    expect(trapChanceForRound(1)).toBe(0);
    expect(trapChanceForRound(2)).toBe(0);
    expect(trapChanceForRound(3)).toBe(0);
  });

  it("grows the sequence by exactly one step per call", () => {
    let sequence: ReturnType<typeof extendSequence> = [];
    for (let i = 0; i < 5; i++) sequence = extendSequence(sequence);
    expect(sequence.length).toBe(5);
  });

  it("lets an injected rng force a trap for a deterministic test", () => {
    const forcedTrap = extendSequence([{}, {}, {}], () => 0);
    expect(forcedTrap.at(-1).trap).toBe(true);
  });
});
