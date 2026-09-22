import * as stylex from '@stylexjs/stylex'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, notFound, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { titleHead } from '@/brand'
import { episodeCode } from '@/lib/format'
import { idFromHandle } from '@/lib/handle'
import { itemLink, playLink } from '@/lib/item-link'
import { invalidateUserData, queries } from '@/lib/queries'
import {
  AUTO_QUALITY,
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
import { getSession, requireSession, useRequiredSession } from '@/lib/session'
import { Player, type PlaybackSnapshot, type PlayerSource, type ProgressReason } from '@/player'
import { fonts } from '@/theme/tokens.stylex'

export const Route = createFileRoute('/play/$title')({
  beforeLoad: requireSession,
  // A series has no stream of its own; play its next-up episode instead.
  loader: async ({ context: { queryClient }, params }) => {
    const id = idFromHandle(params.title)
    if (!id) throw notFound()
    const session = getSession()
    if (!session) return { id, name: null }
    const item = await queryClient
      .ensureQueryData(queries.item(session.userId, id))
      .catch(() => null)
    if (item?.Type !== 'Series') return { id, name: item?.SeriesName ?? item?.Name ?? null }
    const episode = await seriesStartEpisode(session.userId, id).catch(() => null)
    if (episode) throw redirect({ ...playLink(episode), replace: true })
    return { id, name: item.Name ?? null }
  },
  head: ({ loaderData }) => titleHead(loaderData?.name),
  component: PlayPage,
})

function PlayPage() {
  const { id } = Route.useLoaderData()
  const { userId } = useRequiredSession()
  // The resume position must come from the server now, not from a cached card.
  const item = useQuery({ ...queries.item(userId, id), staleTime: 0 })
  const back = useBack(item.data)

  if (item.isError) {
    return <Fallback message="This title could not be loaded." onBack={back} />
  }
  if (!item.data || !item.isFetchedAfterMount) return <Fallback />
  return <ItemPlayer key={id} item={item.data} userId={userId} onBack={back} />
}

/** Leaves the player: back in history, or to the title's page when this tab opened on it. */
function useBack(item: BaseItemDto | undefined) {
  const router = useRouter()
  const navigate = useNavigate()
  return useCallback(() => {
    if (router.history.canGoBack()) router.history.back()
    else void navigate({ ...(item ? itemLink(item) : { to: '/' }), replace: true })
  }, [router, navigate, item])
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
  // The previous session keeps playing until the new one is ready.
  const negotiation = useQuery({
    ...playbackQueries.session(itemId, mediaSourceId, userId, selection),
    placeholderData: keepPreviousData,
  })
  const session = negotiation.data ?? null
  const error = negotiation.error?.message ?? null

  const source = useMemo<PlayerSource | null>(() => {
    if (!session) return null
    if (subtitleId === undefined) return session.source
    return { ...session.source, subtitleTrackId: subtitleId }
  }, [session, subtitleId])

  const onProgress = usePlaybackReporting(session, itemId)

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
      const tracks = source?.subtitleTracks ?? []
      const kindOf = (trackId: string | null) => tracks.find((t) => t.id === trackId)?.kind
      // Burned-in tracks (and leaving one) need the server to start a new stream.
      if (kindOf(id) === 'source' || kindOf(snap.subtitleTrackId) === 'source') {
        renegotiate({ subtitleIndex: id !== null ? Number(id) : -1 }, snap)
      } else {
        setSubtitleId(id)
      }
    },
    [renegotiate, source],
  )

  const next = useMemo(() => toNextItem(nextEpisode.data), [nextEpisode.data])
  const onNext = useCallback(() => {
    const episode = nextEpisode.data
    if (episode) void navigate({ ...playLink(episode), replace: true })
  }, [navigate, nextEpisode.data])

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

/**
 * Reports start / progress / stop for whichever session is current, including a final stop when
 * the tab closes (which skips React cleanup). Refs, so the player's callback identity is stable.
 */
function usePlaybackReporting(session: PlaybackSession | null, itemId: string) {
  const queryClient = useQueryClient()
  const sessionRef = useRef(session)
  const startedFor = useRef<string | null>(null)
  const lastSnapshot = useRef<PlaybackSnapshot | null>(null)
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const stop = useCallback(
    (s: PlaybackSession, snap: PlaybackSnapshot) => {
      if (startedFor.current !== s.playSessionId) return
      startedFor.current = null
      void reportStopped(s, itemId, snap).then(() => invalidateUserData(queryClient))
    },
    [itemId, queryClient],
  )

  useEffect(() => {
    const flush = () => {
      if (sessionRef.current && lastSnapshot.current) stop(sessionRef.current, lastSnapshot.current)
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [stop])

  return useCallback(
    (snap: PlaybackSnapshot, reason: ProgressReason) => {
      const s = sessionRef.current
      if (!s) return
      lastSnapshot.current = snap
      if (reason === 'unload') stop(s, snap)
      else if (startedFor.current !== s.playSessionId) {
        startedFor.current = s.playSessionId
        void reportStart(s, itemId, snap)
      } else void reportProgress(s, itemId, snap)
    },
    [itemId, stop],
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
