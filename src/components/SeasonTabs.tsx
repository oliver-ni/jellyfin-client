import * as stylex from '@stylexjs/stylex'
import { Clock } from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import type { ReactNode } from 'react'
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components'
import { springs } from '@/lib/motion'
import { newsFor, type SeasonEntry } from '@/lib/seasons'
import { progress } from '@/seerr/labels'
import { focus } from '@/theme/focus'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'

/** What Seerr is doing about a season: downloading it, or still waiting on it. */
function Hint({ entry }: { entry: SeasonEntry }) {
  const season = newsFor(entry)
  if (!season) return null
  const p = progress(season.downloads)
  if (p) return <DownloadRing fraction={p.fraction} label={p.text} />
  return season.availability === 'pending' || season.availability === 'processing' ? (
    <Clock size={13} weight="bold" role="img" aria-label="Requested" />
  ) : null
}

const RING = 2 * Math.PI * 5.5

/** A down arrow inside a ring that fills as the download completes. */
function DownloadRing({ fraction, label }: { fraction: number; label: string }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
    >
      <circle cx={7} cy={7} r={5.5} opacity={0.3} />
      <circle
        cx={7}
        cy={7}
        r={5.5}
        strokeDasharray={`${fraction * RING} ${RING}`}
        transform="rotate(-90 7 7)"
      />
      <path d="M7 4.25v5M5 7.5l2 2 2-2" />
    </svg>
  )
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
  onSelect: (number: number) => void
  children: (entry: SeasonEntry) => ReactNode
}) {
  return (
    <Tabs
      selectedKey={selected.number}
      onSelectionChange={(key) => onSelect(Number(key))}
      {...stylex.props(styles.section)}
    >
      <TabList aria-label="Seasons" {...stylex.props(styles.tabs)}>
        {entries.map((e) => {
          const active = e.number === selected.number
          return (
            <Tab
              key={e.number}
              id={e.number}
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
                <Hint entry={e} />
              </span>
            </Tab>
          )
        })}
      </TabList>
      <TabPanel id={selected.number}>{children(selected)}</TabPanel>
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
    lineHeight: 1,
  },
})
