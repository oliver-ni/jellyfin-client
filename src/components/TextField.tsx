import * as stylex from '@stylexjs/stylex'
import {
  FieldError,
  Input,
  Label,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'

export interface TextFieldProps extends Omit<AriaTextFieldProps, 'className' | 'style'> {
  label: string
  placeholder?: string
  errorMessage?: string
  autoFocus?: boolean
}

export function TextField({
  label,
  placeholder,
  errorMessage,
  autoFocus,
  ...props
}: TextFieldProps) {
  return (
    <AriaTextField {...props} {...stylex.props(styles.field)}>
      <Label {...stylex.props(styles.label)}>{label}</Label>
      <Input placeholder={placeholder} autoFocus={autoFocus} {...stylex.props(styles.input)} />
      <FieldError {...stylex.props(styles.error)}>{errorMessage}</FieldError>
    </AriaTextField>
  )
}

const styles = stylex.create({
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.textMuted,
  },
  input: {
    height: 44,
    paddingInline: space.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: {
      default: colors.surface,
      ':hover': colors.surfaceHover,
      ':focus': colors.bgElevated,
    },
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: {
      default: colors.border,
      ':focus': colors.accent,
      '[data-invalid]': colors.danger,
    },
    borderRadius: radii.md,
    outline: 'none',
    transitionProperty: 'background-color, border-color',
    transitionDuration: motion.fast,
    transitionTimingFunction: motion.ease,
    '::placeholder': {
      color: colors.textFaint,
    },
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
})
