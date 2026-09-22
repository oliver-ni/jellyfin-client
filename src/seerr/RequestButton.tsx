import * as stylex from '@stylexjs/stylex'
import { Plus } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Button } from '@/components/Button'
import type { Title } from './api'
import { requestTitle } from './queries'
import { colors, radii, space } from '@/theme/tokens.stylex'

/** Files one request for a title (a film, or the given seasons of a series). */
export function RequestButton({
  title,
  seasons,
  size,
  children,
}: {
  title: Title
  seasons: number[]
  size?: 'lg'
  children: ReactNode
}) {
  const request = useMutation({ mutationFn: () => requestTitle(title, seasons) })
  return (
    <div {...stylex.props(styles.root)}>
      <Button
        variant="primary"
        size={size}
        style={size === 'lg' && styles.hero}
        isPending={request.isPending}
        onPress={() => request.mutate()}
      >
        <Plus size={size === 'lg' ? 18 : 16} weight="bold" />
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
