import type { BaseItemDto } from '@/api/gen/types.gen'
import { type Fact, FactLines, FactLinks, type WebLink } from '@/components/FactSheet'
import { audioStreamLabel, formatDate, languageName, unique, videoStreamLabel } from '@/lib/format'

/** Facts for a Jellyfin item: credits, studio, dates, streams and external links. */
export function itemFacts(item: BaseItemDto): Fact[] {
  const people = item.People ?? []
  const names = (type: string) => unique(people.filter((p) => p.Type === type).map((p) => p.Name))
  const streams = item.MediaStreams ?? []
  const video = streams.find((s) => s.Type === 'Video')
  const audio = unique(streams.filter((s) => s.Type === 'Audio').map(audioStreamLabel))
  const subs = unique(
    streams.filter((s) => s.Type === 'Subtitle').map((s) => languageName(s.Language) ?? s.Title),
  )

  return compact([
    list('Directed by', names('Director')),
    list('Written by', names('Writer')),
    list('Created by', names('Creator')),
    list('Studio', unique((item.Studios ?? []).map((s) => s.Name))),
    item.PremiereDate ? { label: dateLabel(item), value: formatDate(item.PremiereDate) } : null,
    item.Type === 'Series' && item.Status ? { label: 'Status', value: item.Status } : null,
    video ? { label: 'Video', value: videoStreamLabel(video) } : null,
    list('Audio', audio, true),
    list('Subtitles', subs),
    links(
      (item.ExternalUrls ?? []).flatMap((u) =>
        u.Url ? [{ label: u.Name ?? u.Url, url: u.Url }] : [],
      ),
    ),
  ])
}

function dateLabel(item: BaseItemDto): string {
  if (item.Type === 'Series') return 'First aired'
  return 'Released'
}

export function compact(facts: readonly (Fact | null)[]): Fact[] {
  return facts.filter((f): f is Fact => f !== null)
}

/** A fact listing the non-empty `values`, or nothing when there are none. */
export function list(
  label: string,
  values: readonly (string | null | undefined)[],
  multiline = false,
): Fact | null {
  const shown = values.filter((v): v is string => !!v)
  if (!shown.length) return null
  if (!multiline) return { label, value: shown.join(', ') }
  return { label, value: <FactLines values={shown} /> }
}

export function links(items: readonly WebLink[]): Fact | null {
  if (!items.length) return null
  return { label: 'Links', value: <FactLinks items={items} /> }
}
