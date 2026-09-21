/** Critically damped springs, on one shared beat. */
export const spring = {
  snappy: { type: 'spring', duration: 0.22, bounce: 0 },
  gentle: { type: 'spring', duration: 0.3, bounce: 0 },
  bouncy: { type: 'spring', duration: 0.32, bounce: 0.3 },
} as const
