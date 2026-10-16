import * as stylex from '@stylexjs/stylex'
import { Link, type LinkProps } from '@tanstack/react-router'
import { motion as m } from 'motion/react'
import type { ReactNode } from 'react'
import { fadeUp } from '@/lib/motion'
import { REQUEST_GROUPS, REQUEST_GROUP_LABEL, type RequestGroup } from '@/lib/request-groups'
import { focus } from '@/theme/focus'
import { list } from '@/theme/list'
import { text } from '@/theme/text'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'
import { BlurImage } from './BlurImage'

export interface RequestEntry {
  key: string
  group: RequestGroup
  /** The entry as a row, in every group but `done`. */
  row: ReactNode
  /** The entry as a poster card, in the `done` grid. */
  card: ReactNode
}

/** Requests sorted into the groups that say where each stands, with a count on each group. */
export function RequestGroups({
  entries,
  animateKey,
}: {
  entries: RequestEntry[]
  animateKey?: string
}) {
  return (
    <m.div
      key={animateKey}
      initial="hidden"
      animate="show"
      variants={fadeUp}
      {...stylex.props(styles.groups)}
    >
      {REQUEST_GROUPS.map((g) => {
        const members = entries.filter((e) => e.group === g)
        if (members.length === 0) return null
        return (
          <section key={g} {...stylex.props(styles.group)}>
            <h2 {...stylex.props(list.faint)}>
              {REQUEST_GROUP_LABEL[g]}
              <span {...stylex.props(styles.count)}>{members.length}</span>
            </h2>
            <ul {...stylex.props(styles.list, g === 'done' && styles.grid)}>
              {members.map((e) => (
                <li key={e.key}>{g === 'done' ? e.card : e.row}</li>
              ))}
            </ul>
          </section>
        )
      })}
    </m.div>
  )
}

export interface RequestRowProps {
  link: Pick<LinkProps, 'to' | 'params' | 'search'>
  poster: string | null | undefined
  name: string
  meta: string
  /** Trailing status: a progress bar, or a word on why there is none. */
  children?: ReactNode
}

export function RequestRow({ link, poster, name, meta, children }: RequestRowProps) {
  return (
    <Link {...link} {...stylex.props(focus.ring, styles.row)}>
      <BlurImage src={poster} alt="" style={styles.poster} />
      <span {...stylex.props(styles.copy)}>
        <span {...stylex.props(text.ellipsis, styles.name)}>{name}</span>
        <span {...stylex.props(text.ellipsis, styles.meta)}>{meta}</span>
      </span>
      {typeof children === 'string' ? (
        <span {...stylex.props(styles.meta)}>{children}</span>
      ) : (
        children
      )}
    </Link>
  )
}

const styles = stylex.create({
  groups: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xl,
    marginTop: space.sm,
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
  },
  count: {
    marginLeft: space.sm,
    opacity: 0.6,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: space.lg,
    paddingTop: space.xs,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: space.md,
    paddingBlock: space.sm,
    paddingInline: space.md,
    marginInline: `calc(-1 * ${space.md})`,
    borderRadius: radii.md,
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.surface,
    },
    transitionProperty: 'background-color',
    transitionDuration: motion.fast,
  },
  poster: {
    width: 44,
    aspectRatio: '2 / 3',
    borderRadius: radii.xs,
    backgroundColor: colors.skeleton,
    flexShrink: 0,
  },
  copy: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: 600,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
})
