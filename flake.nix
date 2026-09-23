{
  description = "A fast, minimal web client for Jellyfin";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      inherit (nixpkgs) lib;
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      overlays.default = final: _: { jellyfin-client = final.callPackage ./package.nix { }; };

      packages = forAllSystems (pkgs: rec {
        default = jellyfin-client;
        jellyfin-client = pkgs.callPackage ./package.nix { };
      });

      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_24
            pkgs.prefetch-npm-deps
          ];
        };
      });

      checks = forAllSystems (pkgs: {
        build = self.packages.${pkgs.stdenv.hostPlatform.system}.default;
      });

      formatter = forAllSystems (pkgs: pkgs.nixfmt);
    };
}
