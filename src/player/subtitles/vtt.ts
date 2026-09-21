export interface Cue {
  start: number
  end: number
  /** Cue text with VTT/HTML tags stripped except line breaks. */
  lines: string[]
}

const TIME_RE = /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/

function parseTimestamp(raw: string): number | null {
  const m = TIME_RE.exec(raw.trim())
  if (!m) return null
  const [, h, min, s, ms] = m
  return Number(h ?? 0) * 3600 + Number(min) * 60 + Number(s) + Number(ms.padEnd(3, '0')) / 1000
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': '\u00a0',
  '&lrm;': '\u200e',
  '&rlm;': '\u200f',
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\{\\[^}]*\}/g, '')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? e)
}

/** Minimal WebVTT parser: cue timings + text; ignores regions, styles and positioning. */
export function parseVtt(input: string): Cue[] {
  const cues: Cue[] = []
  const blocks = input.replace(/\r\n?/g, '\n').split(/\n{2,}/)
  for (const block of blocks) {
    const lines = block.split('\n')
    const idx = lines.findIndex((l) => l.includes('-->'))
    if (idx === -1) continue
    const [startRaw, endRaw = ''] = lines[idx].split('-->')
    const start = parseTimestamp(startRaw)
    const end = parseTimestamp(endRaw.split(/\s+/).filter(Boolean)[0] ?? '')
    if (start == null || end == null) continue
    const text = lines
      .slice(idx + 1)
      .map(cleanText)
      .filter((l) => l.length > 0)
    if (text.length === 0) continue
    cues.push({ start, end, lines: text })
  }
  cues.sort((a, b) => a.start - b.start)
  return cues
}

/** Cues active at `time`. Linear scan is fine for subtitle-sized lists. */
export function cuesAt(cues: Cue[], time: number): Cue[] {
  const out: Cue[] = []
  for (const cue of cues) {
    if (cue.start > time) break
    if (time < cue.end) out.push(cue)
  }
  return out
}
