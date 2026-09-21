import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { Hero } from '@/components/Hero'
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

  const hero = pickHero(resume.data?.Items, nextUp.data?.Items)
  const heroPending = !hero && (resume.isPending || nextUp.isPending)

  return (
    <div {...stylex.props(styles.page)}>
      {hero ? (
        <Hero item={hero.item} eyebrow={hero.eyebrow} />
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
        {libraries.map((lib) => (
          <LatestRail key={lib.Id} library={lib} userId={userId} />
        ))}
      </div>
    </div>
  )
}

function pickHero(
  resume: BaseItemDto[] | null | undefined,
  nextUp: BaseItemDto[] | null | undefined,
): { item: BaseItemDto; eyebrow: string } | null {
  if (resume?.[0]) return { item: resume[0], eyebrow: 'Continue watching' }
  if (nextUp?.[0]) return { item: nextUp[0], eyebrow: 'Next up' }
  return null
}

function LatestRail({ library, userId }: { library: BaseItemDto; userId: string }) {
  const latest = useQuery(homeQueries.latest(userId, library.Id ?? ''))
  return (
    <MediaRail
      title={`Recently added in ${library.Name}`}
      items={latest.data}
      loading={latest.isPending}
      shape="poster"
      linkTo="/library/$libraryId"
      linkParams={{ libraryId: library.Id ?? '' }}
    />
  )
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
