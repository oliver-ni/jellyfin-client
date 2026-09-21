import * as stylex from '@stylexjs/stylex'
import { ArrowUpRight } from '@phosphor-icons/react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { audioStreamLabel, formatDate, languageName, unique, videoStreamLabel } from '@/lib/format'
import { focus } from '@/theme/focus'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'

interface Fact {
  label: string
  value: React.ReactNode
}

function facts(item: BaseItemDto): Fact[] {
  const people = item.People ?? []
  const names = (type: string) => unique(people.filter((p) => p.Type === type).map((p) => p.Name))
  const streams = item.MediaStreams ?? []
  const video = streams.find((s) => s.Type === 'Video')
  const audio = unique(streams.filter((s) => s.Type === 'Audio').map(audioStreamLabel))
  const subs = unique(
    streams.filter((s) => s.Type === 'Subtitle').map((s) => languageName(s.Language) ?? s.Title),
  )

  const out: (Fact | null)[] = [
    list('Directed by', names('Director')),
    list('Written by', names('Writer')),
    list('Created by', names('Creator')),
    list('Studio', unique((item.Studios ?? []).map((s) => s.Name))),
    item.PremiereDate ? { label: dateLabel(item), value: formatDate(item.PremiereDate) } : null,
    item.Type === 'Series' && item.Status ? { label: 'Status', value: item.Status } : null,
    video ? { label: 'Video', value: videoStreamLabel(video) } : null,
    list('Audio', audio, true),
    list('Subtitles', subs),
    item.ExternalUrls && item.ExternalUrls.length > 0
      ? {
          label: 'Links',
          value: (
            <span {...stylex.props(styles.links)}>
              {item.ExternalUrls.map((u) =>
                u.Url ? (
                  <a
                    key={u.Url}
                    href={u.Url}
                    target="_blank"
                    rel="noreferrer"
                    {...stylex.props(focus.ring, styles.link)}
                  >
                    {u.Name}
                    <ArrowUpRight size={12} />
                  </a>
                ) : null,
              )}
            </span>
          ),
        }
      : null,
  ]
  return out.filter((f): f is Fact => f !== null)
}

function dateLabel(item: BaseItemDto): string {
  if (item.Type === 'Series') return 'First aired'
  return 'Released'
}

function list(label: string, values: readonly string[], multiline = false): Fact | null {
  if (!values.length) return null
  if (!multiline) return { label, value: values.join(', ') }
  return {
    label,
    value: (
      <span {...stylex.props(styles.lines)}>
        {values.map((v) => (
          <span key={v}>{v}</span>
        ))}
      </span>
    ),
  }
}

/** `column` stacks facts for a sidebar; `grid` flows them across the page width. */
export function FactSheet({
  item,
  layout = 'column',
}: {
  item: BaseItemDto
  layout?: 'column' | 'grid'
}) {
  const rows = facts(item)
  if (rows.length === 0) return null
  return (
    <dl {...stylex.props(styles.sheet, layout === 'grid' && styles.grid)}>
      {rows.map((f) => (
        <div key={f.label} {...stylex.props(styles.row)}>
          <dt {...stylex.props(styles.label)}>{f.label}</dt>
          <dd {...stylex.props(styles.value)}>{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}

const styles = stylex.create({
  sheet: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: space.lg,
    margin: 0,
  },
  grid: {
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    columnGap: space.xxl,
    alignItems: 'start',
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.textFaint,
  },
  value: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.5,
    color: colors.text,
  },
  lines: {
    display: 'flex',
    flexDirection: 'column',
  },
  links: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xxs,
    color: {
      default: colors.textMuted,
      ':hover': colors.text,
    },
    borderRadius: radii.xs,
    transitionProperty: 'color',
    transitionDuration: motion.fast,
  },
})
