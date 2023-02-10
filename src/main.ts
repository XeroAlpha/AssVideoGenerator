import { existsSync, mkdtempSync, rmSync, watch } from 'fs';
import { join as joinPath, resolve as resolvePath } from 'path';
import * as os from 'os';
import { setTimeout as delayedValue } from 'timers/promises';
import { extractAssMeta } from './utils/parseAss';
import { burnSubtitle, mapToArgs } from './jobs/burnSubtitle';
import { withExtension } from './utils/fileExtensions';
import { StaticServer } from './utils/staticServer';
import { startPreview } from './jobs/preview';
import { HelloWorldTemplate } from './HelloWorld';
import { BangumiPVTemplate } from './BangumiPV';
import { EpisodePreviewTemplate } from './EpisodePreview';

export type TemplateMeta = Record<string, string | undefined>;

export interface AssMeta {
  subtitleFile: string;
  videoFile?: string;
  template: string;
  templateOptions: TemplateMeta;
  [key: string]: string | TemplateMeta | undefined;
}

export interface RenderContext {
  tmpDir: string;
  mode: 'render' | 'preview';
  signal?: AbortSignal;
  server: StaticServer;
  [key: string | symbol]: unknown;
}

export interface RenderOptions {
  entrypoint: string;
  compositionId: string;
  inputProps: object | null;
}

export interface RenderTemplate {
  preview?: (
    cx: RenderContext,
    meta: AssMeta
  ) => RenderOptions | Promise<RenderOptions>;
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
        fps: meta.templateOptions.fps
          ? parseInt(meta.templateOptions.fps, 10)
          : undefined,
        supersampling: meta.templateOptions.supersampling
          ? parseInt(meta.templateOptions.supersampling, 10)
          : undefined,
        inputArgs: mapToArgs(meta.templateOptions, 'iargs:'),
        outputArgs: mapToArgs(meta.templateOptions, 'args:')
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
        const source = resolvePath(
          meta.subtitleFile,
          '..',
          meta.templateOptions[`${profile}:src`] || defaultSource
        );
        const output = resolvePath(
          meta.subtitleFile,
          '..',
          meta.templateOptions[`${profile}:out`] || defaultOutput
        );
        if (meta.templateOptions.overwrite === 'yes' || !existsSync(output)) {
          await burnSubtitle(cx, {
            video: source,
            subtitle: meta.subtitleFile,
            output,
            fps: fps ? parseInt(fps, 10) : undefined,
            supersampling: supersampling ? parseInt(supersampling, 10) : undefined,
            inputArgs: mapToArgs(meta.templateOptions, `${profile}:iargs:`),
            outputArgs: mapToArgs(meta.templateOptions, `${profile}:args:`)
          });
        }
      }
    },
  },
  'hello-world': HelloWorldTemplate,
  'bangumi-pv': BangumiPVTemplate,
  'episode-preview': EpisodePreviewTemplate,
};

const tmpDir = mkdtempSync(joinPath(os.tmpdir(), 'remotion-'));
process.on('exit', () => {
  rmSync(tmpDir, { recursive: true, force: true });
});

async function main(action: string, assPath: string) {
  let assMeta = extractAssMeta(assPath);
  let assMetaString = JSON.stringify(assMeta);
  const template = Templates[assMeta.template] || Templates.default;
  const server = new StaticServer();
  const cx: RenderContext = { tmpDir, server, mode: 'render' };
  if (action === 'preview' && template.preview) {
    let shouldOpenBrowser = true;
    cx.mode = 'preview';
    for (;;) {
      const abortController = new AbortController();
      const previewOptions = await template.preview(cx, assMeta);
      cx.signal = abortController.signal;
      const watcher = watch(assPath, () => {
        const newAssMeta = extractAssMeta(assPath);
        const newAssMetaString = JSON.stringify(newAssMeta);
        if (assMetaString === newAssMetaString) {
          return;
        }
        assMeta = newAssMeta;
        assMetaString = newAssMetaString;
        abortController.abort('Subtitle file changed');
      });
      try {
        await startPreview(cx, previewOptions, shouldOpenBrowser);
        throw new Error('Unexpected program exit');
      } catch (err) {
        if (!abortController.signal.aborted) {
          throw err;
        }
      }
      watcher.close();
      await delayedValue(1000);
      shouldOpenBrowser = false;
    }
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
