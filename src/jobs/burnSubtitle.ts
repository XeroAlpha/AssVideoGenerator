import { RenderContext } from '../main';
import { ensureInTmpDir } from './common';
import { ffmpeg } from './ffmpeg';

export interface BurnSubtitleOptions {
  video: string;
  subtitle: string;
  output: string;
  fps?: number;
}

export async function burnSubtitle(
  cx: RenderContext,
  options: BurnSubtitleOptions
): Promise<void> {
  const subtitleInTmpDir = ensureInTmpDir(cx, options.subtitle, 'subtitle');
  const videoFilters = [`ass='${subtitleInTmpDir.replace(/[\\:]/g, '\\$&')}'`];
  if (options.fps) {
    videoFilters.unshift(`minterpolate='fps=${options.fps}:mi_mode=dup'`);
  }
  await ffmpeg([
    '-i',
    options.video,
    '-vf',
    videoFilters.join(','),
    '-y',
    options.output,
  ]);
}
