import * as stylex from '@stylexjs/stylex'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { episodeCode } from '@/lib/format'
import { queries } from '@/lib/queries'
import {
  AUTO_QUALITY,
  negotiatePlayback,
  playbackQueries,
  reportProgress,
  reportStart,
  reportStopped,
  seriesStartEpisode,
  ticksToSeconds,
  toNextItem,
  toSegments,
  trickplayThumbnailer,
  type PlaybackSelection,
  type PlaybackSession,
} from '@/lib/playback'
import { getSession, useRequiredSession } from '@/lib/session'
import { Player, type PlaybackSnapshot, type PlayerSource, type ProgressReason } from '@/player'
import { fonts } from '@/theme/tokens.stylex'

export const Route = createFileRoute('/play/$itemId')({
  beforeLoad: ({ location }) => {
    if (!getSession()) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  // A series has no stream of its own; play its next-up episode instead.
  loader: async ({ context: { queryClient }, params }) => {
    const session = getSession()
    if (!session) return
    const item = await queryClient
      .ensureQueryData(queries.item(session.userId, params.itemId))
      .catch(() => null)
    if (item?.Type !== 'Series') return
    const episode = await seriesStartEpisode(session.userId, params.itemId).catch(() => null)
    if (episode?.Id) {
      throw redirect({ to: '/play/$itemId', params: { itemId: episode.Id }, replace: true })
    }
  },
  component: PlayPage,
})

function PlayPage() {
  const { itemId } = Route.useParams()
  const { userId } = useRequiredSession()
  // The resume position must come from the server now, not from a cached card.
  const item = useQuery({ ...queries.item(userId, itemId), staleTime: 0 })
  const back = useBack(itemId)

  if (item.isError) {
    return <Fallback message="This title could not be loaded." onBack={back} />
  }
  if (!item.data || !item.isFetchedAfterMount) return <Fallback />
  return <ItemPlayer key={itemId} item={item.data} userId={userId} onBack={back} />
}

function useBack(itemId: string) {
  const router = useRouter()
  const navigate = useNavigate()
  return useCallback(() => {
    if (router.history.canGoBack()) router.history.back()
    else void navigate({ to: '/items/$itemId', params: { itemId }, replace: true })
  }, [router, navigate, itemId])
}

interface ItemPlayerProps {
  item: BaseItemDto
  userId: string
  onBack: () => void
}

function ItemPlayer({ item, userId, onBack }: ItemPlayerProps) {
  const itemId = item.Id ?? ''
  const mediaSourceId = item.MediaSources?.[0]?.Id ?? undefined
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const segments = useQuery(playbackQueries.segments(itemId))
  const nextEpisode = useQuery({
    ...playbackQueries.nextEpisode(userId, item),
    enabled: Boolean(item.SeriesId),
  })

  // Server-side selection: changing any of these opens a new play session.
  const [selection, setSelection] = useState<PlaybackSelection>(() => ({
    audioIndex: null,
    subtitleIndex: null,
    qualityId: AUTO_QUALITY,
    startTime: ticksToSeconds(item.UserData?.PlaybackPositionTicks),
  }))
  // Client-rendered subtitle choice; `undefined` defers to the server's default.
  const [subtitleId, setSubtitleId] = useState<string | null | undefined>(undefined)
  const [session, setSession] = useState<PlaybackSession | null>(null)
  const [failure, setFailure] = useState<{ selection: PlaybackSelection; message: string } | null>(
    null,
  )
  const error = failure?.selection === selection ? failure.message : null

  useEffect(() => {
    const controller = new AbortController()
    negotiatePlayback(itemId, mediaSourceId, userId, selection, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setSession(next)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const message = err instanceof Error ? err.message : 'Playback could not be started.'
        setFailure({ selection, message })
      })
    return () => controller.abort()
  }, [itemId, mediaSourceId, userId, selection])

  const source = useMemo<PlayerSource | null>(() => {
    if (!session) return null
    if (subtitleId === undefined) return session.source
    return { ...session.source, subtitleTrackId: subtitleId }
  }, [session, subtitleId])

  // Reporting reads the session through a ref so unload of the previous session reports correctly.
  const sessionRef = useRef<PlaybackSession | null>(null)
  const startedFor = useRef<string | null>(null)
  const lastSnapshot = useRef<PlaybackSnapshot | null>(null)
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const onProgress = useCallback(
    (snap: PlaybackSnapshot, reason: ProgressReason) => {
      const s = sessionRef.current
      if (!s) return
      lastSnapshot.current = snap
      if (reason === 'unload') {
        if (startedFor.current === s.playSessionId) {
          startedFor.current = null
          void reportStopped(s, itemId, snap).then(() => queryClient.invalidateQueries())
        }
        return
      }
      if (startedFor.current !== s.playSessionId) {
        startedFor.current = s.playSessionId
        void reportStart(s, itemId, snap)
        return
      }
      void reportProgress(s, itemId, snap)
    },
    [itemId, queryClient],
  )

  // Closing the tab skips React cleanup; flush a final stop so the position sticks.
  useEffect(() => {
    const flush = () => {
      const s = sessionRef.current
      const snap = lastSnapshot.current
      if (s && snap && startedFor.current === s.playSessionId) {
        startedFor.current = null
        void reportStopped(s, itemId, snap)
      }
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [itemId])

  const renegotiate = useCallback((patch: Partial<PlaybackSelection>, snap: PlaybackSnapshot) => {
    setSubtitleId(undefined)
    setSelection((prev) => ({
      ...prev,
      subtitleIndex: snap.subtitleTrackId !== null ? Number(snap.subtitleTrackId) : -1,
      ...patch,
      startTime: snap.time,
    }))
  }, [])

  const onAudioChange = useCallback(
    (id: string, snap: PlaybackSnapshot) => renegotiate({ audioIndex: Number(id) }, snap),
    [renegotiate],
  )
  const onQualityChange = useCallback(
    (id: string, snap: PlaybackSnapshot) => renegotiate({ qualityId: id }, snap),
    [renegotiate],
  )
  const onSubtitleChange = useCallback(
    (id: string | null, snap: PlaybackSnapshot) => {
      const tracks = sessionRef.current?.source.subtitleTracks ?? []
      const kindOf = (trackId: string | null) => tracks.find((t) => t.id === trackId)?.kind
      // Burned-in tracks (and leaving one) need the server to start a new stream.
      if (kindOf(id) === 'source' || kindOf(snap.subtitleTrackId) === 'source') {
        renegotiate({ subtitleIndex: id !== null ? Number(id) : -1 }, snap)
      } else {
        setSubtitleId(id)
      }
    },
    [renegotiate],
  )

  const next = useMemo(() => toNextItem(nextEpisode.data), [nextEpisode.data])
  const onNext = useCallback(() => {
    const id = nextEpisode.data?.Id
    if (id) void navigate({ to: '/play/$itemId', params: { itemId: id }, replace: true })
  }, [navigate, nextEpisode.data?.Id])

  const playerSegments = useMemo(
    () => toSegments(segments.data ?? [], source?.duration, Boolean(next)),
    [segments.data, source?.duration, next],
  )
  const thumbnailAt = useMemo(
    () => (session ? trickplayThumbnailer(item, session.mediaSourceId) : undefined),
    [item, session],
  )

  if (error) return <Fallback message={error} onBack={onBack} />
  if (!source) return <Fallback />

  const isEpisode = item.Type === 'Episode'
  const title = isEpisode ? item.SeriesName : item.Name
  const subtitle = isEpisode
    ? [episodeCode(item), item.Name].filter(Boolean).join(' · ')
    : item.ProductionYear
      ? String(item.ProductionYear)
      : undefined

  return (
    <div {...stylex.props(styles.page)}>
      <Player
        source={source}
        title={title}
        subtitle={subtitle}
        segments={playerSegments}
        next={next}
        thumbnailAt={thumbnailAt}
        onBack={onBack}
        onNext={next ? onNext : undefined}
        onAudioChange={onAudioChange}
        onSubtitleChange={onSubtitleChange}
        onQualityChange={onQualityChange}
        onProgress={onProgress}
        style={styles.player}
      />
    </div>
  )
}

interface FallbackProps {
  message?: string
  onBack?: () => void
}

function Fallback({ message, onBack }: FallbackProps) {
  return (
    <div {...stylex.props(styles.page, styles.center)}>
      {message && (
        <>
          <p {...stylex.props(styles.message)}>{message}</p>
          {onBack && (
            <button type="button" onClick={onBack} {...stylex.props(styles.backButton)}>
              Go back
            </button>
          )}
        </>
      )}
    </div>
  )
}

const styles = stylex.create({
  page: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#000',
    color: '#fff',
  },
  player: {
    fontFamily: fonts.sans,
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    fontFamily: fonts.sans,
  },
  message: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
  },
  backButton: {
    appearance: 'none',
    borderWidth: 0,
    borderRadius: 999,
    paddingBlock: 10,
    paddingInline: 20,
    fontSize: 14,
    fontWeight: 600,
    color: '#0a0a0c',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
})
