import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { Info, Play } from 'lucide-react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { episodeCode, formatRuntime, itemKindLabel, remainingMinutes } from '@/lib/format'
import { backdropImage, logoImage } from '@/lib/images'
import { colors, motion, radii, sizes, space } from '@/theme/tokens.stylex'
import { BlurImage } from './BlurImage'

export interface HeroProps {
  item: BaseItemDto
  /** Small tracked label above the title, e.g. "Continue watching". */
  eyebrow?: string
}

export function Hero({ item, eyebrow }: HeroProps) {
  const backdrop = backdropImage(item, 1920)
  const logo = logoImage(item, 800)
  const isEpisode = item.Type === 'Episode'
  const title = isEpisode ? (item.SeriesName ?? item.Name) : item.Name
  const remaining = remainingMinutes(item)
  const itemId = item.Id ?? ''

  const meta = [
    itemKindLabel(item),
    ...(item.Genres ?? []).slice(0, 2),
    item.ProductionYear,
    item.OfficialRating,
    remaining ? `${remaining} min left` : formatRuntime(item.RunTimeTicks),
  ].filter(Boolean)

  const episodeLine = isEpisode
    ? [episodeCode(item), item.Name].filter(Boolean).join('  ·  ')
    : null

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
        {eyebrow && <span {...stylex.props(styles.eyebrow)}>{eyebrow}</span>}
        {logo ? (
          <img src={logo} alt={title ?? ''} {...stylex.props(styles.logo)} draggable={false} />
        ) : (
          <h1 {...stylex.props(styles.title)}>{title}</h1>
        )}
        {episodeLine && <p {...stylex.props(styles.episode)}>{episodeLine}</p>}
        {meta.length > 0 && (
          <p {...stylex.props(styles.meta)}>
            {meta.map((m, i) => (
              <span key={i}>
                {i > 0 && <span {...stylex.props(styles.dot)}>·</span>}
                {m}
              </span>
            ))}
          </p>
        )}
        {item.Overview && <p {...stylex.props(styles.overview)}>{item.Overview}</p>}
        <div {...stylex.props(styles.actions)}>
          <Link to="/items/$itemId" params={{ itemId }} {...stylex.props(styles.play)}>
            <Play size={18} fill="currentColor" />
            {remaining ? 'Resume' : 'Play'}
          </Link>
          <Link
            to="/items/$itemId"
            params={{ itemId }}
            aria-label="More info"
            {...stylex.props(styles.info)}
          >
            <Info size={20} />
          </Link>
        </div>
      </div>
    </section>
  )
}

const styles = stylex.create({
  hero: {
    position: 'relative',
    width: '100%',
    height: 'clamp(520px, 78vh, 860px)',
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
    backgroundImage: `linear-gradient(to top, ${colors.bg} 0%, ${colors.bg} 4%, transparent 55%)`,
  },
  fadeLeft: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `linear-gradient(to right, ${colors.scrim} 0%, transparent 65%)`,
  },
  content: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: space.md,
    width: '100%',
    maxWidth: 640,
    paddingInline: {
      default: sizes.pageGutter,
      '@media (max-width: 720px)': sizes.pageGutterMobile,
    },
    paddingBottom: space.xxxl,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: colors.heroTextMuted,
  },
  logo: {
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
    display: 'flex',
    flexWrap: 'wrap',
    fontSize: 14,
    fontWeight: 500,
    color: colors.heroTextMuted,
  },
  dot: {
    marginInline: space.sm,
    opacity: 0.5,
  },
  overview: {
    fontSize: 15,
    lineHeight: 1.5,
    color: colors.heroTextMuted,
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 3,
    overflow: 'hidden',
    maxWidth: 560,
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
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 3,
  },
})
