import { useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n/LangContext.jsx';
import { PlayIcon, PauseIcon, VolumeIcon, MuteIcon, FullscreenIcon, ExitFullscreenIcon, TheaterIcon, ReplayIcon } from './Icons.jsx';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function fmt(s) {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = String(Math.floor(s % 60)).padStart(2, '0');
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

// A YouTube-style player: big play button, progress bar with preview time, volume, speed,
// theater mode, fullscreen, keyboard shortcuts, auto-hiding controls and an "Up next" countdown.
// Keys: space/K play, ←/→ 5s, J/L 10s, ↑/↓ volume, M mute, F fullscreen, T theater, 0-9 jump.
export default function VideoPlayer({ src, poster, autoPlay = false, theater = false, onTheater, nextUp }) {
  const { t } = useLang();
  const wrap = useRef(null);
  const video = useRef(null);
  const bar = useRef(null);
  const hideTimer = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(() => {
    try { const v = parseFloat(localStorage.getItem('baihua_volume')); return Number.isFinite(v) ? v : 1; } catch { return 1; }
  });
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [rateOpen, setRateOpen] = useState(false);
  const [full, setFull] = useState(false);
  const [show, setShow] = useState(true);
  const [waiting, setWaiting] = useState(false);
  const [ended, setEnded] = useState(false);
  const [hover, setHover] = useState(null);
  const [count, setCount] = useState(null);
  const [cancelled, setCancelled] = useState(false);

  // Apply volume, mute and speed to the real <video>
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.volume = volume; v.muted = muted; v.playbackRate = rate;
  }, [volume, muted, rate]);

  useEffect(() => { if (autoPlay) video.current?.play().catch(() => {}); }, [src, autoPlay]);

  useEffect(() => {
    const h = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // "Up next" countdown after the video ends
  useEffect(() => {
    if (!ended || !nextUp || cancelled) { setCount(null); return undefined; }
    setCount(5);
    const id = setInterval(() => setCount((c) => (c === null ? c : c - 1)), 1000);
    return () => clearInterval(id);
  }, [ended, nextUp?.id, cancelled]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (count === 0) nextUp?.go(); }, [count]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const poke = () => {
    setShow(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (video.current && !video.current.paused) setShow(false); }, 2600);
  };

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.ended) { v.currentTime = 0; setCancelled(true); }
    if (v.paused) v.play().catch(() => {}); else v.pause();
    poke();
  };
  const seekBy = (d) => { const v = video.current; if (v) v.currentTime = clamp(v.currentTime + d, 0, v.duration || 0); poke(); };
  const setVol = (val) => {
    const v = clamp(val, 0, 1);
    setVolume(v); setMuted(v === 0);
    try { localStorage.setItem('baihua_volume', String(v)); } catch { /* ignore */ }
  };
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else if (wrap.current?.requestFullscreen) wrap.current.requestFullscreen().catch(() => {});
    else video.current?.webkitEnterFullscreen?.(); // iPhone Safari
  };

  // Progress bar: click or drag to seek, hover to preview the time
  const ratioOf = (e) => { const r = bar.current.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1); };
  const seekTo = (e) => { const v = video.current; const x = ratioOf(e); if (v?.duration) { v.currentTime = x * v.duration; setTime(x * v.duration); } };
  const onBarDown = (e) => {
    e.preventDefault();
    seekTo(e);
    const move = (ev) => seekTo(ev);
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const onBarHover = (e) => { const x = ratioOf(e); setHover({ x: x * 100, t: x * dur }); };

  const onKey = (e) => {
    if (e.target.tagName === 'INPUT') return; // the volume slider keeps its own arrow keys
    const k = e.key;
    const map = {
      ' ': toggle, k: toggle, K: toggle, ArrowLeft: () => seekBy(-5), ArrowRight: () => seekBy(5),
      j: () => seekBy(-10), J: () => seekBy(-10), l: () => seekBy(10), L: () => seekBy(10),
      ArrowUp: () => { setVol(volume + 0.05); poke(); }, ArrowDown: () => { setVol(volume - 0.05); poke(); },
      m: () => setMuted((x) => !x), M: () => setMuted((x) => !x), f: toggleFull, F: toggleFull,
      t: () => onTheater?.(), T: () => onTheater?.(),
      Home: () => seekBy(-1e9), End: () => seekBy(1e9)
    };
    if (/^[0-9]$/.test(k) && video.current?.duration) { video.current.currentTime = (Number(k) / 10) * video.current.duration; e.preventDefault(); return; }
    if (map[k]) { e.preventDefault(); map[k](); }
  };

  const visible = show || !playing || rateOpen;
  const pct = (n) => `${dur ? (n / dur) * 100 : 0}%`;

  return (
    <div ref={wrap} className={'vp' + (visible ? ' show' : '') + (full ? ' full' : '')} tabIndex={0} onKeyDown={onKey}
      onMouseMove={poke} onTouchStart={poke} onMouseLeave={() => { if (playing) setShow(false); }}>
      <video ref={video} src={`${src}#t=0.1`} poster={poster} playsInline preload="metadata" onClick={toggle} onDoubleClick={toggleFull}
        onPlay={() => { setPlaying(true); setEnded(false); setCancelled(false); poke(); }}
        onPause={() => { setPlaying(false); setShow(true); }}
        onTimeUpdate={(e) => setTime(e.target.currentTime)}
        onLoadedMetadata={(e) => { setDur(e.target.duration); e.target.volume = volume; }}
        onProgress={(e) => { const b = e.target.buffered; if (b.length) setBuffered(b.end(b.length - 1)); }}
        onWaiting={() => setWaiting(true)} onPlaying={() => setWaiting(false)} onCanPlay={() => setWaiting(false)}
        onEnded={() => { setPlaying(false); setEnded(true); setShow(true); }} />

      {waiting && !ended && <div className="vp-spin" aria-hidden="true" />}
      {!playing && !ended && !waiting && (
        <button className="vp-big" onClick={toggle} aria-label={t('player.play')}><PlayIcon width="38" height="38" /></button>
      )}

      {ended && (
        <div className="vp-end">
          {nextUp && count !== null && count > 0 ? (
            <div className="vp-next">
              <small>{t('player.upnext')}</small>
              <b>{nextUp.title}</b>
              <div className="vp-count" aria-live="polite">{count}</div>
              <div className="vp-next-btns">
                <button className="btn sm" onClick={() => nextUp.go()}>{t('player.playnow')}</button>
                <button className="btn sm ghost" onClick={() => setCancelled(true)}>{t('comments.cancel')}</button>
              </div>
            </div>
          ) : (
            <button className="vp-replay" onClick={toggle}><ReplayIcon width="28" height="28" /> <span>{t('player.replay')}</span></button>
          )}
        </div>
      )}

      <div className="vp-controls" onClick={(e) => e.stopPropagation()}>
        <div ref={bar} className="vp-bar" onPointerDown={onBarDown} onPointerMove={onBarHover} onPointerLeave={() => setHover(null)}
          role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.floor(dur)} aria-valuenow={Math.floor(time)}>
          <div className="vp-buf" style={{ width: pct(buffered) }} />
          <div className="vp-cur" style={{ width: pct(time) }}><i /></div>
          {hover && <span className="vp-tip" style={{ left: `${hover.x}%` }}>{fmt(hover.t)}</span>}
        </div>
        <div className="vp-row">
          <button className="vp-btn" onClick={toggle} aria-label={playing ? t('player.pause') : t('player.play')}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <div className="vp-vol">
            <button className="vp-btn" onClick={() => setMuted((m) => !m)} aria-label={t('player.mute')}>
              {muted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
            </button>
            <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(e) => setVol(Number(e.target.value))} aria-label="Volume" />
          </div>
          <span className="vp-time">{fmt(time)} / {fmt(dur)}</span>
          <span className="vp-grow" />
          <div className="vp-rate">
            <button className="vp-btn txt" onClick={() => setRateOpen((o) => !o)} aria-label={t('player.speed')}>{rate}x</button>
            {rateOpen && (
              <ul className="vp-menu">
                {RATES.map((r) => (
                  <li key={r}><button className={r === rate ? 'on' : ''} onClick={() => { setRate(r); setRateOpen(false); }}>{r === 1 ? t('player.normal') : `${r}x`}</button></li>
                ))}
              </ul>
            )}
          </div>
          {onTheater && <button className={'vp-btn' + (theater ? ' on' : '')} onClick={onTheater} aria-label={t('player.theater')} aria-pressed={theater}><TheaterIcon /></button>}
          <button className="vp-btn" onClick={toggleFull} aria-label={t('player.fullscreen')}>{full ? <ExitFullscreenIcon /> : <FullscreenIcon />}</button>
        </div>
      </div>
    </div>
  );
}
