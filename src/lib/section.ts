/** The two halves of the app: video from Jellyfin, manga from Komga. Each has its own tabs. */
export type Section = 'watch' | 'read'

export const SECTIONS: readonly { key: Section; label: string }[] = [
  { key: 'watch', label: 'Watch' },
  { key: 'read', label: 'Read' },
]

export const sectionOf = (pathname: string): Section =>
  pathname === '/read' || pathname.startsWith('/read/') ? 'read' : 'watch'
