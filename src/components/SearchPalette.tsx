import * as stylex from '@stylexjs/stylex'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import {
  Autocomplete,
  Dialog,
  Header,
  Input,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Modal,
  ModalOverlay,
  SearchField,
  Text,
} from 'react-aria-components'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { episodeCode, itemKindLabel } from '@/lib/format'
import { itemImage } from '@/lib/images'
import { itemLink } from '@/lib/item-link'
import { queries } from '@/lib/queries'
import type { Title } from '@/seerr/api'
import { AVAILABILITY_LABEL, MEDIA_TYPE_LABEL } from '@/seerr/labels'
import { seerrQueries, useSeerr } from '@/seerr/queries'
import { glass, overlay } from '@/theme/glass'
import { text } from '@/theme/text'
import { colors, radii, space } from '@/theme/tokens.stylex'
import { BlurImage } from './BlurImage'

export interface SearchPaletteProps {
  userId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

const DEBOUNCE_MS = 120
const THUMB_W = 40
const MAX_TITLES = 8

/** Trails `value` by `ms`; clearing is immediate so an emptied field shows no stale results. */
function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return value === '' ? '' : debounced
}

/** Whole shows/films before single episodes, then titles that start with the query. */
function rank(items: readonly BaseItemDto[], query: string): BaseItemDto[] {
  const q = query.toLowerCase()
  const score = (item: BaseItemDto) =>
    (item.Type === 'Episode' ? 2 : 0) + (item.Name?.toLowerCase().startsWith(q) ? 0 : 1)
  return [...items].sort((a, b) => score(a) - score(b))
}

function subtitle(item: BaseItemDto): string {
  if (item.Type === 'Episode') {
    return [item.SeriesName, episodeCode(item)].filter(Boolean).join(' · ')
  }
  return [itemKindLabel(item), item.ProductionYear].filter(Boolean).join(' · ')
}

const titleKey = (t: Title) => `${t.type}/${t.tmdbId}`

/**
 * Global search, opened with `/` or the header's search capsule. Library results navigate to
 * the item; with Seerr signed in, titles the library lacks follow in a second section and
 * open their request page. Seerr titles already matched to a library item are left to the
 * library results, whose series page offers "Request more" for missing seasons.
 */
export function SearchPalette({ userId, isOpen, onOpenChange }: SearchPaletteProps) {
  const navigate = useNavigate()
  const seerr = useSeerr()
  const [term, setTerm] = useState('')
  const query = useDebounced(term.trim(), DEBOUNCE_MS)
  const enabled = isOpen && query.length > 0

  const library = useQuery({
    ...queries.search(userId, query),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
  const discover = useQuery({
    ...seerrQueries.search(query),
    enabled: enabled && seerr?.state === 'signedIn',
    placeholderData: keepPreviousData,
  })

  const items = query ? rank(library.data?.Items ?? [], query) : []
  const titles = query
    ? (discover.data ?? [])
        .filter((t) => !t.jellyfinId && t.availability !== 'available')
        .slice(0, MAX_TITLES)
    : []
  const empty = items.length === 0 && titles.length === 0

  const open = (next: boolean) => {
    onOpenChange(next)
    if (!next) setTerm('')
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={open}
      isDismissable
      {...stylex.props(overlay.backdrop)}
    >
      <Modal {...stylex.props(glass.panel, overlay.sheet, styles.modal)}>
        <Dialog aria-label="Search" {...stylex.props(styles.dialog)}>
          <Autocomplete inputValue={term} onInputChange={setTerm}>
            <SearchField aria-label="Search" {...stylex.props(styles.field)}>
              <MagnifyingGlass size={20} {...stylex.props(styles.fieldIcon)} />
              <Input
                placeholder={
                  seerr?.state === 'signedIn'
                    ? 'Search your library and everything else'
                    : 'Search films, series and episodes'
                }
                autoFocus
                {...stylex.props(styles.input)}
              />
            </SearchField>
            <ListBox
              aria-label="Results"
              renderEmptyState={() =>
                query ? (
                  <div {...stylex.props(styles.empty)}>
                    {library.isFetching || discover.isFetching
                      ? 'Searching…'
                      : `Nothing matches “${query}”`}
                  </div>
                ) : null
              }
              onAction={(key) => {
                const item = items.find((it) => it.Id === key)
                const title = titles.find((t) => titleKey(t) === key)
                if (!item && !title) return
                open(false)
                if (item) void navigate(itemLink(item))
                if (title)
                  void navigate({
                    to: '/request/$type/$tmdbId',
                    params: { type: title.type, tmdbId: title.tmdbId },
                  })
              }}
              {...stylex.props(styles.list, !empty && styles.listOpen)}
            >
              {items.length > 0 && (
                <ListBoxSection id="library">
                  {titles.length > 0 && (
                    <Header {...stylex.props(styles.header)}>Your library</Header>
                  )}
                  {items.map((item) => (
                    <ItemResult key={item.Id} item={item} />
                  ))}
                </ListBoxSection>
              )}
              {titles.length > 0 && (
                <ListBoxSection id="discover">
                  <Header {...stylex.props(styles.header)}>Not in your library</Header>
                  {titles.map((title) => (
                    <TitleResult key={titleKey(title)} title={title} />
                  ))}
                </ListBoxSection>
              )}
            </ListBox>
          </Autocomplete>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

function ItemResult({ item }: { item: BaseItemDto }) {
  const image = itemImage(item, 'Primary', THUMB_W * 2)
  const landscape = item.Type === 'Episode'
  return (
    <ListBoxItem id={item.Id ?? ''} textValue={item.Name ?? ''} {...stylex.props(styles.item)}>
      <BlurImage
        src={image?.url}
        blurhash={image?.blurhash}
        alt=""
        loading="eager"
        style={[styles.thumb, landscape ? styles.thumbLandscape : styles.thumbPoster]}
      />
      <span {...stylex.props(styles.copy)}>
        <Text slot="label" {...stylex.props(text.ellipsis, styles.name)}>
          {item.Name}
        </Text>
        <Text slot="description" {...stylex.props(text.ellipsis, styles.meta)}>
          {subtitle(item)}
        </Text>
      </span>
    </ListBoxItem>
  )
}

function TitleResult({ title }: { title: Title }) {
  return (
    <ListBoxItem id={titleKey(title)} textValue={title.name} {...stylex.props(styles.item)}>
      <BlurImage
        src={title.poster ?? undefined}
        alt=""
        loading="eager"
        style={[styles.thumb, styles.thumbPoster]}
      />
      <span {...stylex.props(styles.copy)}>
        <Text slot="label" {...stylex.props(text.ellipsis, styles.name)}>
          {title.name}
        </Text>
        <Text slot="description" {...stylex.props(text.ellipsis, styles.meta)}>
          {[MEDIA_TYPE_LABEL[title.type], title.year, AVAILABILITY_LABEL[title.availability]]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </span>
    </ListBoxItem>
  )
}

const styles = stylex.create({
  modal: {
    maxWidth: 600,
  },
  dialog: {
    outline: 'none',
    display: 'flex',
    flexDirection: 'column',
  },
  field: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    height: 56,
    paddingInline: space.lg,
  },
  fieldIcon: {
    flexShrink: 0,
    color: colors.textMuted,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    fontSize: 17,
    color: colors.text,
    backgroundColor: 'transparent',
    borderWidth: 0,
    outline: 'none',
    '::placeholder': { color: colors.textFaint },
    '::-webkit-search-cancel-button': { display: 'none' },
  },
  list: {
    outline: 'none',
    maxHeight: 'min(60vh, 520px)',
    overflowY: 'auto',
    paddingInline: space.xs,
    paddingBottom: 0,
  },
  listOpen: {
    paddingBottom: space.xs,
    boxShadow: `inset 0 1px 0 ${colors.border}`,
    paddingTop: space.xs,
  },
  header: {
    paddingInline: space.sm,
    paddingTop: space.md,
    paddingBottom: space.xs,
    fontSize: 12,
    fontWeight: 500,
    color: colors.textFaint,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    paddingInline: space.sm,
    paddingBlock: space.xs,
    borderRadius: radii.md,
    cursor: 'pointer',
    outline: 'none',
    color: colors.text,
    backgroundColor: {
      default: 'transparent',
      '[data-focused]': colors.surfaceHover,
      '[data-pressed]': colors.surfaceHover,
    },
  },
  thumb: {
    flexShrink: 0,
    borderRadius: radii.xs,
  },
  thumbPoster: {
    width: THUMB_W,
    height: THUMB_W * 1.5,
  },
  thumbLandscape: {
    width: THUMB_W * 1.6,
    height: THUMB_W * 0.9,
  },
  copy: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: 500,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  empty: {
    paddingInline: space.lg,
    paddingBlock: space.lg,
    fontSize: 14,
    color: colors.textMuted,
    boxShadow: `inset 0 1px 0 ${colors.border}`,
  },
})
