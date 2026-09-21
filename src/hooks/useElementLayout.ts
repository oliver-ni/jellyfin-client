import { useLayoutEffect, useState, type RefObject } from 'react'

export interface ElementLayout {
  /** Content-box width in px; 0 until first measure. */
  width: number
  /** Distance from the document top in px. */
  top: number
}

/** Tracks an element's width and document offset via ResizeObserver. */
export function useElementLayout(ref: RefObject<HTMLElement | null>): ElementLayout {
  const [layout, setLayout] = useState<ElementLayout>({ width: 0, top: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = (width: number) => {
      const top = Math.round(el.getBoundingClientRect().top + window.scrollY)
      setLayout((prev) => (prev.width === width && prev.top === top ? prev : { width, top }))
    }
    // Measure synchronously so the first committed frame already has its final height;
    // the router restores scroll right after commit and would otherwise clamp to a short page.
    update(Math.floor(el.clientWidth))
    const ro = new ResizeObserver(([entry]) => update(Math.floor(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return layout
}
