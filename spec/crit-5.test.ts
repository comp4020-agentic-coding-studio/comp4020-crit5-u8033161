import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// C5's spec asks for a lot only a person can judge at the crit — obvious in
// ten seconds, still interesting at five minutes, whether the ending lands,
// whether the losable rule is actually fun to lose. What's below is the one
// line that's mechanically checkable without knowing the mechanic yet: the
// no-tutorial rule. No modal, no how-to-play page, nothing in the shipped
// markup substituting for the opening screen teaching the first move by
// affordance alone.
//
// Two things the spec also requires are deliberately NOT faked in here,
// because they depend on the mechanic this game doesn't have yet:
//   - "must be losable, with a defined ending" — once there's a real game
//     state, add a test that drives it to that ending and asserts it's
//     reached (see spec/README.md: a contract test, not a markup guess).
//   - "at least one rule has a focused automated test" — that's a test of
//     the core mechanic itself, written once the mechanic exists.
// Both are on the student, not invented here.

const DIST = resolve("dist");
const doc = new JSDOM(readFileSync(resolve(DIST, "index.html"), "utf8")).window.document;

const TUTORIAL_PHRASES = [
  /how to play/i,
  /instructions?/i,
  /tutorial/i,
  /controls?:/i,
  /press (the )?(space|enter|arrow)/i,
  /use the arrow keys/i,
  /click (here|to (start|play))/i,
  /objective:/i,
  /rules?:/i,
];

describe("crit 5: a game — no tutorial", () => {
  it("has no <dialog>, and no element that reads as a how-to-play panel", () => {
    expect(doc.querySelector("dialog"), "a <dialog> reads as an explicit instruction surface").toBeNull();
    expect(
      doc.querySelector(
        '[class*="tutorial" i], [id*="tutorial" i], [class*="how-to" i], [id*="how-to" i], [class*="instructions" i], [id*="instructions" i]',
      ),
      "found an element that names itself as instructional",
    ).toBeNull();
  });

  it("carries no visible instructional text on the shipped page", () => {
    const visibleText = doc.body.textContent ?? "";
    for (const phrase of TUTORIAL_PHRASES) {
      expect(visibleText, `found text matching ${phrase} — the opening screen should teach by affordance, not words`).not.toMatch(
        phrase,
      );
    }
  });
});
