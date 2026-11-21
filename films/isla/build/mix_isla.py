# "us on vacation?" sound: waves that swell with the foam (two per 8 s loop), a soft breeze, Silent's purr while he
# leans on Paw. All made in code. The loop is seamless: 16 s are made and the second half is crossfaded onto the first.
# python mix_isla.py <out_dir>  ->  isla_clean.wav (quiet, to sit under the song added in the app) + isla_full.wav (-14 LUFS)
import os, subprocess, sys, wave
import numpy as np

SR, LOOP = 48000, 8.0
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(3)
N = int(2 * LOOP * SR); t = np.arange(N) / SR


def lowpass(x, a):  # one-pole low-pass, a in (0, 1): smaller = darker
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y


ph = 2 * np.pi * (t % LOOP) / LOOP
# waves: dark noise swelling twice per loop (with the foam line), a brighter hiss as each wave breaks
swell = 0.5 - 0.5 * np.cos(2 * ph)
rumble = lowpass(rng.normal(0, 1, N), 0.012) * (0.25 + 0.75 * swell) * 5
hiss = (rng.normal(0, 1, N) - lowpass(rng.normal(0, 1, N), 0.2)) * np.clip(np.sin(2 * ph - 0.6), 0, 1) ** 3 * 0.18
breeze = lowpass(rng.normal(0, 1, N), 0.004) * (0.6 + 0.4 * np.sin(ph + 1)) * 6
# purr: noise pulsed at ~24 Hz, low-passed, while Silent leans (the lean curve of the video)
lean = np.minimum(1, 1.6 * (0.5 - 0.5 * np.cos(ph)))
pulse = (0.5 + 0.5 * np.sin(2 * np.pi * 24 * t)) ** 2
purr = lowpass(rng.normal(0, 1, N), 0.03) * pulse * lean ** 1.5 * 9

mix = rumble + hiss + breeze + purr
half = int(LOOP * SR)
fade = np.linspace(0, 1, half)
loop = mix[half:] * (1 - fade) + mix[:half] * fade  # the end of the loop runs into its start without a click
loop = loop / (np.abs(loop).max() + 1e-9) * 0.9

raw = os.path.join(out, "isla_raw.wav")
with wave.open(raw, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((loop * 32767).astype(np.int16).tobytes())
for name, lufs in (("isla_full.wav", -14), ("isla_clean.wav", -22)):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", f"loudnorm=I={lufs}:TP=-1.5:LRA=7", "-ar", str(SR), "-ac", "2", os.path.join(out, name)], check=True)
os.remove(raw)
print("ok", out)
