import type {
  CodecProfile,
  DeviceProfile,
  DirectPlayProfile,
  ProfileCondition,
  SubtitleProfile,
  TranscodingProfile,
} from '@/api/gen/types.gen'

interface Capabilities {
  video: string[]
  mp4Audio: string[]
  mkvAudio: string[]
  webmVideo: string[]
  webmAudio: string[]
  hlsAudio: string[]
  mkv: boolean
  hevc: boolean
  av1: boolean
}

let probe: HTMLVideoElement | null = null

function canPlay(type: string): boolean {
  probe ??= document.createElement('video')
  return probe.canPlayType(type) !== ''
}

function mse(type: string): boolean {
  return typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported(type)
}

let cached: Capabilities | null = null

function detect(): Capabilities {
  if (cached) return cached
  const hevc =
    canPlay('video/mp4; codecs="hvc1.1.6.L153.B0"') ||
    canPlay('video/mp4; codecs="hev1.1.6.L153.B0"')
  const av1 = canPlay('video/mp4; codecs="av01.0.08M.08"')
  const vp9 = canPlay('video/webm; codecs="vp9"')

  const video = ['h264']
  if (hevc) video.push('hevc')
  if (av1) video.push('av1')
  if (vp9) video.push('vp9')

  const mp4Audio = ['aac', 'mp3']
  if (canPlay('audio/mp4; codecs="flac"')) mp4Audio.push('flac')
  if (canPlay('audio/mp4; codecs="opus"')) mp4Audio.push('opus')
  if (canPlay('audio/mp4; codecs="alac"')) mp4Audio.push('alac')
  if (canPlay('audio/mp4; codecs="ac-3"')) mp4Audio.push('ac3')
  if (canPlay('audio/mp4; codecs="ec-3"')) mp4Audio.push('eac3')

  const mkv =
    canPlay('video/x-matroska') ||
    canPlay('video/mkv') ||
    /Chrom(e|ium)\//.test(navigator.userAgent)
  const mkvAudio = [...mp4Audio]
  if (canPlay('audio/webm; codecs="vorbis"')) mkvAudio.push('vorbis')
  if (canPlay('audio/flac')) mkvAudio.push('flac')
  if (canPlay('audio/ogg; codecs="opus"')) mkvAudio.push('opus')
  if (canPlay('audio/wav')) mkvAudio.push('pcm_s16le', 'pcm_s24le')

  const webmVideo = ['vp8']
  if (vp9) webmVideo.push('vp9')
  if (av1) webmVideo.push('av1')
  const webmAudio = ['vorbis', 'opus']

  const hlsAudio = ['aac', 'mp3']
  if (mse('audio/mp4; codecs="flac"')) hlsAudio.push('flac')
  if (mse('audio/mp4; codecs="opus"')) hlsAudio.push('opus')
  if (mse('audio/mp4; codecs="ac-3"')) hlsAudio.push('ac3')
  if (mse('audio/mp4; codecs="ec-3"')) hlsAudio.push('eac3')

  cached = {
    video,
    mp4Audio,
    mkvAudio: [...new Set(mkvAudio)],
    webmVideo,
    webmAudio,
    hlsAudio,
    mkv,
    hevc,
    av1,
  }
  return cached
}

function cond(
  Property: ProfileCondition['Property'],
  Condition: ProfileCondition['Condition'],
  Value: string,
): ProfileCondition {
  return { Property, Condition, Value, IsRequired: false }
}

export function buildDeviceProfile(maxBitrate: number): DeviceProfile {
  const caps = detect()

  const directPlay: DirectPlayProfile[] = [
    {
      Container: 'mp4,m4v',
      Type: 'Video',
      VideoCodec: caps.video.join(','),
      AudioCodec: caps.mp4Audio.join(','),
    },
    {
      Container: 'webm',
      Type: 'Video',
      VideoCodec: caps.webmVideo.join(','),
      AudioCodec: caps.webmAudio.join(','),
    },
    { Container: 'mp3', Type: 'Audio' },
    { Container: 'aac,m4a,m4b', Type: 'Audio', AudioCodec: 'aac' },
    { Container: 'flac', Type: 'Audio' },
    { Container: 'ogg,oga', Type: 'Audio', AudioCodec: 'vorbis,opus' },
    { Container: 'wav', Type: 'Audio' },
  ]
  if (caps.mkv) {
    directPlay.splice(1, 0, {
      Container: 'mkv',
      Type: 'Video',
      VideoCodec: caps.video.join(','),
      AudioCodec: caps.mkvAudio.join(','),
    })
  }

  const hlsVideo = ['h264']
  if (caps.hevc) hlsVideo.push('hevc')
  if (caps.av1) hlsVideo.push('av1')

  const transcoding: TranscodingProfile[] = [
    {
      Container: 'mp4',
      Type: 'Video',
      Protocol: 'hls',
      VideoCodec: hlsVideo.join(','),
      AudioCodec: caps.hlsAudio.join(','),
      Context: 'Streaming',
      MaxAudioChannels: '6',
      MinSegments: 2,
      BreakOnNonKeyFrames: true,
    },
    {
      Container: 'ts',
      Type: 'Video',
      Protocol: 'hls',
      VideoCodec: 'h264',
      AudioCodec: 'aac,mp3',
      Context: 'Streaming',
      MaxAudioChannels: '6',
      MinSegments: 2,
      BreakOnNonKeyFrames: true,
    },
    {
      Container: 'mp4',
      Type: 'Video',
      Protocol: 'http',
      VideoCodec: 'h264',
      AudioCodec: 'aac',
      Context: 'Static',
    },
    { Container: 'mp3', Type: 'Audio', AudioCodec: 'mp3', Context: 'Streaming', Protocol: 'http' },
  ]

  const codecProfiles: CodecProfile[] = [
    {
      Type: 'Video',
      Codec: 'h264',
      Conditions: [
        cond('IsAnamorphic', 'NotEquals', 'true'),
        cond('VideoProfile', 'EqualsAny', 'high|main|baseline|constrained baseline'),
        cond('VideoRangeType', 'EqualsAny', 'SDR'),
        cond('VideoLevel', 'LessThanEqual', '52'),
        cond('IsInterlaced', 'NotEquals', 'true'),
      ],
    },
    // Browsers can't switch embedded audio tracks, so a non-default track forces a remux.
    { Type: 'VideoAudio', Conditions: [cond('IsSecondaryAudio', 'Equals', 'false')] },
  ]
  if (caps.hevc) {
    codecProfiles.push({
      Type: 'Video',
      Codec: 'hevc',
      Conditions: [
        cond('IsAnamorphic', 'NotEquals', 'true'),
        cond('VideoProfile', 'EqualsAny', 'main|main 10'),
        cond('VideoRangeType', 'EqualsAny', 'SDR|HDR10|HLG'),
        cond('VideoLevel', 'LessThanEqual', '183'),
        cond('IsInterlaced', 'NotEquals', 'true'),
      ],
    })
  }
  if (caps.av1) {
    codecProfiles.push({
      Type: 'Video',
      Codec: 'av1',
      Conditions: [
        cond('IsAnamorphic', 'NotEquals', 'true'),
        cond('VideoProfile', 'EqualsAny', 'main'),
        cond('VideoRangeType', 'EqualsAny', 'SDR|HDR10|HLG'),
        cond('VideoLevel', 'LessThanEqual', '15'),
      ],
    })
  }

  // Text subtitles are fetched and rendered client-side; bitmap subtitles are burned in.
  const subtitles: SubtitleProfile[] = [
    { Format: 'vtt', Method: 'External' },
    { Format: 'ass', Method: 'External' },
    { Format: 'ssa', Method: 'External' },
    { Format: 'pgssub', Method: 'Encode' },
    { Format: 'dvdsub', Method: 'Encode' },
    { Format: 'dvbsub', Method: 'Encode' },
  ]

  return {
    Name: 'Web',
    MaxStreamingBitrate: maxBitrate,
    MaxStaticBitrate: maxBitrate,
    MusicStreamingTranscodingBitrate: 320_000,
    DirectPlayProfiles: directPlay,
    TranscodingProfiles: transcoding,
    CodecProfiles: codecProfiles,
    SubtitleProfiles: subtitles,
  }
}
