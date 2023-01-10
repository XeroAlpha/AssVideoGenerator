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

export interface InputProps {
  fps: number;
  resolution: { width: number; height: number };
  video?: string;

  images: string[];
  title: string;
  description: string;
  staff?: string;
  background?: string;
  interval: number;
  textDuration: number;
  transition: number;
  bgm?: {
    src: string;
    start: number;
    volume: number;
  };

  videoDurationInFrames: number;
  imageDurationInFrames: number;
  intervalInFrames: number;
  textDurationInFrames: number;
  transitionInFrames: number;
  durationInFrames: number;
}

function expandList(listPattern: string): string[] {
  const match = /\$\{(\d)+-(\d)+\}/.exec(listPattern);
  if (match) {
    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);
    const step = start > end ? -1 : 1;
    const prefix = listPattern.slice(0, match.index);
    const suffix = listPattern.slice(match.index + match[0].length);
    const result = [];
    for (let i = start; i <= end; i += step) {
      result.push(`${prefix}${i}${suffix}`);
    }
    return result;
  }
  return [listPattern];
}

async function getRenderOptions(cx: RenderContext, meta: AssMeta) {
  let fps = 30;
  let resolution = { width: 1920, height: 1080 };
  let videoDuration = 0;
  if (meta.videoFile) {
    const mediaInfo = await ffprobe(meta.videoFile);
    fps = getFPS(mediaInfo);
    videoDuration = getDuration(mediaInfo, true);
    const resolutionNullable = getResolution(mediaInfo);
    if (resolutionNullable) {
      resolution = resolutionNullable;
    }
  }
  const images = expandList(meta.templateOptions.images || '');
  const background =
    meta.templateOptions.background || images[images.length - 1];
  const interval = parseDuration(meta.templateOptions.interval || '');
  const textDuration = parseDuration(meta.templateOptions.textDuration || '');
  const transition = parseDuration(meta.templateOptions.transition || '');
  return {
    entrypoint: resolvePath(__dirname, './Video.tsx'),
    compositionId: 'EpisodePreview',
    inputProps: {
      fps,
      resolution,
      video: meta.videoFile && cx.server.getFileUrl('video', meta.videoFile),
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
      videoDurationInFrames: Math.floor(fps * videoDuration) - 1,
      imageDurationInFrames: Math.floor(
        fps * (images.length * interval - transition)
      ),
      intervalInFrames: Math.floor(fps * interval),
      textDurationInFrames: Math.floor(fps * textDuration),
      transitionInFrames: Math.floor(fps * transition),
      durationInFrames: Math.floor(
        fps *
          (images.length * interval +
            textDuration +
            transition * (videoDuration > 0 ? 2 : 1))
      ),
    } as InputProps,
  };
}

export const EpisodePreviewTemplate: RenderTemplate = {
  preview: getRenderOptions,
  async render(cx, meta) {
    const renderOptions = await getRenderOptions(cx, meta);
    const subtitleInTmpDir = ensureInTmpDir(cx, meta.subtitleFile, 'subtitle');
    const appendVideoFile = resolvePath(cx.tmpDir, 'append.mp4');
    const outputFile = withExtension(meta.subtitleFile, '.subtitle.mp4');
    await render(cx, renderOptions, appendVideoFile);
    if (meta.videoFile) {
      await ffmpeg([
        '-i',
        meta.videoFile,
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
