import * as stylex from '@stylexjs/stylex'
import { ArrowUpRight } from 'lucide-react'
import type { BaseItemDto, MediaStream } from '@/api/gen/types.gen'
import {
  channelLabel,
  codecLabel,
  formatDate,
  formatRuntime,
  languageName,
  resolutionLabel,
} from '@/lib/format'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'

interface Fact {
  label: string
  value: React.ReactNode
}

function unique<T>(xs: readonly (T | null | undefined)[]): T[] {
  return [...new Set(xs.filter((x): x is T => x != null))]
}

function videoLabel(s: MediaStream): string {
  const parts = [resolutionLabel(s.Width, s.Height), codecLabel(s.Codec)]
  if (s.VideoRangeType && s.VideoRangeType !== 'SDR' && s.VideoRangeType !== 'Unknown') {
    parts.push(s.VideoRangeType.replace('DOVI', 'Dolby Vision'))
  }
  return parts.filter(Boolean).join(' · ')
}

function audioLabel(s: MediaStream): string {
  return [languageName(s.Language), codecLabel(s.Codec), channelLabel(s.Channels, s.ChannelLayout)]
    .filter(Boolean)
    .join(' · ')
}

function facts(item: BaseItemDto): Fact[] {
  const people = item.People ?? []
  const names = (type: string) => unique(people.filter((p) => p.Type === type).map((p) => p.Name))
  const streams = item.MediaStreams ?? []
  const video = streams.find((s) => s.Type === 'Video')
  const audio = unique(streams.filter((s) => s.Type === 'Audio').map(audioLabel))
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
    item.RunTimeTicks && item.Type !== 'Series' && item.Type !== 'Season'
      ? { label: 'Runtime', value: formatRuntime(item.RunTimeTicks) }
      : null,
    item.OfficialRating ? { label: 'Rated', value: item.OfficialRating } : null,
    video ? { label: 'Video', value: videoLabel(video) } : null,
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
                    {...stylex.props(styles.link)}
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
  if (item.Type === 'Season' || item.Type === 'Episode') return 'Aired'
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

export function FactSheet({ item }: { item: BaseItemDto }) {
  const rows = facts(item)
  if (rows.length === 0) return null
  return (
    <dl {...stylex.props(styles.sheet)}>
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
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    paddingBlock: space.md,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: colors.border,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
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
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 2,
  },
})
