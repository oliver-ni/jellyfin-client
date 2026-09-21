import * as stylex from '@stylexjs/stylex'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowSquareOut, Check, Plus, Prohibit } from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import { useState } from 'react'
import { ListBox, ListBoxItem, type Selection } from 'react-aria-components'
import { Button } from '@/components/Button'
import { DetailHero } from '@/components/DetailHero'
import { Notice } from '@/components/Notice'
import { fadeUp, stagger } from '@/lib/motion'
import { useRequiredSession } from '@/lib/session'
import * as seerr from '@/seerr/api'
import { ConnectDialog } from '@/seerr/ConnectDialog'
import { AVAILABILITY_LABEL, MEDIA_TYPE_LABEL } from '@/seerr/labels'
import { invalidateTitle, seerrQueries, useSeerr } from '@/seerr/queries'
import { focus } from '@/theme/focus'
import { playPill } from '@/theme/media'
import { colors, motion, radii, sizes, space } from '@/theme/tokens.stylex'

/** A film or series that Seerr knows about, whether or not the library has it. */
export const Route = createFileRoute('/_app/request/$type/$tmdbId')({
  params: {
    parse: ({ type, tmdbId }): { type: seerr.MediaType; tmdbId: number } => {
      const id = Number(tmdbId)
      if ((type !== 'movie' && type !== 'tv') || !Number.isInteger(id)) throw notFound()
      return { type, tmdbId: id }
    },
    stringify: ({ type, tmdbId }) => ({ type, tmdbId: String(tmdbId) }),
  },
  loader: ({ context: { queryClient }, params }) =>
    queryClient.getQueryData(seerrQueries.me().queryKey)
      ? queryClient
          .ensureQueryData(seerrQueries.title(params.type, params.tmdbId))
          .catch(() => null)
      : null,
  component: RequestPage,
})

function RequestPage() {
  const { type, tmdbId } = Route.useParams()
  const state = useSeerr()
  const title = useQuery({ ...seerrQueries.title(type, tmdbId), enabled: state === 'signedIn' })

  if (state === undefined) return <div {...stylex.props(styles.heroSkeleton)} />
  if (state !== 'signedIn') return <Gate state={state} />
  if (title.isError) {
    return (
      <div {...stylex.props(styles.state)}>
        <Notice title="Couldn’t load this title" text="Seerr may be signed out or offline.">
          <Button onPress={() => void title.refetch()}>Try again</Button>
        </Notice>
      </div>
    )
  }
  if (!title.data) return <div {...stylex.props(styles.heroSkeleton)} />
  const t = title.data
  const open =
    t.type === 'movie' ? seerr.requestable(t.availability) : seerr.openSeasons(t).length > 0

  return (
    <article {...stylex.props(styles.page)}>
      <DetailHero
        backdrop={t.backdrop ? { url: t.backdrop } : null}
        tile={t.poster ? { url: t.poster } : null}
        title={t.name}
        tagline={t.tagline}
        meta={[
          MEDIA_TYPE_LABEL[t.type],
          t.year,
          t.type === 'movie'
            ? t.runtimeMinutes && `${t.runtimeMinutes} min`
            : `${t.seasons.length} ${t.seasons.length === 1 ? 'season' : 'seasons'}`,
        ]}
        rating={t.rating}
        genres={t.genres}
      >
        {t.type === 'movie' && open && <MovieAction title={t} />}
        {!open && <Status title={t} />}
        {t.jellyfinId && (
          <Link
            to="/items/$itemId"
            params={{ itemId: t.jellyfinId }}
            {...stylex.props(focus.ring, playPill.base, playPill.secondary)}
          >
            <ArrowSquareOut size={18} />
            Open in library
          </Link>
        )}
      </DetailHero>

      <m.div
        initial="hidden"
        animate="show"
        variants={stagger(0.03, 0.1)}
        {...stylex.props(styles.body)}
      >
        {t.overview && (
          <m.p variants={fadeUp} {...stylex.props(styles.overview)}>
            {t.overview}
          </m.p>
        )}
        {t.type === 'tv' && (
          <m.div variants={fadeUp}>
            <SeasonPicker title={t} />
          </m.div>
        )}
      </m.div>
    </article>
  )
}

/** What stands in for a title while this browser has no Seerr session to look it up with. */
function Gate({ state }: { state: 'unavailable' | 'signedOut' }) {
  const { userName } = useRequiredSession()
  const [connectOpen, setConnectOpen] = useState(false)
  return (
    <div {...stylex.props(styles.state)}>
      {state === 'unavailable' ? (
        <Notice
          title="Seerr isn’t available"
          text="Requests need a Seerr server connected to this client."
        />
      ) : (
        <Notice
          title="Connect Seerr to request titles"
          text="Sign in with your Jellyfin password to see whether this title is available and request it."
        >
          <Button variant="primary" onPress={() => setConnectOpen(true)}>
            Connect Seerr
          </Button>
          <ConnectDialog userName={userName} isOpen={connectOpen} onOpenChange={setConnectOpen} />
        </Notice>
      )}
    </div>
  )
}

/** Stays pending until the title has refetched, so the action can't be sent twice. */
function useRequest(title: seerr.Title) {
  return useMutation({
    mutationFn: (seasons: number[]) =>
      title.type === 'movie'
        ? seerr.requestMovie(title.tmdbId)
        : seerr.requestSeasons(title.tmdbId, seasons),
    onSuccess: () => invalidateTitle(title.type, title.tmdbId),
  })
}

function MovieAction({ title }: { title: seerr.MovieDetails }) {
  const request = useRequest(title)
  return (
    <div {...stylex.props(styles.actionGroup)}>
      <Button
        variant="primary"
        size="lg"
        style={styles.requestButton}
        isPending={request.isPending}
        onPress={() => request.mutate([])}
      >
        <Plus size={18} weight="bold" />
        {request.isPending ? 'Requesting…' : 'Request'}
      </Button>
      {request.isError && <span {...stylex.props(styles.error)}>{request.error.message}</span>}
    </div>
  )
}

/** Where a title with nothing left to request stands; the library link covers what's here. */
function Status({ title }: { title: seerr.Title }) {
  const label = AVAILABILITY_LABEL[title.availability]
  if (!label || (title.availability === 'available' && title.jellyfinId)) return null
  return (
    <span {...stylex.props(playPill.base, playPill.secondary)}>
      {title.availability === 'blocklisted' ? (
        <Prohibit size={16} weight="bold" />
      ) : (
        <Check size={16} weight="bold" />
      )}
      {label}
    </span>
  )
}

function SeasonPicker({ title }: { title: seerr.TvDetails }) {
  const request = useRequest(title)
  const open = seerr.openSeasons(title)
  const [selected, setSelected] = useState<Selection>(new Set(open.map((s) => s.number)))
  // Intersect with what is still requestable, so seasons just requested drop out of the selection.
  const chosen = open.filter((s) => selected === 'all' || selected.has(s.number))

  return (
    <section {...stylex.props(styles.seasons)}>
      <header {...stylex.props(styles.seasonsHeader)}>
        <h2 {...stylex.props(styles.heading)}>Seasons</h2>
        {open.length > 0 && (
          <div {...stylex.props(styles.actionGroup)}>
            {request.isError && (
              <span {...stylex.props(styles.error)}>{request.error.message}</span>
            )}
            <Button
              variant="primary"
              isDisabled={chosen.length === 0}
              isPending={request.isPending}
              onPress={() => request.mutate(chosen.map((s) => s.number))}
            >
              <Plus size={16} weight="bold" />
              {request.isPending
                ? 'Requesting…'
                : chosen.length === 1
                  ? `Request ${chosen[0]!.name.toLowerCase()}`
                  : chosen.length > 1
                    ? `Request ${chosen.length} seasons`
                    : 'Request'}
            </Button>
          </div>
        )}
      </header>
      <ListBox
        aria-label="Seasons to request"
        selectionMode="multiple"
        selectedKeys={new Set(chosen.map((s) => s.number))}
        onSelectionChange={setSelected}
        disabledKeys={title.seasons
          .filter((s) => !seerr.requestable(s.availability))
          .map((s) => s.number)}
        items={title.seasons}
        renderEmptyState={() => <Notice title="No seasons listed yet" />}
        {...stylex.props(styles.seasonList)}
      >
        {(s) => (
          <ListBoxItem id={s.number} textValue={s.name} {...stylex.props(styles.seasonRow)}>
            {({ isSelected, isDisabled }) => (
              <>
                <span
                  {...stylex.props(
                    styles.checkbox,
                    isSelected && styles.checkboxOn,
                    isDisabled && styles.checkboxOff,
                  )}
                >
                  {isSelected && <Check size={12} weight="bold" />}
                </span>
                <span {...stylex.props(styles.seasonName)}>{s.name}</span>
                <span {...stylex.props(styles.seasonMeta)}>
                  {[
                    `${s.episodeCount} ${s.episodeCount === 1 ? 'episode' : 'episodes'}`,
                    AVAILABILITY_LABEL[s.availability],
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </>
            )}
          </ListBoxItem>
        )}
      </ListBox>
    </section>
  )
}

const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxl,
    paddingBottom: space.xxxl,
  },
  heroSkeleton: {
    minHeight: 'clamp(460px, 72vh, 820px)',
    backgroundImage: `linear-gradient(to top, ${colors.bg}, ${colors.skeleton})`,
  },
  state: {
    paddingTop: sizes.navHeight,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxl,
    paddingInline: sizes.pageGutter,
    maxWidth: sizes.maxContent,
    marginInline: 'auto',
    width: '100%',
  },
  overview: {
    fontSize: 16,
    lineHeight: 1.6,
    color: colors.textMuted,
    maxWidth: 760,
    whiteSpace: 'pre-line',
  },
  requestButton: {
    height: 46,
    borderRadius: radii.full,
  },
  actionGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
  seasons: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    maxWidth: 760,
  },
  seasonsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    flexWrap: 'wrap',
  },
  heading: {
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
  seasonList: {
    display: 'flex',
    flexDirection: 'column',
    outline: 'none',
  },
  seasonRow: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: space.md,
    paddingBlock: space.md,
    paddingInline: space.md,
    marginInline: `calc(-1 * ${space.md})`,
    borderRadius: radii.md,
    outline: 'none',
    cursor: {
      default: 'pointer',
      '[data-disabled]': 'default',
    },
    color: {
      default: colors.text,
      '[data-disabled]': colors.textMuted,
    },
    backgroundColor: {
      default: 'transparent',
      '[data-hovered]': colors.surface,
      '[data-focus-visible]': colors.surface,
    },
    boxShadow: {
      default: 'none',
      '[data-focus-visible]': `0 0 0 2px ${colors.focusRing}`,
    },
    transitionProperty: 'background-color',
    transitionDuration: motion.fast,
  },
  checkbox: {
    display: 'grid',
    placeItems: 'center',
    width: 20,
    height: 20,
    borderRadius: radii.sm,
    boxShadow: `inset 0 0 0 1.5px ${colors.borderStrong}`,
    color: colors.accentText,
    transitionProperty: 'background-color, box-shadow',
    transitionDuration: motion.fast,
  },
  checkboxOn: {
    backgroundColor: colors.accent,
    boxShadow: `inset 0 0 0 1.5px ${colors.accent}`,
  },
  checkboxOff: {
    boxShadow: `inset 0 0 0 1.5px ${colors.border}`,
  },
  seasonName: {
    fontSize: 15,
    fontWeight: 500,
  },
  seasonMeta: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
  },
})
