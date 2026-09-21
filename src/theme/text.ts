import * as stylex from '@stylexjs/stylex'
import { space } from './tokens.stylex'

export const text = stylex.create({
  ellipsis: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  clamp2: {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflow: 'hidden',
  },
  clamp3: {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 3,
    overflow: 'hidden',
  },
  /** The "·" between inline facts. */
  dot: {
    marginInline: space.sm,
    opacity: 0.5,
  },
})
