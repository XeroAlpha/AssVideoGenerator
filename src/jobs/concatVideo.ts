import { resolve as resolvePath } from 'path';
import { RenderContext } from '../main';
import { ffmpeg, ffprobe, getDuration } from './ffmpeg';

export interface ConcatVideoOption {
  videos: string[];
  audios: string[];
  fps: number;
  output: string;
}

export async function concatVideo(cx: RenderContext, options: ConcatVideoOption): Promise<void> {
  const mergedTmpFile = resolvePath(cx.tmpDir, 'merged.mkv');
  const mergeArgs: string[] = [];
  const videoLinks: string[] = [];
  const audioLinks: string[] = [];
  let inputCounter = 0;
  options.videos.forEach((video) => {
    mergeArgs.push('-i', video);
    videoLinks.push(`[${inputCounter++}:v]`);
  });
  options.audios.forEach((video) => {
    mergeArgs.push('-i', video);
    audioLinks.push(`[${inputCounter++}:a]`);
  });
  mergeArgs.push(
    '-filter_complex',
    [
      `${videoLinks.join(' ')} concat='n=${videoLinks.length}:v=1:a=0' [v]`,
      `${audioLinks.join(' ')} concat='n=${audioLinks.length}:v=0:a=1' [aout]`,
      `[v] minterpolate='fps=${options.fps}:mi_mode=dup' [vout]`,
    ].join('; ')
  );
  mergeArgs.push('-map', '[vout]', '-map', '[aout]', mergedTmpFile);
  await ffmpeg(mergeArgs);
  const mergedDuration = await getDuration(await ffprobe(mergedTmpFile), true);
  await ffmpeg([
    '-i',
    mergedTmpFile,
    '-c:v',
    'copy',
    '-af',
    'apad',
    '-t',
    String(mergedDuration),
    '-y',
    options.output,
  ]);
}
