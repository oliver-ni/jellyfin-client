import * as stylex from '@stylexjs/stylex'
import { useMotionValueEvent } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePlayerContext, usePlayerState } from '../context'
import { usePlayerPrefs } from '../store'
import { player } from '../tokens.stylex'
import type { SubtitleTrack } from '../types'
import { createAssRenderer } from './jassub'
import { cuesAt, parseVtt, type Cue } from './vtt'

/** Renders the selected subtitle track: VTT as styled text, ASS/SSA through libass. */
export function Subtitles() {
  const { source } = usePlayerContext()
  const id = usePlayerState((s) => s.subtitleTrackId)
  const track = id ? source.subtitleTracks.find((t) => t.id === id) : undefined
  if (!track || !track.url) return null
  if (track.kind === 'ass') return <AssSubtitles key={track.id} track={track} />
  if (track.kind === 'vtt') return <VttSubtitles key={track.id} track={track} />
  return null
}

function VttSubtitles({ track }: { track: SubtitleTrack }) {
  const { time } = usePlayerContext()
  const controlsVisible = usePlayerState((s) => s.controlsVisible)
  const scale = usePlayerPrefs((p) => p.subtitleScale)
  const [cues, setCues] = useState<Cue[]>([])
  const [active, setActive] = useState<Cue[]>([])
  const last = useRef('')

  const url = track.url
  useEffect(() => {
    if (!url) return
    const ctrl = new AbortController()
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => setCues(parseVtt(text)))
      .catch(() => setCues([]))
    return () => ctrl.abort()
  }, [url])

  const update = useCallback(
    (t: number) => {
      const next = cuesAt(cues, t)
      const key = next.map((c) => c.lines.join('\n')).join('\n\n')
      if (key !== last.current) {
        last.current = key
        setActive(next)
      }
    },
    [cues],
  )
  useMotionValueEvent(time, 'change', update)
  useEffect(() => update(time.get()), [update, time])

  if (active.length === 0) return null
  return (
    <div
      {...stylex.props(styles.vttLayer, controlsVisible && styles.vttRaised)}
      style={{ fontSize: `calc(clamp(16px, 2.4vmin, 28px) * ${scale})` }}
    >
      {active.map((cue, i) => (
        <div key={i} {...stylex.props(styles.cue)}>
          {cue.lines.map((line, j) => (
            <span key={j} {...stylex.props(styles.line)}>
              {line}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

function AssSubtitles({ track }: { track: SubtitleTrack }) {
  const { engine } = usePlayerContext()
  const hostRef = useRef<HTMLDivElement>(null)
  const fontKey = (track.fonts ?? []).join('\n')

  useEffect(() => {
    const video = engine.video
    const host = hostRef.current
    if (!video || !host || !track.url) return
    // A canvas can hand off to an OffscreenCanvas only once, so each renderer gets its own.
    const canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.pointerEvents = 'none'
    host.append(canvas)
    let disposed = false
    const instance = createAssRenderer({
      video,
      canvas,
      subUrl: track.url,
      fonts: fontKey ? fontKey.split('\n') : [],
      prescaleFactor: 0.8,
    })
    instance.then((r) => {
      if (disposed) void r.destroy()
    })
    return () => {
      disposed = true
      instance
        .then((r) => void r.destroy())
        .catch(() => undefined)
        .finally(() => canvas.remove())
    }
  }, [engine, track.url, fontKey])

  return <div ref={hostRef} {...stylex.props(styles.assHost)} />
}

const styles = stylex.create({
  vttLayer: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    bottom: '6%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25em',
    pointerEvents: 'none',
    textAlign: 'center',
    transitionProperty: 'bottom',
    transitionDuration: '300ms',
    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
  },
  vttRaised: {
    bottom: 'max(6%, 96px)',
  },
  cue: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  line: {
    display: 'inline-block',
    paddingInline: '0.3em',
    paddingBlock: '0.1em',
    fontWeight: 500,
    lineHeight: 1.35,
    color: player.subtitleText,
    textShadow: player.subtitleShadow,
    backgroundColor: player.subtitleBg,
    borderRadius: '0.2em',
    textWrap: 'balance',
  },
  assHost: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
})
