import * as stylex from '@stylexjs/stylex'
import { Star } from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { useMorphHandoff, useMorphTarget } from '@/hooks/useMorphTarget'
import type { ResolvedImage } from '@/lib/images'
import { fadeUp, pop, stagger } from '@/lib/motion'
import { media } from '@/theme/media'
import { colors, radii, shadows, sizes, space } from '@/theme/tokens.stylex'
import { BlurImage } from './BlurImage'
import { Facts } from './Facts'

const TILE_W = 190

export interface DetailHeroProps {
  backdrop?: ResolvedImage | null
  tile?: ResolvedImage | null
  /** Item whose poster card the tile morphs from and back to. */
  morphId?: string
  logo?: string | null
  title: string
  tagline?: string | null
  /** Short facts under the title; falsy entries are skipped. */
  meta: readonly ReactNode[]
  /** Community rating out of 10, shown after `meta`. */
  rating?: number | null
  genres?: readonly string[]
  /** Actions row. */
  children?: ReactNode
}

/** Full-bleed artwork with a poster tile and title block; the top of every detail page. */
export function DetailHero({
  backdrop,
  tile,
  morphId = '',
  logo,
  title,
  tagline,
  meta,
  rating,
  genres = [],
  children,
}: DetailHeroProps) {
  const tileRef = useRef<HTMLDivElement>(null)
  const morph = useMorphTarget(morphId, 'poster', tileRef)
  useMorphHandoff(tileRef, morphId, 'poster', tile?.url)

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
            data-morph={morphId || undefined}
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
              alt={title}
              {...stylex.props(styles.logo)}
              draggable={false}
            />
          ) : (
            <m.h1 variants={fadeUp} {...stylex.props(styles.title)}>
              {title}
            </m.h1>
          )}
          {tagline && (
            <m.p variants={fadeUp} {...stylex.props(styles.tagline)}>
              {tagline}
            </m.p>
          )}
          <Facts
            items={[
              ...meta,
              rating ? (
                <span key="rating" {...stylex.props(styles.rating)}>
                  <Star size={12} weight="fill" />
                  {rating.toFixed(1)}
                </span>
              ) : null,
            ]}
            variants={fadeUp}
            style={styles.meta}
          />
          {genres.length > 0 && (
            <m.p variants={fadeUp} {...stylex.props(styles.genres)}>
              {genres.slice(0, 4).join(', ')}
            </m.p>
          )}
          {children && (
            <m.div variants={fadeUp} {...stylex.props(styles.actions)}>
              {children}
            </m.div>
          )}
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
