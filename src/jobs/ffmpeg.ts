import { spawn } from 'child_process';
import getMediaInfo from 'ffprobe';
import { waitForProcess } from './common';

export async function ffmpeg(args: string[]): Promise<void> {
  await waitForProcess(
    spawn('ffmpeg', args, {
      stdio: 'inherit',
    })
  );
}

export type ProbeResult = getMediaInfo.FFProbeResult;

export function ffprobe(filePath: string) {
  return getMediaInfo(filePath, {
    path: 'ffprobe',
  });
}

const rationalRegex = /(\d+)\/(\d+)/;
function rationalToNumber(rational: string): number {
  const match = rationalRegex.exec(rational);
  if (match) {
    const [, num, den] = match;
    return parseInt(num, 10) / parseInt(den, 10);
  }
  return NaN;
}

export function getFPS(info: ProbeResult) {
  const videoStreams = info.streams.filter(
    (stream) => stream.codec_type === 'video'
  );
  if (videoStreams.length > 0) {
    return rationalToNumber(videoStreams[0].r_frame_rate);
  }
  return 24;
}

export function getDuration(info: ProbeResult, videoOnly?: boolean) {
  const durations = info.streams.map((stream) => {
    if (stream.codec_type !== 'video' && videoOnly) {
      return 0;
    }
    if (stream.duration) {
      return stream.duration;
    }
    if (stream.tags.DURATION) {
      const durationText = stream.tags.DURATION;
      const pattern = /(\d+):(\d+):([\d.]+)/;
      const patternMatch = durationText.match(pattern);
      if (patternMatch) {
        return (
          parseInt(patternMatch[1], 10) * 3600 +
          parseInt(patternMatch[2], 10) * 60 +
          parseFloat(patternMatch[3])
        );
      }
    }
    return 0;
  });
  return Math.max(...durations);
}

export function getResolution(
  info: ProbeResult
): { width: number; height: number } | null {
  const videoStream = info.streams.find(
    (stream) => stream.codec_type === 'video'
  );
  if (videoStream && videoStream.width && videoStream.height) {
    return {
      width: videoStream.width,
      height: videoStream.height,
    };
  }
  return null;
}
