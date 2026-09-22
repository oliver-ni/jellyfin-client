#!/usr/bin/env bash
# Throwaway Jellyfin + Seerr for development: generates a small media library with ffmpeg,
# completes both setup wizards and leaves the stack running. Safe to re-run; every step is
# skipped once done. Sign in at http://localhost:8096 as devin / devin.
set -euo pipefail
cd "$(dirname "$0")"

JF=http://localhost:8096
SEERR=http://localhost:5055/api/v1
USER=devin
PASS=devin
AUTH='MediaBrowser Client="seed", Device="seed", DeviceId="seed", Version="1"'

# Real titles so TMDB metadata and artwork resolve; the clips themselves are test patterns.
# Haikyu!! and Mob Psycho 100 are deliberately incomplete so Seerr has seasons to request.
SHOWS=(
  'anime/Cowboy Bebop (1998)|1|1 2 3 4 5'
  'anime/Haikyu!! (2014)|1|1 2 3'
  'anime/Mob Psycho 100 (2016)|1|1 2'
  'anime/Mob Psycho 100 (2016)|2|1 2'
)
MOVIES=('Heat (1995)' 'Paprika (2006)' 'Your Name (2016)')

clip() { # clip <path> <label>
  [ -f "$1" ] && return
  mkdir -p "$(dirname "$1")"
  ffmpeg -v error -y -f lavfi -i "testsrc2=size=640x360:rate=24:duration=30" \
    -f lavfi -i "sine=frequency=440:duration=30" \
    -vf "drawtext=text='$2':fontsize=28:fontcolor=white:x=(w-tw)/2:y=(h-th)/2:box=1:boxcolor=black@0.6" \
    -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -shortest "$1"
}

media() {
  local spec dir season eps ep title
  for spec in "${SHOWS[@]}"; do
    IFS='|' read -r dir season eps <<<"$spec"
    title=${dir#anime/}
    title=${title% (*}
    for ep in $eps; do
      clip "$(printf 'data/media/%s/Season %02d/%s S%02dE%02d.mp4' "$dir" "$season" "$title" "$season" "$ep")" \
        "$(printf '%s S%02dE%02d' "$title" "$season" "$ep")"
    done
  done
  for title in "${MOVIES[@]}"; do
    clip "data/media/movies/$title/$title.mp4" "$title"
  done
}

wait_for() { # wait_for <url> [seconds]
  local i
  for ((i = 0; i < ${2:-120}; i++)); do
    curl -sf -o /dev/null "$1" && return
    sleep 1
  done
  echo "timed out waiting for $1" >&2
  exit 1
}

jf() { # jf <method> <path> [json]
  curl -sf -X "$1" "$JF$2" -H "Authorization: $AUTH${TOKEN:+, Token=\"$TOKEN\"}" \
    -H 'Content-Type: application/json' ${3:+--data "$3"}
}

jellyfin() {
  wait_for "$JF/System/Info/Public"
  if [ "$(curl -sf "$JF/System/Info/Public" | jq .StartupWizardCompleted)" != true ]; then
    jf POST /Startup/Configuration '{"UICulture":"en-US","MetadataCountryCode":"US","PreferredMetadataLanguage":"en"}'
    jf GET /Startup/User >/dev/null
    jf POST /Startup/User "{\"Name\":\"$USER\",\"Password\":\"$PASS\"}"
    jf POST /Startup/RemoteAccess '{"EnableRemoteAccess":true,"EnableAutomaticPortMapping":false}'
    jf POST /Startup/Complete
  fi
  TOKEN=$(jf POST /Users/AuthenticateByName "{\"Username\":\"$USER\",\"Pw\":\"$PASS\"}" | jq -r .AccessToken)

  local have
  have=$(jf GET /Library/VirtualFolders | jq -r '.[].Name')
  grep -qx Anime <<<"$have" || jf POST '/Library/VirtualFolders?name=Anime&collectionType=tvshows&paths=/media/anime&refreshLibrary=false' '{"LibraryOptions":{}}'
  grep -qx Movies <<<"$have" || jf POST '/Library/VirtualFolders?name=Movies&collectionType=movies&paths=/media/movies&refreshLibrary=false' '{"LibraryOptions":{}}'
  jf POST /Library/Refresh

  local want count idle i
  want=$(find data/media -name '*.mp4' | wc -l)
  for ((i = 0; i < 300; i++)); do
    count=$(jf GET '/Items?Recursive=true&IncludeItemTypes=Episode,Movie&Limit=0' | jq .TotalRecordCount)
    idle=$(jf GET /ScheduledTasks | jq '[.[] | select(.Key == "RefreshLibrary") | .State == "Idle"] | all')
    [ "$count" -ge "$want" ] && [ "$idle" = true ] && break
    sleep 2
  done
  echo "jellyfin: $count items"
}

seerr() {
  wait_for "$SEERR/status" 180
  [ "$(curl -sf "$SEERR/settings/public" | jq .initialized)" = true ] && return
  local jar
  jar=$(mktemp)
  # The first sign-in also points Seerr at Jellyfin; later ones must omit the hostname.
  local login="{\"username\":\"$USER\",\"password\":\"$PASS\""
  curl -sf -c "$jar" -H 'Content-Type: application/json' "$SEERR/auth/jellyfin" \
    --data "$login,\"hostname\":\"jellyfin\",\"port\":8096,\"useSsl\":false,\"urlBase\":\"\",\"serverType\":2}" >/dev/null ||
    curl -sf -c "$jar" -H 'Content-Type: application/json' "$SEERR/auth/jellyfin" --data "$login}" >/dev/null
  local ids
  ids=$(curl -sf -b "$jar" "$SEERR/settings/jellyfin/library?sync=true" | jq -r 'map(.id) | join(",")')
  curl -sf -b "$jar" "$SEERR/settings/jellyfin/library?enable=$ids" >/dev/null
  curl -sf -b "$jar" -X POST -H 'Content-Type: application/json' "$SEERR/settings/jellyfin/sync" --data '{"start":true}' >/dev/null
  curl -sf -b "$jar" -X POST -H 'Content-Type: application/json' "$SEERR/settings/initialize" >/dev/null
  rm -f "$jar"
  echo "seerr: initialized"
}

media
mkdir -p data/seerr # Seerr runs unprivileged; Docker would otherwise create this root-owned
docker compose up -d
jellyfin
seerr
