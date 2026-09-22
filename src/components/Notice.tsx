import * as stylex from '@stylexjs/stylex'
import { motion as m } from 'motion/react'
import type { ReactNode, Ref } from 'react'
import { Button } from '@/components/Button'
import { fadeUp, vanish } from '@/lib/motion'
import { colors, space } from '@/theme/tokens.stylex'

export interface NoticeProps {
  title: string
  text?: string
  /** Adds a "Try again" button; for failed loads. */
  onRetry?: () => void
  /** Other actions. */
  children?: ReactNode
  ref?: Ref<HTMLDivElement>
}

/** Centred empty/error state for a page section. Fades in, and out under `AnimatePresence`. */
export function Notice({ title, text, onRetry, children, ref }: NoticeProps) {
  return (
    <m.div
      ref={ref}
      initial="hidden"
      animate="show"
      exit={vanish}
      variants={fadeUp}
      {...stylex.props(styles.root)}
    >
      <p {...stylex.props(styles.title)}>{title}</p>
      {text && <p {...stylex.props(styles.text)}>{text}</p>}
      {onRetry && <Button onPress={onRetry}>Try again</Button>}
      {children}
    </m.div>
  )
}

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.sm,
    paddingBlock: space.xxxl,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
  },
  text: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: space.sm,
  },
})
