import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { Info, Play } from '@phosphor-icons/react'
import { AnimatePresence, motion as m } from 'motion/react'
import type { ReactNode } from 'react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { episodeCode, formatRuntime, itemKindLabel, remainingMinutes } from '@/lib/format'
import { backdropImage, logoImage } from '@/lib/images'
import { itemLink } from '@/lib/item-link'
import { fadeUp, stagger, vanish } from '@/lib/motion'
import { focus } from '@/theme/focus'
import { media, playPill } from '@/theme/media'
import { text } from '@/theme/text'
import { colors, motion, radii, sizes, space } from '@/theme/tokens.stylex'
import { BlurImage } from './BlurImage'
import { Facts } from './Facts'

export interface HeroProps {
  item: BaseItemDto
  /** Small label above the title, e.g. "Continue watching". */
  eyebrow?: string
  /** Overlaid at the bottom centre, e.g. carousel controls. */
  children?: ReactNode
}

const BACKDROP_FADE = 0.6

/** The outgoing backdrop stays put underneath until the incoming one has fully faded in. */
const releaseBackdrop = { opacity: 0, transition: { duration: 0.1, delay: BACKDROP_FADE } }

/**
 * Full-bleed backdrop with title treatment and actions. Changing `item` crossfades: the new
 * backdrop fades in over the old one, and the copy swaps with a short exit and staggered entry.
 */
export function Hero({ item, eyebrow, children }: HeroProps) {
  const backdrop = backdropImage(item, 1920)
  const logo = logoImage(item, 800)
  const isEpisode = item.Type === 'Episode'
  const title = isEpisode ? (item.SeriesName ?? item.Name) : item.Name
  const remaining = remainingMinutes(item)
  const itemId = item.Id ?? ''
  const playable = item.MediaType === 'Video'

  const meta = [
    itemKindLabel(item),
    ...(item.Genres ?? []).slice(0, 2),
    item.ProductionYear,
    item.OfficialRating,
    remaining ? `${remaining} min left` : formatRuntime(item.RunTimeTicks),
  ]

  return (
    <section {...stylex.props(styles.hero)}>
      <div {...stylex.props(styles.art)}>
        <AnimatePresence initial={false}>
          <m.div
            key={itemId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: BACKDROP_FADE } }}
            exit={releaseBackdrop}
            {...stylex.props(media.fill)}
          >
            <BlurImage
              src={backdrop?.url}
              blurhash={backdrop?.blurhash}
              alt=""
              loading="eager"
              fetchPriority="high"
              style={media.fill}
            />
          </m.div>
        </AnimatePresence>
        <div {...stylex.props(styles.fadeBottom)} />
        <div {...stylex.props(styles.fadeLeft)} />
      </div>

      <AnimatePresence>
        <m.div
          key={itemId}
          initial="hidden"
          animate="show"
          exit={vanish}
          variants={stagger()}
          {...stylex.props(styles.content)}
        >
          {eyebrow && (
            <m.span variants={fadeUp} {...stylex.props(styles.eyebrow)}>
              {eyebrow}
            </m.span>
          )}
          <m.h1 variants={fadeUp} {...stylex.props(logo ? styles.logoTitle : styles.title)}>
            {logo ? (
              <img src={logo} alt={title ?? ''} draggable={false} {...stylex.props(styles.logo)} />
            ) : (
              title
            )}
          </m.h1>
          {isEpisode && (
            <Facts
              items={[episodeCode(item), item.Name]}
              variants={fadeUp}
              style={styles.episode}
            />
          )}
          <Facts items={meta} variants={fadeUp} style={styles.meta} />
          {item.Overview && (
            <m.p variants={fadeUp} {...stylex.props(text.clamp3, styles.overview)}>
              {item.Overview}
            </m.p>
          )}
          <m.div variants={fadeUp} {...stylex.props(styles.actions)}>
            <Link
              to={playable ? '/play/$itemId' : '/items/$itemId'}
              params={{ itemId }}
              {...stylex.props(focus.ring, playPill.base)}
            >
              <Play size={18} weight="fill" />
              {remaining ? 'Resume' : 'Play'}
            </Link>
            <Link
              {...itemLink(item)}
              aria-label="More info"
              {...stylex.props(focus.ring, styles.info)}
            >
              <Info size={20} />
            </Link>
          </m.div>
        </m.div>
      </AnimatePresence>
      {children && <div {...stylex.props(styles.footer)}>{children}</div>}
    </section>
  )
}

const styles = stylex.create({
  hero: {
    position: 'relative',
    width: '100%',
    height: 'clamp(520px, 78vh, 860px)',
    display: 'grid',
    alignItems: 'end',
  },
  art: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
  },
  fadeBottom: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `linear-gradient(to top, ${colors.bg} 0%, ${colors.bg} 4%, transparent 55%)`,
  },
  fadeLeft: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `linear-gradient(to right, ${colors.scrim} 0%, transparent 65%)`,
  },
  content: {
    // Outgoing and incoming copy share one cell so they crossfade in place.
    gridArea: '1 / 1',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: space.md,
    width: '100%',
    maxWidth: 640,
    paddingInline: sizes.pageGutter,
    paddingBottom: space.xxxl,
  },
  footer: {
    gridArea: '1 / 1',
    position: 'relative',
    justifySelf: 'center',
    marginBottom: space.xl,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: 500,
    color: colors.heroTextMuted,
  },
  logoTitle: {
    display: 'flex',
    width: '100%',
  },
  logo: {
    display: 'block',
    maxWidth: 'min(420px, 70%)',
    maxHeight: 160,
    objectFit: 'contain',
    objectPosition: 'left bottom',
    filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.5))',
  },
  title: {
    fontSize: 'clamp(36px, 4.5vw, 60px)',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    lineHeight: 1.02,
    color: colors.heroText,
    textWrap: 'balance',
  },
  episode: {
    fontSize: 17,
    fontWeight: 500,
    color: colors.heroText,
  },
  meta: {
    fontSize: 14,
    fontWeight: 500,
    color: colors.heroTextMuted,
  },
  overview: {
    fontSize: 15,
    lineHeight: 1.5,
    color: colors.heroTextMuted,
    maxWidth: 560,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.sm,
  },
  info: {
    display: 'grid',
    placeItems: 'center',
    width: 46,
    height: 46,
    borderRadius: radii.full,
    color: colors.heroText,
    backgroundColor: {
      default: colors.heroSurface,
      ':hover': colors.heroBorder,
    },
    backdropFilter: 'blur(12px)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.heroBorder,
    transitionProperty: 'background-color',
    transitionDuration: motion.fast,
    outlineOffset: 3,
  },
})
