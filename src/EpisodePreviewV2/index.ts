import { filterComplex } from 'ffmpeg-filter-compose';
import { copyFileSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { burnSubtitle, mapToArgs } from '../jobs/burnSubtitle';
import { ensureInTmpDir } from '../jobs/common';
import { ffmpeg, ffprobe, getDuration, getFPS, getResolution } from '../jobs/ffmpeg';
import { calculateLoudnormArgs, defaultLoudnormOptions } from '../jobs/loudnorm';
import { render } from '../jobs/render';
import { AssMeta, RenderContext, RenderTemplate } from '../main';
import { parseDuration, parseTimestamp } from '../utils/duration';
import { parseExtraStyles } from '../utils/extraStyle';
import { withExtension } from '../utils/fileExtensions';
import { parseResolution } from '../utils/parsers';
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
  const images = expandList(meta.templateOptions.images || '');
  const interval = parseDuration(meta.templateOptions.interval || '');
  const transition = parseDuration(meta.templateOptions.transition || '');
  const ending = parseDuration(meta.templateOptions.ending || '');
  const trimEnd = meta.templateOptions.trimEnd ? parseTimestamp(meta.templateOptions.trimEnd) : -1;
  const { embedVideo } = meta.templateOptions;
  let fps = 30;
  let origFps: number | undefined;
  let resolution = { width: 1920, height: 1080 };
  let videoDuration = 0;
  let videoResolution = resolution;
  let previewPosition = 'end';
  let previewTimestamp = 0;
  let background = meta.templateOptions.background || images[0];
  if (meta.videoFile) {
    const mediaInfo = await ffprobe(meta.videoFile);
    origFps = getFPS(mediaInfo);
    fps = meta.templateOptions.fps ? parseInt(meta.templateOptions.fps, 10) : origFps;
    videoDuration = getDuration(mediaInfo, true);
    videoResolution = getResolution(mediaInfo) || resolution;
    resolution = meta.templateOptions.resolution ? parseResolution(meta.templateOptions.resolution) : videoResolution;
    previewPosition = meta.templateOptions.position === 'start' ? 'start' : 'end';
    if (trimEnd >= 0) {
      videoDuration = Math.min(videoDuration, trimEnd);
    }
    if (previewPosition === 'start') {
      previewTimestamp = 0;
    } else {
      previewTimestamp = videoDuration - 1 / origFps;
    }
    cx.server.setFile('video', meta.videoFile);
  }
  if (meta.videoFile && !meta.templateOptions.previewOnly && !embedVideo) {
    const subtitleInTmpDir = ensureInTmpDir(cx, meta.subtitleFile, 'subtitle');
    const videoShotPath = resolvePath(cx.tmpDir, 'video_shot.png');
    await ffmpeg([
      ...mapToArgs(meta.templateOptions, 'vargs:'),
      '-i',
      meta.videoFile,
      '-ss',
      String(previewTimestamp),
      '-update',
      '1',
      '-frames:v',
      '1',
      '-filter_complex',
      filterComplex(({ from, filter }) => {
        from().pipe(filter.ass([subtitleInTmpDir]));
      }),
      '-y',
      videoShotPath,
    ]);
    background = cx.server.setFile('video_shot', videoShotPath);
  }
  return {
    entryPoint: resolvePath(__dirname, './Video.tsx'),
    compositionId: embedVideo ? 'EpisodePreviewEmbedded' : 'EpisodePreview',
    inputProps: {
      fps,
      remapFps: origFps !== fps,
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
      transition,
      ending: isNaN(ending) ? transition : ending,
      videoDuration,
      bgm: meta.templateOptions.bgm && {
        src: meta.templateOptions.bgm,
        start: parseTimestamp(meta.templateOptions['bgm.start'] || ''),
      },
      extraStyles: parseExtraStyles('css', meta.templateOptions),
    } as InputProps,
    embedVideo,
    videoResolution,
    trimEnd,
  };
}

export const EpisodePreviewTemplateV2: RenderTemplate = {
  preview: getRenderOptions,
  async render(cx, meta) {
    const previewVideoFile = resolvePath(cx.tmpDir, 'preview.mp4');
    const outputFile = withExtension(meta.subtitleFile, '.subtitle.mp4');
    const renderOptions = await getRenderOptions(cx, meta);
    if (meta.videoFile && renderOptions.embedVideo) {
      const assVideoFile = resolvePath(cx.tmpDir, 'subtitle.mp4');
      cx.server.setFile('video', assVideoFile);
      await burnSubtitle(cx, {
        video: meta.videoFile,
        subtitle: meta.subtitleFile,
        output: assVideoFile,
        inputArgs: mapToArgs(meta.templateOptions, 'vargs:'),
        outputArgs: [...(renderOptions.trimEnd >= 0 ? ['-to', String(renderOptions.trimEnd)] : [])],
      });
    }
    await render(cx, renderOptions, previewVideoFile);
    if (meta.videoFile && !renderOptions.embedVideo) {
      const subtitleInTmpDir = ensureInTmpDir(cx, meta.subtitleFile, 'subtitle');
      await ffmpeg([
        ...mapToArgs(meta.templateOptions, 'vargs:'),
        ...(renderOptions.trimEnd >= 0 ? ['-to', String(renderOptions.trimEnd)] : []),
        '-i',
        meta.videoFile,
        '-r',
        String(renderOptions.inputProps.fps),
        '-i',
        previewVideoFile,
        '-filter_complex',
        await filterComplex(async ({ from, input, filter }) => {
          let [{ v: videoVideo, a: videoAudio }, { v: previewVideo, a: previewAudio }] = input;
          [videoVideo] = from(videoVideo).pipe(filter.ass([subtitleInTmpDir]));
          if (renderOptions.inputProps.remapFps) {
            [videoVideo] = from(videoVideo).pipe(
              filter.minterpolate({
                fps: renderOptions.inputProps.fps,
                mi_mode: 'dup',
              })
            );
          }
          [previewVideo] = from(previewVideo).pipe(filter.scale(renderOptions.videoResolution));
          if (!meta.templateOptions.disableLoudnorm) {
            const videoLoudnormArgs = await calculateLoudnormArgs(meta.videoFile!, defaultLoudnormOptions);
            const previewLoudnormArgs = await calculateLoudnormArgs(previewVideoFile, defaultLoudnormOptions);
            [videoAudio] = from(videoAudio).pipe(filter.loudnorm(videoLoudnormArgs));
            [previewAudio] = from(previewAudio).pipe(filter.loudnorm(previewLoudnormArgs));
          }
          let concatInputs = [videoVideo, videoAudio, previewVideo, previewAudio];
          if (renderOptions.inputProps.previewPosition === 'start') {
            concatInputs = [previewVideo, previewAudio, videoVideo, videoAudio];
          }
          const [finalVideo, finalAudio] = from(...concatInputs).pipe(filter.concat({ n: 2, v: 1, a: 1 }));
          return { finalVideo, finalAudio };
        }),
        '-ar',
        '48k',
        '-y',
        ...mapToArgs(meta.templateOptions, 'args:'),
        '-map',
        '[finalVideo]',
        '-map',
        '[finalAudio]',
        outputFile,
      ]);
    } else {
      copyFileSync(previewVideoFile, outputFile);
    }
  },
};
