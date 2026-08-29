// Pattern: a growing flash-then-repeat memory game on a 3x3 grid. Game rules
// (sequence generation, trap resolution, win/lose judging) live in game.js as
// pure functions; this file is just the DOM/audio wiring around them.
import { extendSequence, flashTimingForRound, judgeClick } from "./game.js";

const BEST_KEY = "crit5-pattern-best-streak";

const NOTE_FREQS = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
};

const FLASH_VELOCITY = 0.7;
const DANGER_VELOCITY = 0.85;
const CLICK_VELOCITY = 0.6;
const DECAY_SECONDS = 0.5;
const ROUND_COMPLETE_PAUSE = 500;

const grid = document.getElementById("grid");
const tiles = [...grid.querySelectorAll(".tile")];
const freqByIndex = tiles.map((tile) => NOTE_FREQS[tile.dataset.note]);
const roundCounterEl = document.getElementById("round-counter");
const resultEl = document.getElementById("result");
const resultRoundEl = document.getElementById("result-round");
const resultBestEl = document.getElementById("result-best");

let audioCtx;
let masterGain;
let noiseBuffer;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    const limiter = audioCtx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 8;
    limiter.ratio.value = 6;
    masterGain.connect(limiter);
    limiter.connect(audioCtx.destination);

    const length = audioCtx.sampleRate * 2;
    noiseBuffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// Karplus-Strong pluck, carried over from crit4 (six-strings): a noise burst
// recirculating through a delay/lowpass/feedback loop tuned to the note's
// period, so each tile rings like a plucked string instead of a flat tone.
// The in-loop lowpass has a real peak gain above 1 near its own cutoff even
// at low Q, so the feedback gain is divided by that measured peak (not just
// assumed safe below 1) to keep the loop from ever running away.
function pluck(freq, velocity) {
  const ctx = getAudioContext();
  const delayTime = 1 / freq;
  const feedbackGain = Math.exp((Math.log(0.001) * delayTime) / DECAY_SECONDS);
  const now = ctx.currentTime;

  const delay = ctx.createDelay(1);
  delay.delayTime.value = delayTime;

  const damping = ctx.createBiquadFilter();
  damping.type = "lowpass";
  damping.frequency.value = freq * (2 + velocity * 3);
  damping.Q.value = 0.6;

  const probeFreqs = new Float32Array(64);
  for (let i = 0; i < probeFreqs.length; i++) {
    probeFreqs[i] = 1 + (i / (probeFreqs.length - 1)) * (ctx.sampleRate / 2 - 1);
  }
  const probeMag = new Float32Array(probeFreqs.length);
  damping.getFrequencyResponse(probeFreqs, probeMag, new Float32Array(probeFreqs.length));
  const filterPeakGain = Math.max(...probeMag);

  const feedback = ctx.createGain();
  feedback.gain.value = feedbackGain / (filterPeakGain * 1.05);

  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.Q.value = 0.5;
  const brightHz = Math.min(ctx.sampleRate / 2 - 100, freq * (6 + velocity * 8));
  const darkHz = freq * 1.5;
  tone.frequency.setValueAtTime(brightHz, now);
  tone.frequency.exponentialRampToValueAtTime(darkHz, now + DECAY_SECONDS);

  const outputGain = ctx.createGain();
  outputGain.gain.value = 0.35 + velocity * 0.35;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const burstDuration = delayTime * 2;
  const burstGain = ctx.createGain();
  const fade = Math.min(burstDuration / 3, 0.004);
  burstGain.gain.setValueAtTime(0, now);
  burstGain.gain.linearRampToValueAtTime(velocity, now + fade);
  burstGain.gain.linearRampToValueAtTime(0, now + burstDuration);

  noise.connect(burstGain);
  burstGain.connect(delay);
  delay.connect(damping);
  damping.connect(feedback);
  feedback.connect(delay);
  damping.connect(tone);
  tone.connect(outputGain);
  outputGain.connect(masterGain);

  const offset = Math.random() * (noiseBuffer.duration - burstDuration);
  noise.start(now, offset, burstDuration);

  const cleanupAfter = (DECAY_SECONDS + 0.3) * 1000;
  setTimeout(() => {
    noise.disconnect();
    burstGain.disconnect();
    delay.disconnect();
    damping.disconnect();
    feedback.disconnect();
    tone.disconnect();
    outputGain.disconnect();
  }, cleanupAfter);
}

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

function bump(el, className) {
  el.classList.remove(className);
  void el.offsetWidth; // restart the animation even if it's already running
  el.classList.add(className);
}

function disableTiles(disabled) {
  for (const tile of tiles) tile.disabled = disabled;
}

function setRoundCounter(text) {
  roundCounterEl.textContent = text;
}

function hideResult() {
  resultEl.hidden = true;
}

function showResult(reached, best) {
  setRoundCounter("");
  resultRoundEl.textContent = String(reached);
  resultBestEl.textContent = String(best);
  resultEl.hidden = false;
}

let best = Number(localStorage.getItem(BEST_KEY)) || 0;
let sequence = [];
let round = 0;
let recallIndex = 0;
let phase = "idle"; // idle | flashing | recall | gameover

async function flashSequence() {
  const timing = flashTimingForRound(round);
  for (const step of sequence) {
    await wait(timing.gap);
    const tile = tiles[step.tile];
    tile.classList.add(step.trap ? "flash-danger" : "flash");
    pluck(freqByIndex[step.tile], step.trap ? DANGER_VELOCITY : FLASH_VELOCITY);
    await wait(timing.duration);
    tile.classList.remove("flash", "flash-danger");
  }
}

async function startRound() {
  phase = "flashing";
  disableTiles(true);
  sequence = extendSequence(sequence);
  round = sequence.length;
  recallIndex = 0;
  setRoundCounter(String(round));
  await flashSequence();
  phase = "recall";
  disableTiles(false);
}

function endGame(dramatic) {
  phase = "gameover";
  disableTiles(true);
  const reached = round;
  best = Math.max(best, reached);
  localStorage.setItem(BEST_KEY, String(best));
  bump(grid, dramatic ? "shatter" : "wrong");
  setTimeout(
    () => {
      grid.classList.remove("shatter", "wrong");
      disableTiles(false);
      showResult(reached, best);
    },
    dramatic ? 650 : 400,
  );
}

function startNewGame() {
  hideResult();
  sequence = [];
  round = 0;
  recallIndex = 0;
  startRound();
}

grid.addEventListener("click", (event) => {
  const tile = event.target.closest(".tile");
  if (!tile) return;
  getAudioContext();

  if (phase === "idle" || phase === "gameover") {
    startNewGame();
    return;
  }
  if (phase !== "recall") return;

  const index = Number(tile.dataset.index);
  const outcome = judgeClick(sequence, recallIndex, index);

  if (outcome.result === "trap") {
    endGame(true);
    return;
  }
  if (outcome.result === "wrong") {
    endGame(false);
    return;
  }

  pluck(freqByIndex[index], CLICK_VELOCITY);
  bump(tile, "hit");

  if (outcome.result === "correct") {
    recallIndex = outcome.recallIndex;
    return;
  }

  // round-complete
  phase = "advancing";
  disableTiles(true);
  setTimeout(startRound, ROUND_COMPLETE_PAUSE);
});
