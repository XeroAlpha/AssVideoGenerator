import { RenderContext } from '../main';
import { ensureInTmpDir } from './common';
import { ffmpeg } from './ffmpeg';

export interface BurnSubtitleOptions {
  video: string;
  subtitle: string;
  output: string;
  fps?: number;
  encodeAudio?: boolean;
  supersampling?: number;
  inputArgs?: string[];
  outputArgs?: string[];
}

export function mapToArgs(map: Record<string, string | undefined>, prefix?: string): string[] {
  const args: string[] = [];
  const p = prefix ? prefix : '';
  Object.entries(map).forEach(([k, v]) => {
    if (k.startsWith(p) && v) {
      args.push(`-${k.slice(p.length)}`, v);
    }
  });
  return args;
}

export async function burnSubtitle(cx: RenderContext, options: BurnSubtitleOptions): Promise<void> {
  const subtitleInTmpDir = ensureInTmpDir(cx, options.subtitle, 'subtitle');
  const videoFilters = [`ass='${subtitleInTmpDir.replace(/[\\:]/g, '\\$&')}'`];
  if (options.fps) {
    videoFilters.unshift(`minterpolate='fps=${options.fps}:mi_mode=dup'`);
  }
  if (options.supersampling) {
    videoFilters.unshift(`scale='w=iw*${options.supersampling}:h=ih*${options.supersampling}:flags=neighbor'`);
    videoFilters.push(`scale='w=iw/${options.supersampling}:h=ih/${options.supersampling}:flags=bicubic'`);
  }
  await ffmpeg([
    ...(options.inputArgs || []),
    '-i',
    options.video,
    '-vf',
    videoFilters.join(','),
    '-acodec',
    options.encodeAudio ? 'aac' : 'copy',
    '-y',
    ...(options.outputArgs || []),
    options.output,
  ]);
}
