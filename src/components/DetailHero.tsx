import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { Check, Heart, Play, Star } from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import { useRef } from 'react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { useMorphHandoff, useMorphTarget } from '@/hooks/useMorphTarget'
import { useUserDataToggles } from '@/hooks/useUserDataToggles'
import { formatRuntime, itemKindLabel, remainingMinutes } from '@/lib/format'
import { backdropImage, itemImage, logoImage } from '@/lib/images'
import { fadeUp, pop, stagger } from '@/lib/motion'
import { focus } from '@/theme/focus'
import { media, playPill } from '@/theme/media'
import { colors, radii, shadows, sizes, space } from '@/theme/tokens.stylex'
import { BlurImage } from './BlurImage'
import { Facts } from './Facts'
import { IconToggle } from './IconButton'

const TILE_W = 190

export interface DetailHeroProps {
  item: BaseItemDto
  userId: string
}

export function DetailHero({ item, userId }: DetailHeroProps) {
  const backdrop = backdropImage(item, 1920)
  const logo = logoImage(item, 800)
  const remaining = remainingMinutes(item)
  const itemId = item.Id ?? ''
  const toggles = useUserDataToggles(userId, item)

  const tile = itemImage(item, 'Primary', TILE_W * 2)
  const tileRef = useRef<HTMLDivElement>(null)
  const morph = useMorphTarget(itemId, 'poster', tileRef)
  useMorphHandoff(tileRef, itemId, 'poster', tile?.url)

  const years =
    item.Type === 'Series' && item.ProductionYear
      ? item.Status === 'Continuing'
        ? `${item.ProductionYear}–`
        : item.EndDate && new Date(item.EndDate).getFullYear() !== item.ProductionYear
          ? `${item.ProductionYear}–${new Date(item.EndDate).getFullYear()}`
          : String(item.ProductionYear)
      : item.ProductionYear

  const meta = [
    itemKindLabel(item),
    years,
    item.OfficialRating,
    item.Type === 'Series'
      ? item.ChildCount
        ? `${item.ChildCount} ${item.ChildCount === 1 ? 'season' : 'seasons'}`
        : null
      : formatRuntime(item.RunTimeTicks),
    item.CommunityRating ? (
      <span key="rating" {...stylex.props(styles.rating)}>
        <Star size={12} weight="fill" />
        {item.CommunityRating.toFixed(1)}
      </span>
    ) : null,
  ]

  const canPlay = item.Type === 'Movie' || item.Type === 'Series'

  return (
    <section {...stylex.props(styles.hero)}>
      <div {...stylex.props(styles.art)}>
        <BlurImage
          src={backdrop?.url}
          blurhash={backdrop?.blurhash}
          alt=""
          loading="eager"
          fetchPriority="high"
          style={media.fill}
        />
        <div {...stylex.props(styles.fadeBottom)} />
        <div {...stylex.props(styles.fadeLeft)} />
      </div>

      <div {...stylex.props(styles.content)}>
        {tile && (
          <m.div
            ref={tileRef}
            data-morph={itemId}
            variants={pop}
            initial={morph.source ? false : 'hidden'}
            animate="show"
            style={{ opacity: morph.opacity }}
            {...stylex.props(styles.tile)}
          >
            <BlurImage
              src={tile.url}
              placeholderSrc={morph.source?.src}
              blurhash={tile.blurhash}
              alt=""
              loading="eager"
              style={media.fill}
            />
          </m.div>
        )}
        <m.div initial="hidden" animate="show" variants={stagger()} {...stylex.props(styles.text)}>
          {logo ? (
            <m.img
              variants={fadeUp}
              src={logo}
              alt={item.Name ?? ''}
              {...stylex.props(styles.logo)}
              draggable={false}
            />
          ) : (
            <m.h1 variants={fadeUp} {...stylex.props(styles.title)}>
              {item.Name}
            </m.h1>
          )}
          {item.Taglines?.[0] && (
            <m.p variants={fadeUp} {...stylex.props(styles.tagline)}>
              {item.Taglines[0]}
            </m.p>
          )}
          <Facts items={meta} variants={fadeUp} style={styles.meta} />
          {item.Genres && item.Genres.length > 0 && (
            <m.p variants={fadeUp} {...stylex.props(styles.genres)}>
              {item.Genres.slice(0, 4).join(', ')}
            </m.p>
          )}
          <m.div variants={fadeUp} {...stylex.props(styles.actions)}>
            {canPlay && (
              <Link
                to="/play/$itemId"
                params={{ itemId }}
                {...stylex.props(focus.ring, playPill.base)}
              >
                <Play size={18} weight="fill" />
                {remaining ? `Resume · ${remaining} min left` : 'Play'}
              </Link>
            )}
            <IconToggle
              onMedia
              aria-label={toggles.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              isSelected={toggles.isFavorite}
              onChange={toggles.toggleFavorite}
            >
              <Heart size={18} weight={toggles.isFavorite ? 'fill' : 'regular'} />
            </IconToggle>
            <IconToggle
              onMedia
              aria-label={toggles.isPlayed ? 'Mark as unwatched' : 'Mark as watched'}
              isSelected={toggles.isPlayed}
              onChange={toggles.togglePlayed}
            >
              <Check size={18} weight="bold" />
            </IconToggle>
          </m.div>
        </m.div>
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
  fadeBottom: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `linear-gradient(to top, ${colors.bg} 0%, ${colors.bg} 6%, ${colors.scrim} 40%, transparent 75%)`,
  },
  fadeLeft: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `linear-gradient(to right, ${colors.scrim} 0%, ${colors.scrim} 30%, transparent 75%)`,
  },
  content: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-end',
    gap: space.xl,
    width: '100%',
    maxWidth: 1040,
    paddingInline: sizes.pageGutter,
    paddingTop: `calc(${sizes.navHeight} + ${space.xxxl})`,
    paddingBottom: space.xl,
  },
  tile: {
    position: 'relative',
    flexShrink: 0,
    display: {
      default: 'block',
      '@media (max-width: 720px)': 'none',
    },
    borderRadius: radii.xs,
    overflow: 'hidden',
    boxShadow: shadows.cardHover,
    width: TILE_W,
    aspectRatio: '2 / 3',
  },
  text: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: space.md,
    minWidth: 0,
    maxWidth: 720,
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
    fontSize: 14,
    fontWeight: 500,
    color: colors.heroTextMuted,
  },
  rating: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xs,
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
})
