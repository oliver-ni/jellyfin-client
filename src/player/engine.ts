import type Hls from 'hls.js'
import type { MotionValue } from 'motion/react'
import type { PlayerStore } from './store'
import type { PlaybackSnapshot, PlayerSource, ProgressReason } from './types'

export interface EngineCallbacks {
  onProgress?: (snapshot: PlaybackSnapshot, reason: ProgressReason) => void
  onEnded?: () => void
  onError?: (message: string) => void
}

const MEDIA_ERRORS: Record<number, string> = {
  1: 'Playback was aborted.',
  2: 'A network error interrupted playback.',
  3: 'This video could not be decoded.',
  4: 'This format is not supported by your browser.',
}

/**
 * Owns the media element: source loading (native or hls.js), playback commands, and
 * mirroring element state into the store. Everything here runs outside React.
 */
export class PlayerEngine {
  video: HTMLVideoElement | null = null
  private callbacks: EngineCallbacks = {}

  setCallbacks(callbacks: EngineCallbacks) {
    this.callbacks = callbacks
  }

  private hls: Hls | null = null
  private source: PlayerSource | null = null
  private loadId = 0
  private frame = 0
  private pendingSeek: number | null = null
  private lastReport = 0
  private detach: (() => void) | null = null

  private store: PlayerStore
  private time: MotionValue<number>
  private progressInterval: number

  constructor(store: PlayerStore, time: MotionValue<number>, progressInterval: number) {
    this.store = store
    this.time = time
    this.progressInterval = progressInterval
  }

  attach(video: HTMLVideoElement) {
    this.detach?.()
    this.video = video
    const { volume, muted, rate } = this.store.getState()
    video.volume = volume
    video.muted = muted
    video.playbackRate = rate

    const on = <K extends keyof HTMLVideoElementEventMap>(
      type: K,
      fn: (ev: HTMLVideoElementEventMap[K]) => void,
    ) => {
      video.addEventListener(type, fn)
      return () => video.removeEventListener(type, fn)
    }

    const offs = [
      on('loadedmetadata', () => {
        this.applyDuration()
        if (this.pendingSeek != null) {
          video.currentTime = this.pendingSeek
          this.pendingSeek = null
        }
      }),
      on('durationchange', () => this.applyDuration()),
      on('canplay', () => {
        if (this.store.getState().status === 'loading') {
          this.store.setState({ status: 'ready', waiting: false })
        }
      }),
      on('play', () => {
        this.store.setState({ paused: false, status: 'ready' })
        this.startFrame()
        this.report('play')
      }),
      on('playing', () => this.store.setState({ waiting: false })),
      on('pause', () => {
        this.store.setState({ paused: true })
        this.stopFrame()
        this.syncTime()
        if (this.store.getState().status !== 'ended') this.report('pause')
      }),
      on('waiting', () => {
        if (this.stalledAtEnd()) this.end()
        else this.store.setState({ waiting: true })
      }),
      on('stalled', () => {
        if (!video.paused) this.store.setState({ waiting: true })
      }),
      on('seeking', () => this.store.setState({ seeking: true })),
      on('seeked', () => {
        this.store.setState({ seeking: false })
        this.syncTime()
        this.report('seek')
      }),
      on('timeupdate', () => {
        if (video.paused) this.syncTime()
        const now = performance.now()
        if (!video.paused && now - this.lastReport >= this.progressInterval * 1000) {
          this.report('tick')
        }
      }),
      on('progress', () => this.syncBuffered()),
      on('volumechange', () => this.store.setState({ volume: video.volume, muted: video.muted })),
      on('ratechange', () => this.store.setState({ rate: video.playbackRate })),
      on('ended', () => this.end()),
      on('error', () => {
        if (this.hls) return
        const code = video.error?.code ?? 0
        this.fail(MEDIA_ERRORS[code] ?? 'Playback failed.')
      }),
      on('enterpictureinpicture', () => this.store.setState({ pip: true })),
      on('leavepictureinpicture', () => this.store.setState({ pip: false })),
    ]
    this.detach = () => {
      for (const off of offs) off()
    }
  }

  async load(source: PlayerSource) {
    const video = this.video
    if (!video) return
    const id = ++this.loadId
    this.source = source
    this.pendingSeek = source.startTime && source.startTime > 0 ? source.startTime : null
    this.lastReport = performance.now()
    this.stopFrame()
    this.destroyHls()

    this.store.setState({
      status: 'loading',
      error: null,
      waiting: true,
      seeking: false,
      buffered: [],
      duration: source.duration ?? 0,
      currentTime: Math.floor(source.startTime ?? 0),
      audioTrackId: source.audioTrackId,
      subtitleTrackId: source.subtitleTrackId,
      activeSegmentId: null,
    })
    this.time.set(source.startTime ?? 0)
    video.crossOrigin = source.crossOrigin ?? null

    if (source.protocol === 'hls' && !video.canPlayType('application/vnd.apple.mpegurl')) {
      const { default: Hls } = await import('hls.js')
      if (id !== this.loadId) return
      if (!Hls.isSupported()) {
        this.fail('HLS playback is not supported by this browser.')
        return
      }
      const hls = new Hls({
        // Transcodes are produced live; seeking past the buffer restarts the encode server-side.
        maxBufferLength: 30,
        maxMaxBufferLength: 120,
        startPosition: this.pendingSeek ?? -1,
      })
      this.pendingSeek = null
      this.hls = hls
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad()
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError()
        } else {
          this.fail('Streaming failed.')
        }
      })
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void video.play().catch(() => undefined)
      })
      hls.on(Hls.Events.MEDIA_ENDED, () => this.end())
      hls.loadSource(source.url)
      hls.attachMedia(video)
      return
    }

    video.src = source.url
    video.load()
    void video.play().catch(() => undefined)
  }

  /** Adopt track selections and metadata from a source whose media URL hasn't changed. */
  updateSource(source: PlayerSource) {
    if (!this.source) return
    this.source = source
    this.store.setState({
      audioTrackId: source.audioTrackId,
      subtitleTrackId: source.subtitleTrackId,
    })
  }

  unload() {
    if (this.video && this.source) this.report('unload')
    this.loadId += 1
    this.stopFrame()
    this.destroyHls()
    if (this.video) {
      this.video.removeAttribute('src')
      this.video.load()
    }
    this.source = null
  }

  destroy() {
    this.unload()
    this.detach?.()
    this.detach = null
    this.video = null
  }

  play() {
    const video = this.video
    if (!video) return
    if (this.store.getState().status === 'ended') video.currentTime = 0
    void video.play().catch(() => undefined)
  }

  pause() {
    this.video?.pause()
  }

  toggle() {
    if (!this.video) return
    if (this.video.paused) this.play()
    else this.pause()
  }

  seek(seconds: number) {
    const video = this.video
    if (!video) return
    const max = this.duration() || Number.POSITIVE_INFINITY
    const t = Math.min(Math.max(0, seconds), Math.max(0, max - 0.1))
    if (video.readyState === 0) {
      this.pendingSeek = t
    } else {
      video.currentTime = t
    }
    this.time.set(t)
    this.store.setState({ currentTime: Math.floor(t) })
  }

  seekBy(delta: number) {
    if (!this.video) return
    this.seek(this.time.get() + delta)
  }

  setVolume(volume: number) {
    if (!this.video) return
    const v = Math.min(1, Math.max(0, volume))
    this.video.volume = v
    if (v > 0) this.video.muted = false
    this.store.setState({ volume: v, muted: this.video.muted })
  }

  setMuted(muted: boolean) {
    if (this.video) this.video.muted = muted
  }

  toggleMuted() {
    if (this.video) this.video.muted = !this.video.muted
  }

  setRate(rate: number) {
    if (this.video) this.video.playbackRate = rate
  }

  snapshot(): PlaybackSnapshot {
    const s = this.store.getState()
    const unloaded = !this.video || this.video.readyState === 0
    return {
      time: unloaded && this.pendingSeek != null ? this.pendingSeek : this.time.get(),
      paused: s.paused,
      muted: s.muted,
      volume: s.volume,
      audioTrackId: s.audioTrackId,
      subtitleTrackId: s.subtitleTrackId,
    }
  }

  private end() {
    if (this.store.getState().status === 'ended') return
    this.stopFrame()
    this.syncTime()
    this.store.setState({ status: 'ended', paused: true, waiting: false, controlsVisible: true })
    this.video?.pause()
    this.callbacks.onEnded?.()
  }

  /**
   * Transcodes can run out of data slightly before the container's duration (the playlist
   * timing and the encoded tracks disagree), so the browser never fires `ended`.
   */
  private stalledAtEnd() {
    const video = this.video
    const runtime = this.source?.duration
    if (!video || !runtime || video.seeking || video.currentTime < runtime - 1) return false
    for (let i = 0; i < video.buffered.length; i++) {
      if (video.buffered.end(i) > video.currentTime + 0.25) return false
    }
    return true
  }

  private duration() {
    const d = this.video?.duration
    return d && Number.isFinite(d) ? d : this.store.getState().duration
  }

  private applyDuration() {
    const d = this.video?.duration
    if (d && Number.isFinite(d)) this.store.setState({ duration: d })
  }

  private syncTime() {
    const video = this.video
    if (!video || video.readyState === 0 || this.store.getState().scrubbing) return
    const t = video.currentTime
    this.time.set(t)
    const whole = Math.floor(t)
    if (whole !== this.store.getState().currentTime) this.store.setState({ currentTime: whole })
  }

  private syncBuffered() {
    const video = this.video
    if (!video) return
    const ranges: Array<readonly [number, number]> = []
    for (let i = 0; i < video.buffered.length; i++) {
      ranges.push([video.buffered.start(i), video.buffered.end(i)])
    }
    this.store.setState({ buffered: ranges })
  }

  private startFrame() {
    this.stopFrame()
    const step = () => {
      this.syncTime()
      this.frame = requestAnimationFrame(step)
    }
    this.frame = requestAnimationFrame(step)
  }

  private stopFrame() {
    if (this.frame) cancelAnimationFrame(this.frame)
    this.frame = 0
  }

  private report(reason: ProgressReason) {
    if (!this.source) return
    this.lastReport = performance.now()
    this.callbacks.onProgress?.(this.snapshot(), reason)
  }

  private fail(message: string) {
    this.stopFrame()
    this.store.setState({ status: 'error', error: message, waiting: false, paused: true })
    this.callbacks.onError?.(message)
  }

  private destroyHls() {
    this.hls?.destroy()
    this.hls = null
  }
}
