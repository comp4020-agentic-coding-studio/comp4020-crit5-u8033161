# Process overview

<!-- TEMPLATE: this file is a shape to fill in, not a form. Replace everything
     in it with your own overview, and delete this comment — `pnpm
     check:evidence` will remind you if it's still here. -->

A reading-guide to how the work came together --- a map to your process, not an
essay about it. Markers read this file and follow its citations; they don't
trawl the repo for evidence you didn't point at, so if a moment mattered, cite
it.

This file is the shape; the course site's
[assessment page](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#what-you-submit)
is the requirement, and its
[word counts](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#word-counts)
cover every deliverable.

## What I built

One paragraph: the thing, and the idea behind it.

## The moments that mattered

1. **Catching a glow bug only by playing, not reading.** I played the
   finished game myself and found it confusing on first contact — multiple
   tiles were glowing at once, mixing an idle shimmer with the actual
   sequence flash, so it wasn't clear which tile was part of the pattern to
   remember. I only described what confused me when I played it; I didn't
   diagnose the code myself. The agent traced it to a class added on every
   correct click that was never removed again, so every tile you'd ever
   clicked correctly stayed lit for the rest of the game, and fixed it so
   only the actively-flashing tile lights up during playback. I confirmed by
   playing through several rounds that the glow no longer lingers
   ([`4efbcfb`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-u8033161/commit/4efbcfb)).

## Before you ship

`pnpm check:evidence` verifies your citations resolve to real commits, that a
reflection entry the marker reads is in `reflections/`, and that your
`CLAUDE.md` is there --- before a marker ever opens the file. It checks that
your map is traceable, not that it is good: the marker judges whether your
small, deliberately chosen set of moments shows real judgement and reflection. A
green check is not a substitute for that curation.

Images aren't checked: unlike a citation whose SHA doesn't resolve, a broken
image is visible the moment this file is rendered on GitHub.
