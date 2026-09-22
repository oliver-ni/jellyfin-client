import * as stylex from '@stylexjs/stylex'
import { Clock, DownloadSimple, Plus, Prohibit, type Icon } from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import type { ReactNode } from 'react'
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components'
import { springs } from '@/lib/motion'
import { newsFor, unplayed, type SeasonEntry } from '@/lib/seasons'
import type { Availability } from '@/seerr/api'
import { focus } from '@/theme/focus'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'

/** What a season's tab hints at: requestable, waiting, downloading or refused. */
const ICON: Record<Availability, Icon | null> = {
  unknown: Plus,
  deleted: Plus,
  partial: null,
  pending: Clock,
  processing: DownloadSimple,
  blocklisted: Prohibit,
  available: null,
}

function hint(e: SeasonEntry): Icon | null {
  const s = newsFor(e)
  if (!s) return null
  return s.downloads.length > 0 ? DownloadSimple : ICON[s.availability]
}

/** Season tabs over library and missing seasons alike; the panel is the caller's. */
export function SeasonTabs({
  entries,
  selected,
  onSelect,
  children,
}: {
  entries: SeasonEntry[]
  selected: SeasonEntry
  onSelect: (key: string) => void
  children: (entry: SeasonEntry) => ReactNode
}) {
  return (
    <Tabs
      selectedKey={selected.key}
      onSelectionChange={(key) => onSelect(String(key))}
      {...stylex.props(styles.section)}
    >
      <TabList aria-label="Seasons" {...stylex.props(styles.tabs)}>
        {entries.map((e) => {
          const active = e.key === selected.key
          const Hint = hint(e)
          return (
            <Tab
              key={e.key}
              id={e.key}
              {...stylex.props(
                focus.ring,
                styles.tab,
                e.kind === 'missing' && styles.tabMissing,
                active && styles.tabActive,
              )}
            >
              {active && (
                <m.span
                  layoutId="season-pill"
                  layoutCrossfade={false}
                  transition={springs.gentle}
                  {...stylex.props(styles.pill)}
                />
              )}
              <span {...stylex.props(styles.label)}>
                {e.kind === 'library' ? e.item.Name : e.season.name}
                {e.kind === 'library' && unplayed(e.item) > 0 && (
                  <span
                    role="img"
                    aria-label={`${unplayed(e.item)} unplayed`}
                    {...stylex.props(styles.unplayedDot)}
                  />
                )}
                {Hint && <Hint size={13} weight="bold" aria-hidden />}
              </span>
            </Tab>
          )
        })}
      </TabList>
      <TabPanel id={selected.key}>{children(selected)}</TabPanel>
    </Tabs>
  )
}

const styles = stylex.create({
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
  },
  tabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  tab: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
    height: 34,
    paddingInline: space.md,
    borderRadius: radii.full,
    fontSize: 13,
    fontWeight: 600,
    color: {
      default: colors.textMuted,
      ':hover': colors.text,
    },
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.surface,
    },
    transitionProperty: 'background-color, color',
    transitionDuration: motion.base,
  },
  tabMissing: {
    color: {
      default: colors.textFaint,
      ':hover': colors.textMuted,
    },
  },
  tabActive: {
    color: {
      default: colors.accentText,
      ':hover': colors.accentText,
    },
    backgroundColor: {
      default: 'transparent',
      ':hover': 'transparent',
    },
  },
  pill: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  label: {
    position: 'relative',
    zIndex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.sm,
  },
  unplayedDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: 'currentColor',
    opacity: 0.6,
  },
})
