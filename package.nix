{
  lib,
  buildNpmPackage,
  nodejs_24,
  # Jellyfin server this build signs into; null asks for one at sign-in.
  jellyfinUrl ? null,
  # Emoji or short glyph for the header mark and favicon; null uses a neutral icon.
  brandMark ? null,
}:

buildNpmPackage {
  pname = "jellyfin-client";
  version = (lib.importJSON ./package.json).version;

  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [
      ./index.html
      ./package.json
      ./package-lock.json
      ./patches
      ./public
      ./src
      ./tsconfig.json
      ./vite.config.ts
    ];
  };

  nodejs = nodejs_24;
  npmDepsHash = lib.fileContents ./package-lock.hash;

  env =
    lib.optionalAttrs (jellyfinUrl != null) { VITE_JELLYFIN_URL = jellyfinUrl; }
    // lib.optionalAttrs (brandMark != null) { VITE_BRAND_MARK = brandMark; };

  installPhase = ''
    runHook preInstall
    cp -r dist $out
    runHook postInstall
  '';

  meta = {
    description = "A fast, minimal web client for Jellyfin";
    homepage = "https://github.com/oliver-ni/jellyfin-client";
    platforms = lib.platforms.all;
  };
}
