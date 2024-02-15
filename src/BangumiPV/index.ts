import { resolve as resolvePath } from 'path';
import { mapToArgs } from '../jobs/burnSubtitle';
import { ensureInTmpDir } from '../jobs/common';
import { ffmpeg, ffprobe, getFPS, getResolution } from '../jobs/ffmpeg';
import { calculateLoudnormArgs, defaultLoudnormOptions } from '../jobs/loudnorm';
import { render } from '../jobs/render';
import { AssMeta, RenderContext, RenderTemplate } from '../main';
import { parseDuration, parseTimestamp } from '../utils/duration';
import { withExtension } from '../utils/fileExtensions';
import { InputProps, Page } from './Video';

function parseEqualSeperatedMap(strs: string[]) {
  const map: Record<string, string | undefined> = {};
  strs.forEach((str) => {
    const splited = str.split('=', 2);
    map[splited[0]] = splited.length > 1 ? splited[1] : '';
  });
  return map;
}

function parsePageDefinition(def: string, meta: Record<string, string | undefined>) {
  const pages: Page[] = [];
  let pos = 0;
  let totalDuration = 0.5;
  while (pos < def.length) {
    const pageMemberStart = def.indexOf('(', pos);
    if (pageMemberStart < 0) break;
    const [durationStr, effect, ...effectOptions] = def.slice(pos, pageMemberStart).split(':');
    const pageMemberEnd = def.indexOf(')', pageMemberStart + 1);
    if (pageMemberEnd < 0) break;
    const duration = parseDuration(durationStr);
    const page: Page = {
      enterTime: totalDuration,
      exitTime: totalDuration + duration,
      effect: effect || '',
      effectOptions: parseEqualSeperatedMap(effectOptions),
      sections: def
        .slice(pageMemberStart + 1, pageMemberEnd)
        .split(',')
        .map((section) => {
          const [nameAndAlias, style, ...styleOptions] = section.split(':');
          const nameSplit = nameAndAlias.split('=');
          const nameRef = nameSplit.pop() || '';
          const displayName = nameSplit.length ? nameSplit.join('=') : nameRef;
          return {
            name: displayName,
            content: meta[nameRef] || '',
            style: style || '',
            styleOptions: parseEqualSeperatedMap(styleOptions),
          };
        }),
    };
    pages.push(page);
    totalDuration += duration;
    const commaPos = def.indexOf(',', pageMemberEnd + 1);
    if (commaPos < 0) break;
    pos = commaPos + 1;
  }
  return pages;
}

async function getRenderOptions(cx: RenderContext, meta: AssMeta) {
  if (!meta.videoFile) throw new Error('Video is not provided');
  const mediaInfo = await ffprobe(meta.videoFile);
  const fps = getFPS(mediaInfo);
  const resolution = getResolution(mediaInfo);
  const kvPathOrUrl = meta.templateOptions.kv;
  const highlightVideo = meta.templateOptions.highlightVideo || meta.videoFile;
  const pages: Page[] = parsePageDefinition(meta.templateOptions.pages || '', meta.templateOptions);
  const customFPS = parseFloat(meta.templateOptions.fps || '');
  const extraStyles: InputProps['extraStyles'] = {};
  Object.entries(meta.templateOptions)
    .filter(([k]) => k.startsWith('css.'))
    .forEach(([k, v]) => {
      const id = k.slice(4);
      const style = extraStyles[id] || {};
      Object.assign(style, parseEqualSeperatedMap((v || '').split(';')));
      extraStyles[id] = style;
    });
  if (!pages.length) {
    throw new Error('Should at least have one page');
  }
  return {
    entryPoint: resolvePath(__dirname, './Video.tsx'),
    compositionId: 'BangumiPV',
    inputProps: {
      video: highlightVideo,
      fps: isFinite(customFPS) ? customFPS : fps,
      duration: pages[pages.length - 1].exitTime,
      resolution: resolution || { width: 1920, height: 1080 },
      highlightTime: parseTimestamp(meta.templateOptions.highlight || '0'),
      kv: kvPathOrUrl,
      title: meta.templateOptions.title,
      titleOriginal: meta.templateOptions.title_orig,
      extraStyles,
      pages,
    } as InputProps,
    customizedFPS: isFinite(customFPS) ? customFPS : 0,
  };
}

export const BangumiPVTemplate: RenderTemplate = {
  preview: getRenderOptions,
  async render(cx, meta) {
    if (!meta.videoFile) throw new Error('Video is not provided');
    const renderOptions = await getRenderOptions(cx, meta);
    const subtitleInTmpDir = ensureInTmpDir(cx, meta.subtitleFile, 'subtitle');
    const appendVideoFile = resolvePath(cx.tmpDir, 'append.mp4');
    await render(cx, renderOptions, appendVideoFile);
    const enableLoudnorm = !meta.templateOptions.disableLoudnorm;
    const videoLoudnormArgs = enableLoudnorm && (await calculateLoudnormArgs(meta.videoFile, defaultLoudnormOptions));
    await ffmpeg([
      ...mapToArgs(meta.templateOptions, 'vargs:'),
      '-i',
      meta.videoFile,
      '-r',
      String(renderOptions.inputProps.fps),
      '-i',
      appendVideoFile,
      '-filter_complex',
      [
        renderOptions.customizedFPS
          ? `[0:v] minterpolate='fps=${renderOptions.customizedFPS}:mi_mode=dup' [video_v]`
          : `[0:v] null [video_v]`,
        `[video_v] ass='${subtitleInTmpDir.replace(/[\\:]/g, '\\$&')}' [subtitled_v]`,
        `[subtitled_v][0:a][1:v][1:a] concat='n=2:v=1:a=1' [final_v][concat_a]`,
        enableLoudnorm ? `[concat_a] loudnorm=${videoLoudnormArgs} [final_a]` : '[concat_a] cnull [final_a]',
      ].join('; '),
      '-ar',
      '48k',
      '-y',
      ...mapToArgs(meta.templateOptions, 'args:'),
      '-map',
      '[final_v]',
      '-map',
      '[final_a]',
      withExtension(meta.subtitleFile, '.subtitle.mp4'),
    ]);
  },
};
