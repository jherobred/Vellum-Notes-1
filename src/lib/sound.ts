export type Cue =
  | "select"
  | "create"
  | "trash"
  | "restore"
  | "save"
  | "on"
  | "off"
  | "focus"
  | "error"
  | "open"
  | "complete";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.72;
let enabled = true;

export function setSoundEnabled(next: boolean) {
  enabled = next;
}

export function setSoundVolume(next: number) {
  volume = Math.min(1, Math.max(0, next));
  if (master) master.gain.value = volume;
}

export function unlockSound() {
  const c = context();
  if (c && c.state === "suspended") void c.resume();
}

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
    }
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  c: AudioContext,
  dest: AudioNode,
  freq: number,
  t: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  slide?: number,
) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(40, freq), t);
  if (slide && slide > 0) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + Math.min(0.014, dur * 0.25));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

function noise(
  c: AudioContext,
  dest: AudioNode,
  t: number,
  dur: number,
  peak: number,
  cutoff: number,
  kind: BiquadFilterType,
) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = kind;
  filter.frequency.value = cutoff;
  const g = c.createGain();
  g.gain.setValueAtTime(Math.max(0.0002, peak), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/** Original glass tones — short, clean, desktop-quiet. Not recordings of any OS. */
export function playCue(cue: Cue) {
  if (!enabled || volume <= 0.001) return;
  const c = context();
  if (!c || !master) return;
  if (c.state === "suspended") void c.resume();
  const t = c.currentTime + 0.012;
  const bus = master;

  switch (cue) {
    case "select":
      noise(c, bus, t, 0.018, 0.05, 3800, "highpass");
      tone(c, bus, 1760, t, 0.055, "sine", 0.035, 1320);
      break;
    case "open":
      noise(c, bus, t, 0.016, 0.04, 3200, "highpass");
      tone(c, bus, 1318, t, 0.07, "sine", 0.03, 1568);
      break;
    case "create":
      tone(c, bus, 659.25, t, 0.09, "sine", 0.045);
      tone(c, bus, 880, t + 0.07, 0.16, "sine", 0.038);
      noise(c, bus, t, 0.02, 0.03, 5000, "highpass");
      break;
    case "trash":
      tone(c, bus, 196, t, 0.14, "sine", 0.06, 90);
      noise(c, bus, t, 0.08, 0.04, 420, "lowpass");
      break;
    case "restore":
      tone(c, bus, 392, t, 0.16, "sine", 0.04, 659);
      break;
    case "save":
      tone(c, bus, 523.25, t, 0.22, "sine", 0.03);
      tone(c, bus, 783.99, t + 0.045, 0.28, "sine", 0.024);
      break;
    case "on":
      tone(c, bus, 988, t, 0.05, "sine", 0.04, 1318);
      break;
    case "off":
      tone(c, bus, 740, t, 0.06, "sine", 0.035, 520);
      break;
    case "focus":
      tone(c, bus, 440, t, 0.32, "sine", 0.02, 660);
      tone(c, bus, 660, t + 0.04, 0.36, "triangle", 0.012);
      break;
    case "error":
      tone(c, bus, 311, t, 0.08, "sine", 0.04);
      tone(c, bus, 233, t + 0.09, 0.12, "sine", 0.04);
      break;
    case "complete":
      tone(c, bus, 880, t, 0.07, "sine", 0.035);
      tone(c, bus, 1174, t + 0.06, 0.12, "sine", 0.028);
      break;
    default:
      break;
  }
}
