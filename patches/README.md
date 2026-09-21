# Dependency patches

Applied by `patch-package` on `npm install`.

## motion-dom

`NativeAnimationExtended.updateMotionValue()` samples the interrupted animation at
`time.now() - this.startTime`. When a WAAPI animation is stopped before the browser has
started it (`animation.startTime === null`, e.g. a React StrictMode / Suspense remount in
the same tick as `animate`), `Number(null)` is `0` and the sample lands at the animation's
end value. The motion value then reads as already at its target while `latestValues` still
holds the initial value, so the element never animates in and stays at the initial style.

The patch treats a pending animation as elapsed `0`.
