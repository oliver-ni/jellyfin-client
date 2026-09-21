import * as stylex from '@stylexjs/stylex'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { motion as m } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { useElementLayout } from '@/hooks/useElementLayout'
import { stagger } from '@/lib/motion'
import { colors, radii, space } from '@/theme/tokens.stylex'
import { ItemCard } from './ItemCard'

export interface ItemGridProps {
  /** Total number of items in the result set (known from the first page). */
  total: number
  /** Loaded items, index-aligned with the result set; unloaded slots render as skeletons. */
  items: readonly BaseItemDto[]
  /** Called with the highest item index currently rendered, so the caller can page in more. */
  onRenderedUpTo?: (index: number) => void
  minCardWidth?: number
}

const GAP = 20
const META_HEIGHT = 44

/** Window-scrolled virtualized poster grid; columns adapt to container width. */
export function ItemGrid({ total, items, onRenderedUpTo, minCardWidth = 150 }: ItemGridProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { width, top } = useElementLayout(ref)

  const cols = Math.max(2, Math.floor((width + GAP) / (minCardWidth + GAP)))
  const cardWidth = width ? Math.floor((width - GAP * (cols - 1)) / cols) : minCardWidth
  const rowHeight = Math.round(cardWidth * 1.5) + META_HEIGHT + GAP
  const rows = width ? Math.ceil(total / cols) : 0

  const virtualizer = useWindowVirtualizer({
    count: rows,
    estimateSize: () => rowHeight,
    overscan: 3,
    scrollMargin: top,
  })

  useEffect(() => {
    virtualizer.measure()
  }, [virtualizer, rowHeight])

  const virtualRows = virtualizer.getVirtualItems()
  const lastRow = virtualRows.at(-1)?.index
  const lastIndex = lastRow == null ? -1 : Math.min(total - 1, (lastRow + 1) * cols - 1)

  useEffect(() => {
    if (lastIndex >= 0) onRenderedUpTo?.(lastIndex)
  }, [lastIndex, onRenderedUpTo])

  return (
    <m.div
      ref={ref}
      initial="hidden"
      animate="show"
      variants={stagger(0.015)}
      {...stylex.props(styles.root)}
      style={{ height: rows ? virtualizer.getTotalSize() : undefined }}
    >
      {virtualRows.map((row) => (
        <div
          key={row.key}
          {...stylex.props(styles.row)}
          style={{
            transform: `translateY(${row.start - top}px)`,
            gridTemplateColumns: `repeat(${cols}, ${cardWidth}px)`,
            gap: GAP,
          }}
        >
          {Array.from({ length: cols }, (_, c) => {
            const i = row.index * cols + c
            if (i >= total) return null
            const item = items[i]
            return item ? (
              <ItemCard key={item.Id ?? i} item={item} width={cardWidth} />
            ) : (
              <CardSkeleton key={`s${i}`} width={cardWidth} />
            )
          })}
        </div>
      ))}
    </m.div>
  )
}

export function CardSkeleton({ width }: { width: number }) {
  return (
    <div {...stylex.props(styles.skeleton)} style={{ width }}>
      <div {...stylex.props(styles.skeletonPoster)} />
      <div {...stylex.props(styles.skeletonLine)} />
      <div {...stylex.props(styles.skeletonLine, styles.skeletonLineShort)} />
    </div>
  )
}

const styles = stylex.create({
  root: {
    position: 'relative',
    width: '100%',
  },
  row: {
    position: 'absolute',
    top: 0,
    left: 0,
    display: 'grid',
    willChange: 'transform',
  },
  skeleton: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
  },
  skeletonPoster: {
    aspectRatio: '2 / 3',
    borderRadius: radii.xs,
    backgroundColor: colors.skeleton,
  },
  skeletonLine: {
    height: 12,
    width: '70%',
    borderRadius: radii.xs,
    backgroundColor: colors.skeleton,
  },
  skeletonLineShort: {
    width: '35%',
    height: 10,
  },
})
