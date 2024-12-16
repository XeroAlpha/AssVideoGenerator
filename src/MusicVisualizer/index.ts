import { resolve as resolvePath } from 'path';
import { mapToArgs } from '../jobs/burnSubtitle';
import { ffmpeg, ffprobe, getDuration } from '../jobs/ffmpeg';
import { render } from '../jobs/render';
import { AssMeta, RenderContext, RenderTemplate } from '../main';
import { parseExtraStyles } from '../utils/extraStyle';
import { withExtension } from '../utils/fileExtensions';
import { parseResolutionNormalized } from '../utils/parsers';
import { InputProps } from './Video';

function getLyrics(meta: AssMeta, trackNames: string[]) {
  const lyricTracks: InputProps['lyricTracks'] = trackNames.map((t) => {
    const style = meta.parsedAss.styles.style.find((s) => s.Name === t);
    if (style) {
      return {
        fontName: style.Fontname,
        fontSize: Number(style.Fontsize),
        lyrics: []
      };
    }
    return { lyrics: [] };
  });
  for (const line of meta.parsedAss.events.dialogue) {
    const trackIndex = trackNames.indexOf(line.Style);
    if (trackIndex >= 0) {
      const lyricTrack = lyricTracks[trackIndex];
      const segments = [{ start: line.Start, text: '' }];
      let nextSegmentStart = line.Start;
      line.Text.parsed.forEach((fragment) => {
        const tags = Object.assign({}, ...fragment.tags);
        const lastSegment = segments[segments.length - 1];
        lastSegment.text += fragment.text;
        if (tags.k !== undefined) {
          segments.push({ start: nextSegmentStart, text: '' });
          nextSegmentStart += Number(tags.k) / 100;
        }
      });
      lyricTrack.lyrics.push({
        start: line.Start,
        end: line.End,
        track: trackIndex,
        text: line.Text.combined,
        segments,
        flags: []
      });
    }
  }
  return lyricTracks;
}

function parseInOutDurations(str: string | undefined): InputProps['inOutDurations'] {
  if (str) {
    const parts = str.split(' ').map((e) => Number(e));
    if (parts.every((e) => !Number.isNaN(e))) {
      if (parts.length === 1) {
        return {
          enterDuration: parts[0],
          exitDuration: parts[0],
          enterDelay: 0,
          exitAdvance: 0
        };
      }
      if (parts.length === 2) {
        return {
          enterDuration: parts[0],
          exitDuration: parts[1],
          enterDelay: 0,
          exitAdvance: 0
        };
      }
      if (parts.length === 3) {
        return {
          enterDuration: parts[0],
          exitDuration: parts[1],
          enterDelay: parts[2],
          exitAdvance: parts[2]
        };
      }
      if (parts.length === 4) {
        return {
          enterDuration: parts[0],
          exitDuration: parts[1],
          enterDelay: parts[2],
          exitAdvance: parts[3]
        };
      }
    }
  }
  return {
    enterDuration: 0,
    exitDuration: 0,
    enterDelay: 0,
    exitAdvance: 0
  };
}

async function getRenderOptions(cx: RenderContext, meta: AssMeta) {
  const { audioFile, videoFile } = meta;
  if (!audioFile) {
    throw new Error('Cannot generate video options without media file');
  }
  const mediaInfo = await ffprobe(audioFile);
  const duration = getDuration(mediaInfo);
  const musicUrl = cx.server.setFile('music', audioFile);
  const backgroundType = videoFile ? 'video' : 'image';
  const trackNames = (meta.templateOptions.tracks ?? '').split(',').filter((t) => t !== '');
  return {
    entryPoint: resolvePath(__dirname, './Video.tsx'),
    compositionId: 'MusicVisualizer',
    inputProps: {
      fps: parseInt(meta.templateOptions.fps ?? '60', 10),
      resolution: parseResolutionNormalized(meta.templateOptions.resolution),
      music: musicUrl,
      album: meta.templateOptions.album,
      background: videoFile ?? meta.templateOptions.background ?? meta.templateOptions.album,
      backgroundType,
      backgroundOffset: meta.templateOptions['background.offset'] ? Number(meta.templateOptions['background.offset']) : undefined,
      title: meta.templateOptions.title ?? '',
      artists: meta.templateOptions.artists ?? '',
      lyricTracks: getLyrics(meta, trackNames),
      duration,
      inOutDurations: parseInOutDurations(meta.templateOptions.fade),
      extraStyles: parseExtraStyles('css', meta.templateOptions),
    } as InputProps,
  };
}

export const MusicVisualizer: RenderTemplate = {
  preview: getRenderOptions,
  async render(cx, meta) {
    const previewVideoFile = resolvePath(cx.tmpDir, 'preview.mp4');
    const outputFile = withExtension(meta.subtitleFile, meta.templateOptions.extension ?? '.subtitle.mp4');
    const renderOptions = await getRenderOptions(cx, meta);
    await render(cx, renderOptions, previewVideoFile, { muted: true, enforceAudioTrack: false });
    await ffmpeg([
      '-i',
      previewVideoFile,
      '-i',
      meta.audioFile!,
      '-y',
      ...mapToArgs(meta.templateOptions, 'args:'),
      '-map', '0:v',
      '-map', '1:a',
      outputFile
    ]);
  }
};
