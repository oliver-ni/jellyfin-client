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
    <Clock size={16} weight="bold" role="img" aria-label="Requested" />
  ) : null
}

// Phosphor's bold `ArrowCircleDown`, taken apart: its ring (radius 96, 24 wide on the 256 grid)
// drawn as a stroke so an arc can fill it, and its arrow verbatim.
const RING = 2 * Math.PI * 96
const ARROW =
  'M168.49,127.51a12,12,0,0,1,0,17l-32,32a12,12,0,0,1-17,0l-32-32a12,12,0,1,1,17-17L116,139V88a12,12,0,0,1,24,0v51l11.51-11.52A12,12,0,0,1,168.49,127.51Z'

function DownloadRing({ fraction, label }: { fraction: number; label: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      width={16}
      height={16}
      fill="currentColor"
      role="img"
      aria-label={label}
    >
      <g fill="none" stroke="currentColor" strokeWidth={24} transform="rotate(-90 128 128)">
        <circle cx={128} cy={128} r={96} opacity={0.3} />
        {fraction > 0 && (
          <circle
            cx={128}
            cy={128}
            r={96}
            strokeLinecap="round"
            strokeDasharray={`${fraction * RING} ${RING}`}
          />
        )}
      </g>
      <path d={ARROW} />
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
