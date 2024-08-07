import { existsSync, mkdtempSync, rmSync, watch } from 'fs';
import * as os from 'os';
import { join as joinPath, resolve as resolvePath } from 'path';
import { setTimeout as delayedValue } from 'timers/promises';
import { BangumiPVTemplate } from './BangumiPV';
import { EpisodePreviewTemplate } from './EpisodePreview';
import { EpisodePreviewTemplateV2 } from './EpisodePreviewV2';
import { HelloWorldTemplate } from './HelloWorld';
import { burnSubtitle, mapToArgs } from './jobs/burnSubtitle';
import { Previewer, startPreviewer } from './jobs/preview';
import { MusicVisualizer } from './MusicVisualizer';
import { withExtension } from './utils/fileExtensions';
import { AssMeta, extractAssMeta } from './utils/parseAss';
import { StaticServer } from './utils/staticServer';

export { AssMeta };

export interface RenderContext {
  tmpDir: string;
  mode: 'render' | 'preview';
  signal?: AbortSignal;
  server: StaticServer;
  [key: string | symbol]: unknown;
}

export interface RenderOptions {
  entryPoint: string;
  compositionId: string;
  inputProps: Record<string, unknown>;
}

export interface RenderTemplate {
  preview?: (cx: RenderContext, meta: AssMeta) => RenderOptions | Promise<RenderOptions>;
  render?: (cx: RenderContext, meta: AssMeta) => Promise<void>;
}

const Templates: Record<string, RenderTemplate> = {
  default: {
    render(cx, meta) {
      if (!meta.videoFile) throw new Error('Video is not provided');
      return burnSubtitle(cx, {
        video: meta.videoFile,
        subtitle: meta.subtitleFile,
        output: withExtension(meta.subtitleFile, '.subtitle.mp4'),
        fps: meta.templateOptions.fps ? parseFloat(meta.templateOptions.fps) : undefined,
        supersampling: meta.templateOptions.supersampling
          ? parseInt(meta.templateOptions.supersampling, 10)
          : undefined,
        inputArgs: mapToArgs(meta.templateOptions, 'iargs:'),
        outputArgs: mapToArgs(meta.templateOptions, 'args:'),
      });
    },
  },
  'multi-render': {
    async render(cx, meta) {
      if (!meta.videoFile) throw new Error('Video is not provided');
      const profiles = String(meta.templateOptions.profiles || '').split(',');
      const defaultSource = meta.videoFile;
      const defaultOutput = withExtension(meta.subtitleFile, '.subtitle.mp4');
      for (const profile of profiles) {
        const fps = meta.templateOptions[`${profile}:fps`];
        const supersampling = meta.templateOptions[`${profile}:supersampling`];
        const source = resolvePath(meta.subtitleFile, '..', meta.templateOptions[`${profile}:src`] || defaultSource);
        const output = resolvePath(meta.subtitleFile, '..', meta.templateOptions[`${profile}:out`] || defaultOutput);
        if (meta.templateOptions.overwrite === 'yes' || !existsSync(output)) {
          await burnSubtitle(cx, {
            video: source,
            subtitle: meta.subtitleFile,
            output,
            fps: fps ? parseInt(fps, 10) : undefined,
            supersampling: supersampling ? parseInt(supersampling, 10) : undefined,
            inputArgs: mapToArgs(meta.templateOptions, `${profile}:iargs:`),
            outputArgs: mapToArgs(meta.templateOptions, `${profile}:args:`),
          });
        }
      }
    },
  },
  'hello-world': HelloWorldTemplate,
  'bangumi-pv': BangumiPVTemplate,
  'episode-preview': EpisodePreviewTemplate,
  'episode-preview-v2': EpisodePreviewTemplateV2,
  'music-visualizer': MusicVisualizer,
};

const tmpDir = mkdtempSync(joinPath(os.tmpdir(), 'remotion-'));
process.on('exit', () => {
  rmSync(tmpDir, { recursive: true, force: true });
});

async function main(action: string, assPath: string) {
  let assMeta = extractAssMeta(assPath);
  const template = Templates[assMeta.template] || Templates.default;
  const server = new StaticServer();
  const cx: RenderContext = { tmpDir, server, mode: 'render' };
  server.setRootDir(resolvePath(assPath, '..'));
  if (action === 'preview' && template.preview) {
    let previewer: Previewer | undefined;
    let finished = false;
    cx.mode = 'preview';
    while (!finished) {
      const abortController = new AbortController();
      const previewOptions = await template.preview(cx, assMeta);
      cx.signal = abortController.signal;
      let watchTriggerTimer: NodeJS.Timer | null = null;
      const watcher = watch(assPath, () => {
        if (watchTriggerTimer !== null) {
          clearInterval(watchTriggerTimer);
        }
        watchTriggerTimer = setInterval(() => {
          const newAssMeta = extractAssMeta(assPath);
          if (newAssMeta.template !== assMeta.template) {
            console.log(`Template is changed to '${newAssMeta.template}', please restart manaually.`);
            return;
          }
          assMeta = newAssMeta;
          if (watchTriggerTimer) {
            clearInterval(watchTriggerTimer);
          }
          abortController.abort();
        }, 100);
      });
      if (previewer) {
        previewer.updateOptions(previewOptions);
      } else {
        previewer = startPreviewer(cx, previewOptions);
      }
      previewer.setOnCloseListener(() => {
        finished = true;
        abortController.abort();
      });
      await new Promise<void>((resolve) => {
        abortController.signal.addEventListener('abort', () => resolve());
      });
      watcher.close();
      await delayedValue(1000);
    }
    previewer?.close();
  } else if (action === 'render' && template.render) {
    await template.render(cx, assMeta);
  }
  server.close();
}

main(...(process.argv.slice(2) as Parameters<typeof main>))
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
