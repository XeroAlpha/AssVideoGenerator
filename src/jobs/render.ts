import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { existsSync } from 'fs';
import { cpus } from 'os';
import { RenderContext, RenderOptions } from '../main';

export async function render(
  cx: RenderContext,
  renderOptions: RenderOptions,
  outputLocation: string,
  concurrency?: number
): Promise<void> {
  const { entryPoint, compositionId, inputProps } = renderOptions;
  const tty = process.stdout;
  const bundleLocation = await bundle({
    entryPoint,
    onProgress(percent) {
      tty.write(`Progress: ${percent.toFixed(0)}% - bundling      \r`);
    },
  });
  const browserConfig = {
    browserExecutable: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ].find((p) => existsSync(p)),
    chromiumOptions: {
      headless: true,
    },
    envVariables: {
      ...cx.server.injectEnv(),
    },
  };
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
    ...browserConfig,
  });
  const totalFrames = String(composition.durationInFrames);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation,
    inputProps,
    onProgress(p) {
      const frames = p.renderedFrames || p.encodedFrames;
      tty.write(
        `Progress: ${String(frames).padStart(totalFrames.length, ' ')} / ${totalFrames} (${(p.progress * 100).toFixed(
          0
        )}%) - ${p.stitchStage}      \r`
      );
    },
    enforceAudioTrack: true,
    concurrency: Math.ceil(Math.max(1, cpus().length * (concurrency ?? 0.5))),
    logLevel: 'verbose',
    ...browserConfig,
  });
  tty.write(`\nFinished.`);
}
