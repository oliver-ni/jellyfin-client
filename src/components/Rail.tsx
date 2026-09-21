import * as stylex from '@stylexjs/stylex'
import { Link, type LinkProps } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { railMarker } from '@/theme/markers.stylex'
import { colors, motion, radii, sizes, space } from '@/theme/tokens.stylex'

export interface RailProps {
  title: string
  linkTo?: LinkProps['to']
  linkParams?: LinkProps['params']
  children: ReactNode
}

export function Rail({ title, linkTo, linkParams, children }: RailProps) {
  const scroller = useRef<HTMLDivElement>(null)

  function scrollBy(dir: -1 | 1) {
    const el = scroller.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  return (
    <section {...stylex.props(styles.section, railMarker)}>
      <header {...stylex.props(styles.header)}>
        {linkTo ? (
          <Link to={linkTo} params={linkParams} {...stylex.props(styles.titleLink)}>
            <h2 {...stylex.props(styles.title)}>{title}</h2>
            <ChevronRight size={16} {...stylex.props(styles.titleChevron)} />
          </Link>
        ) : (
          <h2 {...stylex.props(styles.title)}>{title}</h2>
        )}
        <div {...stylex.props(styles.arrows)}>
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            {...stylex.props(styles.arrow)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            {...stylex.props(styles.arrow)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>
      <div ref={scroller} {...stylex.props(styles.scroller)}>
        {children}
      </div>
    </section>
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
    paddingInline: {
      default: sizes.pageGutter,
      '@media (max-width: 720px)': sizes.pageGutterMobile,
    },
  },
  titleLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xs,
    color: colors.text,
    borderRadius: radii.sm,
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: colors.textMuted,
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
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
  },
  scroller: {
    display: 'flex',
    gap: space.md,
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollSnapType: 'x proximity',
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' },
    paddingInline: {
      default: sizes.pageGutter,
      '@media (max-width: 720px)': sizes.pageGutterMobile,
    },
    paddingBlock: space.sm,
    scrollPaddingInline: {
      default: sizes.pageGutter,
      '@media (max-width: 720px)': sizes.pageGutterMobile,
    },
  },
})
