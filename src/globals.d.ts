declare const __APP_VERSION__: string
declare const __BUILD_ID__: string

/** Build-time branding; see README. */
interface ImportMetaEnv {
  /** Jellyfin server this build is made for; when set, sign-in skips the address step. */
  readonly VITE_JELLYFIN_URL?: string
  /** Emoji or short glyph used as the brand mark in the header, on sign-in and as the favicon. */
  readonly VITE_BRAND_MARK?: string
  /**
   * Provider name of the server's SSO plugin OpenID config; with `VITE_JELLYFIN_URL`, sign-in
   * offers it first. Needs `/sso/*` on this origin proxied to the server (see src/lib/sso.ts).
   */
  readonly VITE_SSO_PROVIDER?: string
}
