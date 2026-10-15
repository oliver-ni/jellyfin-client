import * as stylex from '@stylexjs/stylex'
import { Plus } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { colors, radii, space } from '@/theme/tokens.stylex'
import { Button, type ButtonSize } from './Button'

/** Files a request (a film, seasons of a series, a manga) with its pending and error states. */
export function RequestButton({
  request: send,
  size,
  children,
}: {
  request: () => Promise<unknown>
  size?: ButtonSize
  children: ReactNode
}) {
  const request = useMutation({ mutationFn: send })
  return (
    <div {...stylex.props(styles.root)}>
      <Button
        variant="primary"
        size={size}
        style={size === 'lg' && styles.hero}
        isPending={request.isPending}
        onPress={() => request.mutate()}
      >
        <Plus size={size === 'lg' ? 18 : size === 'sm' ? 14 : 16} weight="bold" />
        {request.isPending ? 'Requesting…' : children}
      </Button>
      {request.isError && <span {...stylex.props(styles.error)}>{request.error.message}</span>}
    </div>
  )
}

const styles = stylex.create({
  root: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  hero: {
    height: 46,
    borderRadius: radii.full,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
})
