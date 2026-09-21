import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { Check, Heart, Play, Star } from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { useUserDataToggles } from '@/hooks/useUserDataToggles'
import { formatRuntime, itemKindLabel, remainingMinutes } from '@/lib/format'
import { backdropImage, itemImage, logoImage } from '@/lib/images'
import {
  concealMorphOrigin,
  fadeUp,
  offerMorphSource,
  playMorph,
  pop,
  rectOf,
  stagger,
  takeMorphSource,
} from '@/lib/motion'
import { focus } from '@/theme/focus'
import { colors, motion, radii, shadows, sizes, space } from '@/theme/tokens.stylex'
import { BlurImage } from './BlurImage'
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

  const tile = itemImage(item, 'Primary', { width: TILE_W * 2 })
  // Consumed once on mount: the card that navigated here, if it was a poster.
  const [morph] = useState(() => takeMorphSource(itemId, 'poster'))
  const tileRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = tileRef.current
    if (!morph || !el) return
    // Match the scroll reset the router is about to do so the measurement is final.
    window.scrollTo(0, 0)
    concealMorphOrigin(morph)
    const controls = playMorph(el, morph.rect, rectOf(el))
    return () => controls.stop()
  }, [morph])
  // On the way out, offer the tile to whichever card the next page shows for this item.
  const tileSrc = tile?.url ?? null
  const handBack = useRef({ itemId, src: tileSrc })
  useEffect(() => {
    handBack.current = { itemId, src: tileSrc }
  }, [itemId, tileSrc])
  useLayoutEffect(() => {
    const el = tileRef.current
    return () => {
      const { itemId, src } = handBack.current
      if (el?.isConnected && itemId) offerMorphSource(el, { itemId, shape: 'poster', src })
    }
  }, [])
  // While morphing, sit above the outgoing page's fading ghost instead of under it.
  const [elevated, setElevated] = useState(morph !== null)
  useEffect(() => {
    if (!elevated) return
    const t = setTimeout(() => setElevated(false), 400)
    return () => clearTimeout(t)
  }, [elevated])

  const years =
    item.Type === 'Series' && item.ProductionYear
      ? item.Status === 'Continuing'
        ? `${item.ProductionYear}–`
        : item.EndDate && new Date(item.EndDate).getFullYear() !== item.ProductionYear
          ? `${item.ProductionYear}–${new Date(item.EndDate).getFullYear()}`
          : String(item.ProductionYear)
      : item.ProductionYear

  const meta: React.ReactNode[] = [
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
  ].filter(Boolean)

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
          style={styles.image}
        />
        <div {...stylex.props(styles.fadeBottom)} />
        <div {...stylex.props(styles.fadeLeft)} />
      </div>

      <div {...stylex.props(styles.content)}>
        {tile && (
          <m.div
            ref={tileRef}
            data-morph={itemId}
            initial={morph ? false : 'hidden'}
            animate={morph ? undefined : 'show'}
            variants={morph ? undefined : pop}
            style={{ zIndex: elevated ? 45 : undefined }}
            {...stylex.props(styles.tile)}
          >
            <BlurImage
              src={tile.url}
              placeholderSrc={morph?.src}
              blurhash={tile.blurhash}
              alt=""
              loading="eager"
              style={styles.tileImage}
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
          {meta.length > 0 && (
            <m.p variants={fadeUp} {...stylex.props(styles.meta)}>
              {meta.map((m, i) => (
                <span key={i} {...stylex.props(styles.metaItem)}>
                  {i > 0 && <span {...stylex.props(styles.dot)}>·</span>}
                  {m}
                </span>
              ))}
            </m.p>
          )}
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
                {...stylex.props(focus.ring, styles.play)}
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
  image: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
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
    paddingInline: {
      default: sizes.pageGutter,
      '@media (max-width: 720px)': sizes.pageGutterMobile,
    },
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
  tileImage: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
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
    outlineOffset: 3,
  },
})
