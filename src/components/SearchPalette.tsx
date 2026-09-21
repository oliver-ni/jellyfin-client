import * as stylex from '@stylexjs/stylex'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import {
  Autocomplete,
  Dialog,
  Input,
  ListBox,
  ListBoxItem,
  Modal,
  ModalOverlay,
  SearchField,
  Text,
} from 'react-aria-components'
import { getItemsOptions } from '@/api/gen/@tanstack/react-query.gen'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { CARD_FIELDS } from '@/lib/home-queries'
import { episodeCode, itemKindLabel } from '@/lib/format'
import { itemLink } from '@/lib/item-link'
import { itemImage } from '@/lib/images'
import { BlurImage } from './BlurImage'
import { glass } from '@/theme/glass'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'

export interface SearchPaletteProps {
  userId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

const DEBOUNCE_MS = 120
const THUMB_W = 40

/** Trails `value` by `ms`; clearing is immediate so an emptied field shows no stale results. */
function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return value === '' ? '' : debounced
}

/** Titles that start with the query first, then whole shows/films before single episodes. */
function rank(items: readonly BaseItemDto[], query: string): BaseItemDto[] {
  const q = query.toLowerCase()
  const score = (item: BaseItemDto) =>
    (item.Name?.toLowerCase().startsWith(q) ? 0 : 2) + (item.Type === 'Episode' ? 1 : 0)
  return [...items].sort((a, b) => score(a) - score(b))
}

function subtitle(item: BaseItemDto): string {
  if (item.Type === 'Episode') {
    return [item.SeriesName, episodeCode(item)].filter(Boolean).join(' · ')
  }
  return [itemKindLabel(item), item.ProductionYear].filter(Boolean).join(' · ')
}

/** Global search, opened with `/` or the header's search capsule. Results navigate on select. */
export function SearchPalette({ userId, isOpen, onOpenChange }: SearchPaletteProps) {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const query = useDebounced(term.trim(), DEBOUNCE_MS)

  const results = useQuery({
    ...getItemsOptions({
      query: {
        userId,
        searchTerm: query,
        recursive: true,
        includeItemTypes: ['Movie', 'Series', 'Episode'],
        limit: 24,
        fields: CARD_FIELDS,
        enableImageTypes: ['Primary'],
        imageTypeLimit: 1,
      },
    }),
    enabled: isOpen && query.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
  const items = query ? rank(results.data?.Items ?? [], query) : []

  const open = (next: boolean) => {
    onOpenChange(next)
    if (!next) setTerm('')
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={open}
      isDismissable
      {...stylex.props(styles.overlay)}
    >
      <Modal {...stylex.props(glass.panel, styles.modal)}>
        <Dialog aria-label="Search" {...stylex.props(styles.dialog)}>
          <Autocomplete inputValue={term} onInputChange={setTerm}>
            <SearchField aria-label="Search your library" {...stylex.props(styles.field)}>
              <MagnifyingGlass size={20} {...stylex.props(styles.fieldIcon)} />
              <Input
                placeholder="Search films, series and episodes"
                autoFocus
                {...stylex.props(styles.input)}
              />
            </SearchField>
            <ListBox
              items={items}
              aria-label="Results"
              renderEmptyState={() =>
                query ? (
                  <div {...stylex.props(styles.empty)}>
                    {results.isFetching ? 'Searching…' : `Nothing matches “${query}”`}
                  </div>
                ) : null
              }
              onAction={(key) => {
                const item = items.find((it) => it.Id === key)
                if (!item?.Id) return
                open(false)
                void navigate(itemLink(item))
              }}
              {...stylex.props(styles.list, items.length > 0 && styles.listOpen)}
            >
              {(item) => <Result item={item} />}
            </ListBox>
          </Autocomplete>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

function Result({ item }: { item: BaseItemDto }) {
  const image = itemImage(item, 'Primary', { width: THUMB_W * 2 })
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
      <span {...stylex.props(styles.text)}>
        <Text slot="label" {...stylex.props(styles.name)}>
          {item.Name}
        </Text>
        <Text slot="description" {...stylex.props(styles.meta)}>
          {subtitle(item)}
        </Text>
      </span>
    </ListBoxItem>
  )
}

const fadeIn = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })
const fadeOut = stylex.keyframes({ from: { opacity: 1 }, to: { opacity: 0 } })
const rise = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(-8px) scale(0.98)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' },
})
const sink = stylex.keyframes({
  from: { opacity: 1, transform: 'translateY(0) scale(1)' },
  to: { opacity: 0, transform: 'translateY(-6px) scale(0.99)' },
})

const styles = stylex.create({
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: {
      default: '14vh',
      '@media (max-width: 720px)': space.lg,
    },
    paddingInline: space.md,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    animationName: { default: 'none', '[data-entering]': fadeIn, '[data-exiting]': fadeOut },
    animationDuration: { default: motion.base, '[data-exiting]': motion.fast },
    animationTimingFunction: motion.ease,
    animationFillMode: 'both',
  },
  modal: {
    width: '100%',
    maxWidth: 600,
    borderRadius: radii.xl,
    overflow: 'hidden',
    transformOrigin: 'top center',
    animationName: { default: 'none', '[data-entering]': rise, '[data-exiting]': sink },
    animationDuration: { default: motion.base, '[data-exiting]': motion.fast },
    animationTimingFunction: motion.ease,
    animationFillMode: 'both',
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
  text: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  empty: {
    paddingInline: space.lg,
    paddingBlock: space.lg,
    fontSize: 14,
    color: colors.textMuted,
    boxShadow: `inset 0 1px 0 ${colors.border}`,
  },
})
