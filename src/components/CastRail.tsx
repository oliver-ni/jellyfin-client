import * as stylex from '@stylexjs/stylex'
import { User } from 'lucide-react'
import type { BaseItemPerson } from '@/api/gen/types.gen'
import { imageUrl } from '@/lib/images'
import { colors, radii, space } from '@/theme/tokens.stylex'
import { BlurImage } from './BlurImage'
import { Rail } from './Rail'

const SIZE = 96

export function CastRail({ people }: { people: readonly BaseItemPerson[] }) {
  const cast = mergeRoles(people.filter((p) => p.Type === 'Actor' || p.Type === 'GuestStar'))
  if (cast.length === 0) return null
  return (
    <Rail title="Cast">
      {cast.slice(0, 30).map((p, i) => (
        <PersonCard key={p.Id ?? i} person={p} />
      ))}
    </Rail>
  )
}

/** Jellyfin lists a person once per role; collapse them into one card with joined roles. */
function mergeRoles(people: readonly BaseItemPerson[]): BaseItemPerson[] {
  const byId = new Map<string, BaseItemPerson>()
  const out: BaseItemPerson[] = []
  for (const p of people) {
    const key = p.Id ?? p.Name ?? ''
    const seen = byId.get(key)
    if (seen) {
      if (p.Role && seen.Role !== p.Role)
        seen.Role = [seen.Role, p.Role].filter(Boolean).join(' / ')
      continue
    }
    const copy = { ...p }
    byId.set(key, copy)
    out.push(copy)
  }
  return out
}

function PersonCard({ person }: { person: BaseItemPerson }) {
  const tag = person.PrimaryImageTag
  const src =
    tag && person.Id ? imageUrl(person.Id, { type: 'Primary', tag, width: SIZE * 2 }) : null
  const blurhash = tag ? (person.ImageBlurHashes?.Primary?.[tag] ?? undefined) : undefined
  return (
    <div {...stylex.props(styles.card)}>
      <div {...stylex.props(styles.avatar)}>
        {src ? (
          <BlurImage src={src} blurhash={blurhash} alt="" style={styles.image} />
        ) : (
          <User size={32} {...stylex.props(styles.placeholder)} />
        )}
      </div>
      <span {...stylex.props(styles.name)}>{person.Name}</span>
      {person.Role && <span {...stylex.props(styles.role)}>{person.Role}</span>}
    </div>
  )
}

const styles = stylex.create({
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xs,
    width: 128,
    flexShrink: 0,
    textAlign: 'center',
    scrollSnapAlign: 'start',
  },
  avatar: {
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    width: SIZE,
    height: SIZE,
    borderRadius: radii.full,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginBottom: space.xs,
  },
  image: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  },
  placeholder: {
    color: colors.textFaint,
  },
  name: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.text,
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflow: 'hidden',
  },
  role: {
    fontSize: 12,
    color: colors.textFaint,
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflow: 'hidden',
  },
})
