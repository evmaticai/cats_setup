import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from 'remotion';

// Shared HTML overlays for every episode. Episode-specific pixel inserts live in the episode folder.
export const FPS = 30;
export const PIX = "'PressStart2P', monospace";
export const outline = (w = 6) => [[0, w], [w, 0], [-w, 0], [0, -w], [w, w], [-w, -w], [w, -w], [-w, w]].map(([x, y]) => `${x}px ${y}px 0 #000`).join(', ');

export const usePixelFont = () => {
  const [handle] = useState(() => delayRender('pixel font'));
  useEffect(() => {
    const f = new FontFace('PressStart2P', `url(${staticFile('fonts/PressStart2P-Regular.ttf')})`);
    f.load().then((ff) => { document.fonts.add(ff); continueRender(handle); }).catch(() => continueRender(handle));
  }, [handle]);
};

export type Word = { w: string; s: number; e: number };
export type WordsJson = Record<string, { words: Word[] }>;
export const flattenWords = (words: WordsJson, cues: Record<string, number>): Word[] =>
  Object.entries(words).filter(([id]) => id in cues)
    .flatMap(([id, l]) => l.words.map((w) => ({ w: w.w, s: cues[id] + w.s, e: cues[id] + w.e })))
    .sort((a, b) => a.s - b.s);

/** One word at a time, lower third, chunky pixel font (the reference's caption style). */
export const Captions: React.FC<{ words: Word[]; until: number }> = ({ words, until }) => {
  const t = useCurrentFrame() / FPS;
  const i = words.findIndex((w, j) => t >= w.s - 0.03 && t < Math.min(w.e + 0.3, words[j + 1]?.s ?? Infinity));
  if (i < 0 || t >= until) return null;
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', top: 1290 }}>
      {/* Press Start 2P is ~1em per glyph: shrink long words so they never run off the 1080 px frame */}
      <div style={{ fontFamily: PIX, fontSize: Math.min(86, Math.floor(960 / Math.max(1, words[i].w.length))), color: '#fff', textShadow: outline(), letterSpacing: 2, whiteSpace: 'nowrap' }}>{words[i].w.toLowerCase()}</div>
    </AbsoluteFill>
  );
};

/** Pixel-art canvas: draw on a 108x192 grid, shown 10x with hard edges. */
export const Px: React.FC<{ children: React.ReactNode; bg: string }> = ({ children, bg }) => (
  <AbsoluteFill style={{ background: bg }}>
    <svg viewBox="0 0 108 192" width="1080" height="1920" shapeRendering="crispEdges" style={{ imageRendering: 'pixelated' }}>{children}</svg>
  </AbsoluteFill>
);
export const R: React.FC<{ x: number; y: number; w?: number; h?: number; c: string }> = ({ x, y, w = 1, h = 1, c }) => <rect x={x} y={y} width={w} height={h} fill={c} />;
export const PxText: React.FC<{ x: number; y: number; size?: number; c?: string; children: React.ReactNode }> = ({ x, y, size = 9, c = '#17171a', children }) =>
  <text x={x} y={y} textAnchor="middle" fontFamily={PIX} fontSize={size} fill={c}>{children}</text>;
/** Кипиш as a tiny pixel icon (cap, face, black hoodie, camo legs). */
export const KipIcon: React.FC<{ x: number; y: number; step?: number }> = ({ x, y, step = 0 }) => (
  <g transform={`translate(${x} ${y})`}>
    <R x={1} y={0} w={5} h={2} c="#d9dde2" /><R x={1} y={2} w={5} h={4} c="#8a4b2a" /><R x={0} y={6} w={7} h={7} c="#17171a" />
    <R x={1} y={13} w={2} h={5} c="#c9cfd6" /><R x={4} y={13} w={2} h={5} c="#c9cfd6" />
    <R x={step ? 0 : 1} y={18} w={3} h={1} c="#000" /><R x={step ? 4 : 3} y={18} w={3} h={1} c="#000" />
  </g>
);
/** Бекон as a tiny pixel icon. */
export const BekonIcon: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <R x={0} y={2} w={8} h={5} c="#f2a1b0" /><R x={6} y={1} w={4} h={4} c="#f2a1b0" /><R x={9} y={2} w={2} h={2} c="#dd7f92" />
    <R x={7} y={0} w={1} h={1} c="#f2a1b0" /><R x={8} y={2} w={1} h={1} c="#000" /><R x={2} y={3} w={4} h={3} c="#ff6a13" />
    <R x={1} y={7} w={1} h={2} c="#5a3524" /><R x={6} y={7} w={1} h={2} c="#5a3524" />
  </g>
);

/** Floating text (Zzz, !!!, ♪). */
export const Float: React.FC<{ lt: number; text: string; x: number; y: number; n?: number }> = ({ lt, text, x, y, n = 3 }) => (
  <AbsoluteFill>
    {Array.from({ length: n }, (_, i) => {
      const p = (lt * 0.8 + i / n) % 1;
      return <div key={i} style={{ position: 'absolute', left: x + i * 60 + p * 80, top: y - p * 260, fontFamily: PIX, fontSize: 48 + i * 14, color: '#fff', textShadow: outline(), opacity: 1 - p }}>{text}</div>;
    })}
  </AbsoluteFill>
);

/** The break: an in-story stream overlay on his chest cam with donation alerts (music only, no voice).
 * Usernames must be Cyrillic and silly so they can't be real YouTube/TikTok handles. */
export type Alert = { at: number; user: string; sum: string; msg: string };
export const Stream: React.FC<{ lt: number; alerts: Alert[] }> = ({ lt, alerts }) => {
  const live = alerts.filter((a) => lt >= a.at).slice(-2);
  return (
    <AbsoluteFill style={{ fontFamily: PIX, color: '#fff' }}>
      <div style={{ position: 'absolute', left: 60, top: 120, fontSize: 34, display: 'flex', gap: 18, alignItems: 'center', textShadow: outline() }}>
        <span style={{ color: '#ff3b30', opacity: Math.floor(lt * 2) % 2 ? 1 : 0.35 }}>●</span> LIVE
      </div>
      <div style={{ position: 'absolute', right: 60, top: 120, fontSize: 30, textShadow: outline() }}>👁 {1337 + Math.floor(lt * 37)}</div>
      {live.map((a, i) => {
        const pop = Math.min(1, (lt - a.at) / 0.15);
        return (
          <div key={a.user + a.at} style={{ position: 'absolute', left: 60, right: 60, top: 1180 + i * 250, transform: `scale(${0.8 + 0.2 * pop})`, opacity: pop,
            background: '#1b1f3b', border: '8px solid #ff6a13', padding: '28px 30px', boxShadow: '0 10px 0 #000' }}>
            <div style={{ fontSize: 28, color: '#ff9d5e' }}>{a.user} · {a.sum}</div>
            <div style={{ fontSize: 34, marginTop: 18, lineHeight: 1.35 }}>{a.msg}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Game-over results screen over the 3D trophy shot. */
export const Results: React.FC<{ lt: number; title: [string, string]; rows: [string, string][]; color?: string }> = ({ lt, title, rows, color = '#ffd23a' }) => (
  <AbsoluteFill style={{ fontFamily: PIX, color: '#fff', alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 220, fontSize: 64, color, textShadow: outline(), textAlign: 'center', lineHeight: 1.4, transform: `scale(${Math.min(1, lt / 0.25)})` }}>
      {title[0]}<br />{title[1]}
    </div>
    <div style={{ position: 'absolute', top: 1260, left: 80, right: 80, display: 'grid', gap: 34 }}>
      {rows.map(([a, b], i) => (
        <div key={a} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30, textShadow: outline(), opacity: lt > 0.6 + i * 0.35 ? 1 : 0 }}>
          <span>{a}</span><span style={{ color }}>{b}</span>
        </div>
      ))}
    </div>
    <div style={{ position: 'absolute', bottom: 150, fontSize: 30, color: '#ff9d5e', textShadow: outline(), opacity: Math.floor(lt * 2) % 2 ? 1 : 0.2 }}>ЖМИ ПОДПИСКУ</div>
  </AbsoluteFill>
);

export const Flash: React.FC<{ color?: string }> = ({ color = '#fff' }) => <AbsoluteFill style={{ background: color }} />;
