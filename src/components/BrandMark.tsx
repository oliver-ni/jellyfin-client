import { FilmSlate } from '@phosphor-icons/react'
import { brandMark } from '@/brand'

export function BrandMark({ size = 18 }: { size?: number }) {
  return brandMark ? (
    <span aria-hidden="true">{brandMark}</span>
  ) : (
    <FilmSlate size={size} weight="fill" aria-hidden="true" />
  )
}
