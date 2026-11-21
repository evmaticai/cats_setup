# DIVE CATS 2 audio mix: Bill's narration, "Island Meet and Greet" ducked under him and cut dead when the shark turns,
# one clean happy meow per cat on its hug, and synthesised effects (spear pop, suction boing, reel bubbles, the
# puffer's puff, a low two-note sting for the shark). Cue times come from the episode's timeline.json.
# python mix.py <timeline.json> <out.wav>   (writes a -14 LUFS / -1 dBTP file)
import json, os, subprocess, sys
import numpy as np

SR = 48000
TL = json.load(open(sys.argv[1], encoding="utf8")); OUT = sys.argv[2]
FILMS = os.environ["VIDEOHUB_FILMS"]  # the VideoHub workspace films folder: music and narration of the finished film live there
SFX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "assets", "sfx")
MEOW = {"paw": "paw-A1-795848.mp3", "silent": "silent-S1-684833.mp3", "zhenya": "zhenya-C1-808411.mp3",
        "yeji": "yeji-D1-668825.mp3", "lusya": "lusya-E1-724090.mp3", "franko": "franko-F1-448084.mp3"}
DUR = TL["dur"]; N = int(DUR * SR)
rng = np.random.default_rng(7)


def load(path, af=None):
    cmd = ["ffmpeg", "-v", "error", "-i", path] + (["-af", af] if af else []) + ["-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.float32).copy()


def clean(x, fade=.012, gate_db=-40):
    e = np.abs(x); idx = np.where(e > e.max() * 10 ** (gate_db / 20))[0]
    x = x[max(0, idx[0] - int(.005 * SR)): idx[-1] + int(.02 * SR)]
    x = x / (np.abs(x).max() + 1e-9)
    n = int(fade * SR); w = np.linspace(0, 1, n); x[:n] *= w; x[-n:] *= w[::-1]
    return x


def pitch(x, k): return np.interp(np.arange(0, len(x) - 1, k), np.arange(len(x)), x).astype(np.float32)
def db(v): return 10 ** (v / 20)
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


out = np.zeros(N, np.float32)
def put(x, t, g):
    i = int(t * SR); x = x[: max(0, N - i)]; out[i:i + len(x)] += x * db(g)


# --- synthesised effects
def pop():  # the spear leaving the gun: a short airy thump with a click
    n = int(.18 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (180 - 400 * t) * t) * env(n, .002, .04) + rng.normal(0, .5, n) * env(n, .001, .015)).astype(np.float32)
def boing(base=520, d=.35):  # the suction cup: a springy falling-and-rising wobble
    n = int(d * SR); t = np.arange(n) / SR
    f = base * (1 + .35 * np.sin(2 * np.pi * 11 * t) * np.exp(-t * 6)) * (1 - .25 * t / d)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .003, d / 2.5)).astype(np.float32)
def bubbles(d=.6):  # reel: little rising blips
    n = int(d * SR); x = np.zeros(n, np.float32)
    for _ in range(12):
        s = int(rng.uniform(0, d - .06) * SR); m = int(.05 * SR); t = np.arange(m) / SR; f = rng.uniform(500, 1100)
        x[s:s + m] += np.sin(2 * np.pi * (f + 2500 * t) * t) * env(m, .002, .015) * .6
    return x
def puff():  # the puffer inflating: a whoosh up with a rubbery squeak on top
    n = int(.4 * SR); t = np.arange(n) / SR
    noise = rng.normal(0, 1, n); lp = np.convolve(noise, np.ones(40) / 40, "same")
    return (lp * np.minimum(1, t / .25) * np.exp(-np.maximum(0, t - .28) * 30) * 2 + np.sin(2 * np.pi * (300 + 900 * t) * t) * .4 * env(n, .2, .15)).astype(np.float32)
def sting(f, d=1.2):  # low ominous note: two detuned saws through a soft envelope
    n = int(d * SR); t = np.arange(n) / SR
    s = sum(((t * f * k) % 1 * 2 - 1) for k in (1, 1.006, .5)) / 3
    return (np.convolve(s, np.ones(24) / 24, "same") * env(n, .02, d / 2)).astype(np.float32)


# --- music: ducked under each narrator line, cut with a short fade when the shark turns
mus = load(f"{FILMS}/dive-team/music/cc-by/Island Meet and Greet.mp3")[:N]
lines = json.load(open(f"{FILMS}/lowpoly-studio/scenes/dive-cats-2-vo/lines.json", encoding="utf8"))
g = np.full(N, -13.0)
tt = np.arange(N) / SR
for l in lines: g = np.where((tt > l["t0"] - .1) & (tt < l["t1"] + .15), -20.0, g)
g = np.convolve(g, np.ones(int(.12 * SR)) / int(.12 * SR), "same")
stop = TL["franko"]["t0"] + TL["franko"]["musicStop"]
gain = db(g) * np.clip((stop + .08 - tt) / .08, 0, 1)
out[:len(mus)] += mus * gain[:len(mus)]

# --- narrator
vo = load(f"{FILMS}/lowpoly-studio/scenes/dive-cats-2-vo/audio/vo.wav")
put(vo / (np.abs(vo).max() + 1e-9), 0, -3)

# --- the catches
for s in TL["shots"]:
    t0 = s["t0"]
    put(pop(), t0 + s["shoot"], -14)
    put(boing(620 if s["len"] < .6 else 430), t0 + s["hit"], -15)
    put(bubbles(s["hug"] - s["hit"]), t0 + s["hit"] + .1, -20)
    if s["fish"] == "puffer": put(puff(), t0 + s["hit"] + .03, -13)
    m = clean(load(f"{SFX}/{MEOW[s['cat']]}"))
    put(pitch(m, 1.08)[: int(1.1 * SR)], t0 + s["meow"], -9)  # a touch higher = happier

F = TL["franko"]; t0 = F["t0"]
put(pop(), t0 + F["shoot"], -14)
put(boing(300, .5), t0 + F["hit"], -13)
put(sting(55), t0 + F["turn"][0] + .05, -10)
put(sting(52), t0 + F["pov"] - .05, -9)

peak = np.abs(out).max(); out = out / max(peak, 1e-9) * .9
raw = OUT[:-4] + "_raw.wav"
import wave
with wave.open(raw, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=7", "-ar", str(SR), "-ac", "2", OUT], check=True)
os.remove(raw)
print("mix", OUT, f"{DUR:.1f}s")
