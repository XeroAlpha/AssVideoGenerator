import { resolve as resolvePath } from 'path';
import { ensureInTmpDir } from '../jobs/common';
import { ffmpeg, ffprobe, getFPS, getResolution } from '../jobs/ffmpeg';
import { render } from '../jobs/render';
import { RenderContext, RenderTemplate, AssMeta } from '../main';
import { withExtension } from '../utils/fileExtensions';
import { parseDuration, parseTimestamp } from '../utils/duration';

interface Section {
  name: string;
  content: string;
  style: string;
  styleOptions: Record<string, string | undefined>;
}

interface Page {
  enterTime: number;
  exitTime: number;
  effect: string;
  effectOptions: Record<string, string | undefined>;
  sections: Section[];
}

export interface InputProps {
  fps: number;
  duration: number;
  resolution: { width: number; height: number };
  video: string;
  highlightTime: number;

  kv: string;
  title: string;
  titleOriginal?: string;
  extraStyles: Record<string, Record<string, string | undefined> | undefined>;

  pages: Page[];
}

function parseEqualSeperatedMap(strs: string[]) {
  const map: Record<string, string | undefined> = {};
  strs.forEach((str) => {
    const splited = str.split('=', 2);
    map[splited[0]] = splited.length > 1 ? splited[1] : '';
  });
  return map;
}

function parsePageDefinition(
  def: string,
  meta: Record<string, string | undefined>
) {
  const pages: Page[] = [];
  let pos = 0;
  let totalDuration = 0.5;
  while (pos < def.length) {
    const pageMemberStart = def.indexOf('(', pos);
    if (pageMemberStart < 0) break;
    const [durationStr, effect, ...effectOptions] = def
      .slice(pos, pageMemberStart)
      .split(':');
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
  const kvFile =
    kvPathOrUrl &&
    !kvPathOrUrl.startsWith('http') &&
    resolvePath(meta.subtitleFile, '..', kvPathOrUrl);
  const pages: Page[] = parsePageDefinition(
    meta.templateOptions.pages || '',
    meta.templateOptions
  );
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
    entrypoint: resolvePath(__dirname, './Video.tsx'),
    compositionId: 'BangumiPV',
    inputProps: {
      video: cx.server.getFileUrl('video', meta.videoFile),
      fps: isFinite(customFPS) ? customFPS : fps,
      duration: pages[pages.length - 1].exitTime,
      resolution: resolution || { width: 1920, height: 1080 },
      highlightTime: parseTimestamp(meta.templateOptions.highlight || '0'),
      kv: kvFile ? cx.server.getFileUrl('bangumi-kv', kvFile) : kvPathOrUrl,
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
    await ffmpeg([
      '-i',
      meta.videoFile,
      '-i',
      appendVideoFile,
      '-filter_complex',
      [
        renderOptions.customizedFPS
          ? `[0:v] minterpolate='fps=${renderOptions.customizedFPS}:mi_mode=dup' [ph1v]`
          : `[0:v] null [ph1v]`,
        `[ph1v] ass='${subtitleInTmpDir.replace(/[\\:]/g, '\\$&')}' [ph2v]`,
        `[ph2v] [0:a] [1:v] [1:a] concat='n=2:v=1:a=1' [ph3v] [ph3a]`,
      ].join('; '),
      '-y',
      '-map',
      '[ph3v]',
      '-map',
      '[ph3a]',
      withExtension(meta.subtitleFile, '.subtitle.mp4'),
    ]);
  },
};
