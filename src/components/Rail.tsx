import * as stylex from '@stylexjs/stylex'
import { Link, type LinkProps } from '@tanstack/react-router'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { fadeUp, stagger } from '@/lib/motion'
import { railMarker } from '@/theme/markers.stylex'
import { focus } from '@/theme/focus'
import { colors, motion, radii, sizes, space } from '@/theme/tokens.stylex'

export interface RailProps {
  title: string
  link?: Pick<LinkProps, 'to' | 'params'>
  children: ReactNode
}

export function Rail({ title, link, children }: RailProps) {
  const scroller = useRef<HTMLDivElement>(null)

  function scrollBy(dir: -1 | 1) {
    const el = scroller.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  return (
    <m.section
      initial="hidden"
      animate="show"
      variants={stagger()}
      {...stylex.props(styles.section, railMarker)}
    >
      <m.header variants={fadeUp} {...stylex.props(styles.header)}>
        {link ? (
          <Link {...link} {...stylex.props(focus.ring, styles.titleLink)}>
            <h2 {...stylex.props(styles.title)}>{title}</h2>
            <CaretRight size={16} {...stylex.props(styles.titleChevron)} />
          </Link>
        ) : (
          <h2 {...stylex.props(styles.title)}>{title}</h2>
        )}
        <div {...stylex.props(styles.arrows)}>
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            {...stylex.props(focus.ring, styles.arrow)}
          >
            <CaretLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            {...stylex.props(focus.ring, styles.arrow)}
          >
            <CaretRight size={18} />
          </button>
        </div>
      </m.header>
      <div ref={scroller} {...stylex.props(styles.scroller)}>
        {children}
      </div>
    </m.section>
  )
}

const styles = stylex.create({
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingInline: sizes.pageGutter,
  },
  titleLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xs,
    color: colors.text,
    borderRadius: radii.sm,
    outlineOffset: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: colors.text,
  },
  titleChevron: {
    color: colors.textFaint,
    transitionProperty: 'transform, color',
    transitionDuration: motion.fast,
    transitionTimingFunction: motion.ease,
    transform: {
      default: 'translateX(0)',
      [stylex.when.ancestor(':hover', railMarker)]: 'translateX(2px)',
    },
  },
  arrows: {
    display: {
      default: 'flex',
      '@media (hover: none)': 'none',
    },
    gap: space.xs,
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover', railMarker)]: 1,
      [stylex.when.ancestor(':focus-within', railMarker)]: 1,
    },
    transitionProperty: 'opacity',
    transitionDuration: motion.fast,
  },
  arrow: {
    display: 'grid',
    placeItems: 'center',
    width: 30,
    height: 30,
    borderRadius: radii.full,
    color: colors.textMuted,
    backgroundColor: {
      default: colors.surface,
      ':hover': colors.surfaceHover,
    },
  },
  scroller: {
    display: 'flex',
    gap: space.md,
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollSnapType: 'x proximity',
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' },
    paddingInline: sizes.pageGutter,
    paddingBlock: space.sm,
    scrollPaddingInline: sizes.pageGutter,
  },
})
