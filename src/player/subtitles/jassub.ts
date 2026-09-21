import type JASSUB from 'jassub'

export interface AssRendererOptions {
  video: HTMLVideoElement
  canvas: HTMLCanvasElement
  subUrl: string
  fonts?: string[]
  prescaleFactor?: number
}

/**
 * Lazy JASSUB (libass WASM) factory. The worker/wasm URLs are resolved by Vite so the
 * multi-megabyte renderer only downloads when an ASS track is actually selected.
 */
export async function createAssRenderer(opts: AssRendererOptions): Promise<JASSUB> {
  const [{ default: JASSUB }, workerUrl, wasmUrl, modernWasmUrl] = await Promise.all([
    import('jassub'),
    import('jassub/dist/worker/worker.js?worker&url').then((m) => m.default),
    import('jassub/dist/wasm/jassub-worker.wasm?url').then((m) => m.default),
    import('jassub/dist/wasm/jassub-worker-modern.wasm?url').then((m) => m.default),
  ])
  return new JASSUB({
    video: opts.video,
    canvas: opts.canvas,
    subUrl: opts.subUrl,
    fonts: opts.fonts ?? [],
    prescaleFactor: opts.prescaleFactor,
    queryFonts: false,
    workerUrl,
    wasmUrl,
    modernWasmUrl,
  })
}
