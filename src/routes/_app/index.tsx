import * as stylex from '@stylexjs/stylex'
import { useQueries, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { HeroCarousel, type HeroSlide } from '@/components/HeroCarousel'
import { ItemCard, type CardShape } from '@/components/ItemCard'
import { Rail } from '@/components/Rail'
import { useRequiredSession } from '@/hooks/useSession'
import { homeQueries } from '@/lib/home-queries'
import { getSession } from '@/lib/session'
import { colors, radii, sizes, space } from '@/theme/tokens.stylex'

const POSTER_W = 150
const LANDSCAPE_W = 280

export const Route = createFileRoute('/_app/')({
  loader: async ({ context: { queryClient } }) => {
    const session = getSession()
    if (!session) return
    const { userId } = session
    void queryClient.prefetchQuery(homeQueries.resume(userId))
    void queryClient.prefetchQuery(homeQueries.nextUp(userId))
    const views = await queryClient.ensureQueryData(homeQueries.views(userId))
    for (const view of views.Items ?? []) {
      if (view.Id && isMediaLibrary(view)) {
        void queryClient.prefetchQuery(homeQueries.latest(userId, view.Id))
      }
    }
  },
  component: HomePage,
})

function isMediaLibrary(view: BaseItemDto) {
  return view.CollectionType === 'movies' || view.CollectionType === 'tvshows'
}

function HomePage() {
  const { userId } = useRequiredSession()
  const views = useQuery(homeQueries.views(userId))
  const resume = useQuery(homeQueries.resume(userId))
  const nextUp = useQuery(homeQueries.nextUp(userId))
  const libraries = views.data?.Items?.filter(isMediaLibrary) ?? []
  const latest = useQueries({
    queries: libraries.map((lib) => homeQueries.latest(userId, lib.Id ?? '')),
  })

  const slides =
    resume.isPending || nextUp.isPending
      ? []
      : heroSlides(resume.data?.Items, nextUp.data?.Items, latest)
  const heroPending = slides.length === 0 && [resume, nextUp, ...latest].some((q) => q.isPending)

  return (
    <div {...stylex.props(styles.page)}>
      {slides.length > 0 ? (
        <HeroCarousel slides={slides} />
      ) : (
        <div {...stylex.props(styles.heroPlaceholder, heroPending && styles.heroSkeleton)} />
      )}
      <div {...stylex.props(styles.rails)}>
        <MediaRail
          title="Continue watching"
          items={resume.data?.Items}
          loading={resume.isPending}
          shape="landscape"
          showProgress
        />
        <MediaRail
          title="Next up"
          items={nextUp.data?.Items}
          loading={nextUp.isPending}
          shape="landscape"
        />
        {libraries.map((lib, i) => (
          <MediaRail
            key={lib.Id}
            title={`Recently added in ${lib.Name}`}
            items={latest[i]?.data}
            loading={latest[i]?.isPending ?? true}
            shape="poster"
            linkTo="/library/$libraryId"
            linkParams={{ libraryId: lib.Id ?? '' }}
          />
        ))}
      </div>
    </div>
  )
}

const MAX_SLIDES = 5

/** What's in progress first, then what's next; recently added only when neither exists. */
function heroSlides(
  resume: BaseItemDto[] | null | undefined,
  nextUp: BaseItemDto[] | null | undefined,
  latest: { data?: BaseItemDto[] }[],
): HeroSlide[] {
  const slides: HeroSlide[] = []
  const shows = new Set<string>()
  const add = (items: BaseItemDto[] | null | undefined, eyebrow: string) => {
    for (const item of items ?? []) {
      if (slides.length === MAX_SLIDES) return
      const show = item.SeriesId ?? item.Id
      if (!show || shows.has(show)) continue
      shows.add(show)
      slides.push({ item, eyebrow })
    }
  }
  add(resume, 'Continue watching')
  add(nextUp, 'Next up')
  if (slides.length === 0) for (const q of latest) add(q.data, 'Recently added')
  return slides
}

interface MediaRailProps {
  title: string
  items: BaseItemDto[] | null | undefined
  loading: boolean
  shape: CardShape
  showProgress?: boolean
  linkTo?: '/library/$libraryId'
  linkParams?: { libraryId: string }
}

function MediaRail({
  title,
  items,
  loading,
  shape,
  showProgress,
  linkTo,
  linkParams,
}: MediaRailProps) {
  const width = shape === 'poster' ? POSTER_W : LANDSCAPE_W
  if (!loading && !items?.length) return null
  return (
    <Rail title={title} linkTo={linkTo} linkParams={linkParams}>
      {loading && !items
        ? Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              {...stylex.props(
                styles.skeleton,
                shape === 'poster' ? styles.skelPoster : styles.skelLandscape,
              )}
              style={{ width }}
            />
          ))
        : items?.map((item) => (
            <ItemCard
              key={item.Id}
              item={item}
              shape={shape}
              width={width}
              showProgress={showProgress}
            />
          ))}
    </Rail>
  )
}

const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    paddingBottom: space.xxxl,
  },
  heroPlaceholder: {
    height: sizes.navHeight,
  },
  heroSkeleton: {
    height: 'clamp(520px, 78vh, 860px)',
    backgroundImage: `linear-gradient(to top, ${colors.bg}, ${colors.skeleton})`,
  },
  rails: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxl,
    maxWidth: sizes.maxContent,
    marginInline: 'auto',
    width: '100%',
    marginTop: `calc(-1 * ${space.lg})`,
  },
  skeleton: {
    flexShrink: 0,
    borderRadius: radii.xs,
    backgroundColor: colors.skeleton,
  },
  skelPoster: { aspectRatio: '2 / 3' },
  skelLandscape: { aspectRatio: '16 / 9' },
})
