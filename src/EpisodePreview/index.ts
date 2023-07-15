import { resolve as resolvePath } from 'path';
import { copyFileSync } from 'fs';
import { ensureInTmpDir } from '../jobs/common';
import {
  ffmpeg,
  ffprobe,
  getDuration,
  getFPS,
  getResolution,
} from '../jobs/ffmpeg';
import { render } from '../jobs/render';
import { RenderContext, RenderTemplate, AssMeta } from '../main';
import { withExtension } from '../utils/fileExtensions';
import { parseDuration, parseTimestamp } from '../utils/duration';
import { InputProps } from './Video';

function expandList(listPattern: string): string[] {
  const match = /\$\{([\d-,]+)\}/.exec(listPattern);
  if (match) {
    const parts = match[1].split(',');
    const prefix = listPattern.slice(0, match.index);
    const suffix = listPattern.slice(match.index + match[0].length);
    const result = [] as string[];
    parts.forEach((e) => {
      const dashPos = e.indexOf('-');
      if (dashPos >= 0) {
        const start = parseInt(e.slice(0, dashPos), 10);
        const end = parseInt(e.slice(dashPos + 1), 10);
        const step = start > end ? -1 : 1;
        for (let i = start; i <= end; i += step) {
          result.push(`${prefix}${i}${suffix}`);
        }
      } else {
        result.push(`${prefix}${e}${suffix}`);
      }
    });
    return result;
  }
  return [listPattern];
}

async function getRenderOptions(cx: RenderContext, meta: AssMeta) {
  let fps = 30;
  let resolution = { width: 1920, height: 1080 };
  let videoDuration = 0;
  let videoEnd;
  if (meta.videoFile) {
    const mediaInfo = await ffprobe(meta.videoFile);
    fps = getFPS(mediaInfo);
    videoDuration = getDuration(mediaInfo, true);
    const resolutionNullable = getResolution(mediaInfo);
    if (resolutionNullable) {
      resolution = resolutionNullable;
    }
    const subtitleInTmpDir = ensureInTmpDir(cx, meta.subtitleFile, 'subtitle');
    const videoEndShot = resolvePath(cx.tmpDir, 'end.png');
    await ffmpeg([
      '-i',
      meta.videoFile,
      '-ss',
      String(videoDuration - 1 / fps),
      '-update',
      '1',
      '-frames:v',
      '1',
      '-filter_complex',
      `ass='${subtitleInTmpDir.replace(/[\\:]/g, '\\$&')}'`,
      '-y',
      videoEndShot,
    ]);
    videoEnd = cx.server.getFileUrl('video_end', videoEndShot);
  }
  const images = expandList(meta.templateOptions.images || '');
  const background =
    meta.templateOptions.background || images[images.length - 1];
  const interval = parseDuration(meta.templateOptions.interval || '');
  const textDuration = parseDuration(meta.templateOptions.textDuration || '');
  const transition = parseDuration(meta.templateOptions.transition || '');
  return {
    entryPoint: resolvePath(__dirname, './Video.tsx'),
    compositionId: 'EpisodePreview',
    inputProps: {
      fps,
      resolution,
      videoEnd,
      images: images.map((pathOrUrl, i) =>
        cx.server.toUrlIfNecessary(`image_${i}`, pathOrUrl)
      ),
      title: meta.templateOptions.title,
      description: meta.templateOptions.description,
      staff: meta.templateOptions.staff,
      background: cx.server.toUrlIfNecessary('background', background),
      interval,
      textDuration,
      transition,
      bgm: meta.templateOptions.bgm && {
        src: cx.server.getFileUrl('bgm', meta.templateOptions.bgm),
        start: parseTimestamp(meta.templateOptions['bgm.start'] || ''),
        volume: parseFloat(meta.templateOptions['bgm.volume'] || ''),
      },
    } as InputProps,
  };
}

export const EpisodePreviewTemplate: RenderTemplate = {
  preview: getRenderOptions,
  async render(cx, meta) {
    const subtitleInTmpDir = ensureInTmpDir(cx, meta.subtitleFile, 'subtitle');
    const appendVideoFile = resolvePath(cx.tmpDir, 'append.mp4');
    const outputFile = withExtension(meta.subtitleFile, '.subtitle.mp4');
    const renderOptions = await getRenderOptions(cx, meta);
    await render(cx, renderOptions, appendVideoFile);
    if (meta.videoFile) {
      await ffmpeg([
        '-i',
        meta.videoFile,
        '-r',
        String(renderOptions.inputProps.fps),
        '-i',
        appendVideoFile,
        '-filter_complex',
        [
          `[0:v] null [ph1v]`,
          `[ph1v] ass='${subtitleInTmpDir.replace(/[\\:]/g, '\\$&')}' [ph2v]`,
          `[ph2v] [0:a] [1:v] [1:a] concat='n=2:v=1:a=1' [ph3v] [ph3a]`,
        ].join('; '),
        '-y',
        '-map',
        '[ph3v]',
        '-map',
        '[ph3a]',
        outputFile,
      ]);
    } else {
      copyFileSync(appendVideoFile, outputFile);
    }
  },
};
