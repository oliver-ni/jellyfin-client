declare const __APP_VERSION__: string
declare const __BUILD_ID__: string

/** Build-time branding; see README. */
interface ImportMetaEnv {
  /** Jellyfin server this build is made for; when set, sign-in skips the address step. */
  readonly VITE_JELLYFIN_URL?: string
  /** Emoji or short glyph used as the brand mark in the header, sign-in, titles and favicon. */
  readonly VITE_BRAND_MARK?: string
}
