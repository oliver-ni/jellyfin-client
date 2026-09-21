import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { Check, Heart, Play, Star } from 'lucide-react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { useUserDataToggles } from '@/hooks/useUserDataToggles'
import { episodeCode, formatRuntime, remainingMinutes } from '@/lib/format'
import { backdropImage, logoImage } from '@/lib/images'
import { colors, motion, radii, sizes, space } from '@/theme/tokens.stylex'
import { BlurImage } from './BlurImage'
import { IconToggle } from './IconButton'

export interface DetailHeroProps {
  item: BaseItemDto
  userId: string
}

interface Crumb {
  id: string
  label: string
}

function crumbs(item: BaseItemDto): Crumb[] {
  const out: Crumb[] = []
  if ((item.Type === 'Season' || item.Type === 'Episode') && item.SeriesId && item.SeriesName) {
    out.push({ id: item.SeriesId, label: item.SeriesName })
  }
  if (item.Type === 'Episode' && item.SeasonId && item.SeasonName) {
    out.push({ id: item.SeasonId, label: item.SeasonName })
  }
  return out
}

function kindLabel(item: BaseItemDto): string | null {
  switch (item.Type) {
    case 'Movie':
      return 'Film'
    case 'Series':
      return 'Series'
    case 'Season':
      return 'Season'
    case 'Episode':
      return episodeCode(item)
    default:
      return null
  }
}

export function DetailHero({ item, userId }: DetailHeroProps) {
  const backdrop = backdropImage(item, 1920)
  const useLogo = item.Type === 'Movie' || item.Type === 'Series'
  const logo = useLogo ? logoImage(item, 800) : null
  const remaining = remainingMinutes(item)
  const itemId = item.Id ?? ''
  const toggles = useUserDataToggles(userId, item)
  const trail = crumbs(item)

  const years =
    item.Type === 'Series' && item.ProductionYear
      ? item.Status === 'Continuing'
        ? `${item.ProductionYear}–`
        : item.EndDate && new Date(item.EndDate).getFullYear() !== item.ProductionYear
          ? `${item.ProductionYear}–${new Date(item.EndDate).getFullYear()}`
          : String(item.ProductionYear)
      : item.ProductionYear

  const meta: React.ReactNode[] = [
    kindLabel(item),
    years,
    item.OfficialRating,
    item.Type === 'Series'
      ? item.ChildCount
        ? `${item.ChildCount} ${item.ChildCount === 1 ? 'season' : 'seasons'}`
        : null
      : item.Type === 'Season'
        ? item.ChildCount
          ? `${item.ChildCount} episodes`
          : null
        : formatRuntime(item.RunTimeTicks),
    item.CommunityRating ? (
      <span key="rating" {...stylex.props(styles.rating)}>
        <Star size={12} fill="currentColor" />
        {item.CommunityRating.toFixed(1)}
      </span>
    ) : null,
  ].filter(Boolean)

  const canPlay =
    item.Type === 'Movie' ||
    item.Type === 'Episode' ||
    item.Type === 'Series' ||
    item.Type === 'Season'

  return (
    <section {...stylex.props(styles.hero)}>
      <div {...stylex.props(styles.art)}>
        <BlurImage
          src={backdrop?.url}
          blurhash={backdrop?.blurhash}
          alt=""
          loading="eager"
          fetchPriority="high"
          style={styles.image}
        />
        <div {...stylex.props(styles.fadeBottom)} />
        <div {...stylex.props(styles.fadeLeft)} />
      </div>

      <div {...stylex.props(styles.content)}>
        {trail.length > 0 && (
          <nav {...stylex.props(styles.trail)} aria-label="Breadcrumb">
            {trail.map((c, i) => (
              <span key={c.id} {...stylex.props(styles.trailItem)}>
                {i > 0 && <span {...stylex.props(styles.trailSep)}>/</span>}
                <Link
                  to="/items/$itemId"
                  params={{ itemId: c.id }}
                  {...stylex.props(styles.trailLink)}
                >
                  {c.label}
                </Link>
              </span>
            ))}
          </nav>
        )}
        {logo ? (
          <img src={logo} alt={item.Name ?? ''} {...stylex.props(styles.logo)} draggable={false} />
        ) : (
          <h1 {...stylex.props(styles.title)}>{item.Name}</h1>
        )}
        {item.Taglines?.[0] && <p {...stylex.props(styles.tagline)}>{item.Taglines[0]}</p>}
        {meta.length > 0 && (
          <p {...stylex.props(styles.meta)}>
            {meta.map((m, i) => (
              <span key={i} {...stylex.props(styles.metaItem)}>
                {i > 0 && <span {...stylex.props(styles.dot)}>·</span>}
                {m}
              </span>
            ))}
          </p>
        )}
        {item.Genres && item.Genres.length > 0 && (
          <p {...stylex.props(styles.genres)}>{item.Genres.slice(0, 4).join(', ')}</p>
        )}
        <div {...stylex.props(styles.actions)}>
          {canPlay && (
            <Link to="/play/$itemId" params={{ itemId }} {...stylex.props(styles.play)}>
              <Play size={18} fill="currentColor" />
              {remaining ? `Resume · ${remaining} min left` : 'Play'}
            </Link>
          )}
          <IconToggle
            onMedia
            aria-label={toggles.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            isSelected={toggles.isFavorite}
            onChange={toggles.toggleFavorite}
          >
            <Heart size={18} fill={toggles.isFavorite ? 'currentColor' : 'none'} />
          </IconToggle>
          <IconToggle
            onMedia
            aria-label={toggles.isPlayed ? 'Mark as unwatched' : 'Mark as watched'}
            isSelected={toggles.isPlayed}
            onChange={toggles.togglePlayed}
          >
            <Check size={18} strokeWidth={2.5} />
          </IconToggle>
        </div>
      </div>
    </section>
  )
}

const styles = stylex.create({
  hero: {
    position: 'relative',
    width: '100%',
    minHeight: 'clamp(460px, 72vh, 820px)',
    display: 'flex',
    alignItems: 'flex-end',
  },
  art: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  },
  fadeBottom: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `linear-gradient(to top, ${colors.bg} 0%, ${colors.bg} 6%, transparent 60%)`,
  },
  fadeLeft: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `linear-gradient(to right, ${colors.scrim} 0%, transparent 70%)`,
  },
  content: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: space.md,
    width: '100%',
    maxWidth: 720,
    paddingInline: {
      default: sizes.pageGutter,
      '@media (max-width: 720px)': sizes.pageGutterMobile,
    },
    paddingTop: `calc(${sizes.navHeight} + ${space.xxxl})`,
    paddingBottom: space.xl,
  },
  trail: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: colors.heroTextMuted,
  },
  trailItem: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  trailSep: {
    marginInline: space.sm,
    opacity: 0.5,
  },
  trailLink: {
    color: {
      default: colors.heroTextMuted,
      ':hover': colors.heroText,
    },
    borderRadius: radii.xs,
    transitionProperty: 'color',
    transitionDuration: motion.fast,
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 3,
  },
  logo: {
    maxWidth: 'min(460px, 75%)',
    maxHeight: 180,
    objectFit: 'contain',
    objectPosition: 'left bottom',
    filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.5))',
  },
  title: {
    fontSize: 'clamp(34px, 4.5vw, 64px)',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    lineHeight: 1.02,
    color: colors.heroText,
    textWrap: 'balance',
  },
  tagline: {
    fontSize: 17,
    fontStyle: 'italic',
    color: colors.heroTextMuted,
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    fontSize: 14,
    fontWeight: 500,
    color: colors.heroTextMuted,
  },
  metaItem: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  rating: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xs,
  },
  dot: {
    marginInline: space.sm,
    opacity: 0.5,
  },
  genres: {
    fontSize: 14,
    color: colors.heroTextMuted,
    marginTop: `calc(-1 * ${space.sm})`,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.sm,
  },
  play: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.sm,
    height: 46,
    paddingInline: space.xl,
    borderRadius: radii.full,
    fontSize: 15,
    fontWeight: 600,
    color: colors.accentText,
    backgroundColor: {
      default: colors.accent,
      ':hover': colors.accentHover,
    },
    transitionProperty: 'background-color, transform',
    transitionDuration: motion.fast,
    transitionTimingFunction: motion.ease,
    transform: {
      default: 'none',
      ':active': 'scale(0.98)',
    },
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 3,
  },
})
