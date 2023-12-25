import { copyFileSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { ensureInTmpDir } from '../jobs/common';
import { ffmpeg, ffprobe, getDuration, getFPS, getResolution } from '../jobs/ffmpeg';
import { render } from '../jobs/render';
import { AssMeta, RenderContext, RenderTemplate } from '../main';
import { parseDuration, parseTimestamp } from '../utils/duration';
import { parseExtraStyles } from '../utils/extraStyle';
import { withExtension } from '../utils/fileExtensions';
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
  let previewPosition: string | undefined;
  if (meta.videoFile) {
    const mediaInfo = await ffprobe(meta.videoFile);
    fps = getFPS(mediaInfo);
    videoDuration = getDuration(mediaInfo, true);
    const resolutionNullable = getResolution(mediaInfo);
    if (resolutionNullable) {
      resolution = resolutionNullable;
    }
    const subtitleInTmpDir = ensureInTmpDir(cx, meta.subtitleFile, 'subtitle');
    const videoShotPath = resolvePath(cx.tmpDir, 'video_shot.png');
    previewPosition = meta.templateOptions.position === 'start' ? 'start' : 'end';
    await ffmpeg([
      '-i',
      meta.videoFile,
      '-ss',
      previewPosition === 'start' ? '0' : String(videoDuration - 1 / fps),
      '-update',
      '1',
      '-frames:v',
      '1',
      '-filter_complex',
      `ass='${subtitleInTmpDir.replace(/[\\:]/g, '\\$&')}'`,
      '-y',
      videoShotPath,
    ]);
    cx.server.setFile('video_shot', videoShotPath);
  }
  const images = expandList(meta.templateOptions.images || '');
  const background = meta.templateOptions.background || images[images.length - 1];
  const interval = parseDuration(meta.templateOptions.interval || '');
  const textDuration = parseDuration(meta.templateOptions.textDuration || '');
  const transition = parseDuration(meta.templateOptions.transition || '');
  const ending = parseDuration(meta.templateOptions.ending || '');
  return {
    entryPoint: resolvePath(__dirname, './Video.tsx'),
    compositionId: 'EpisodePreview',
    inputProps: {
      fps,
      resolution,
      previewPosition,
      images,
      episodeName: meta.templateOptions.episodeName,
      title: meta.templateOptions.title,
      description: meta.templateOptions.description,
      staff: meta.templateOptions.staff,
      info: meta.templateOptions.info,
      background,
      interval,
      textDuration,
      transition,
      ending: isNaN(ending) ? transition : ending,
      bgm: meta.templateOptions.bgm && {
        src: meta.templateOptions.bgm,
        start: parseTimestamp(meta.templateOptions['bgm.start'] || ''),
        volume: parseFloat(meta.templateOptions['bgm.volume'] || ''),
      },
      extraStyles: parseExtraStyles('css', meta.templateOptions),
    } as InputProps,
  };
}

export const EpisodePreviewTemplateV2: RenderTemplate = {
  preview: getRenderOptions,
  async render(cx, meta) {
    const subtitleInTmpDir = ensureInTmpDir(cx, meta.subtitleFile, 'subtitle');
    const previewVideoFile = resolvePath(cx.tmpDir, 'preview.mp4');
    const outputFile = withExtension(meta.subtitleFile, '.subtitle.mp4');
    const renderOptions = await getRenderOptions(cx, meta);
    await render(cx, renderOptions, previewVideoFile);
    if (meta.videoFile) {
      let concatInputArgs: string = '[ph2v] [0:a] [1:v] [1:a]';
      if (renderOptions.inputProps.previewPosition === 'start') {
        concatInputArgs = '[1:v] [1:a] [ph2v] [0:a]';
      }
      await ffmpeg([
        '-i',
        meta.videoFile,
        '-r',
        String(renderOptions.inputProps.fps),
        '-i',
        previewVideoFile,
        '-filter_complex',
        [
          `[0:v] null [ph1v]`,
          `[ph1v] ass='${subtitleInTmpDir.replace(/[\\:]/g, '\\$&')}' [ph2v]`,
          `${concatInputArgs} concat='n=2:v=1:a=1' [ph3v] [ph3a]`,
        ].join('; '),
        '-y',
        '-map',
        '[ph3v]',
        '-map',
        '[ph3a]',
        outputFile,
      ]);
    } else {
      copyFileSync(previewVideoFile, outputFile);
    }
  },
};
