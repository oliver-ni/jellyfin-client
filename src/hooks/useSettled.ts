import { useState } from 'react'

/** The most recent `value` observed while `settled` was true; holds the previous one otherwise. */
export function useSettled<T>(value: T, settled: boolean): T {
  const [last, setLast] = useState(value)
  if (settled && last !== value) {
    setLast(value)
    return value
  }
  return last
}
