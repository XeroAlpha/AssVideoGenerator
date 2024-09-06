import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { RenderContext, RenderOptions } from '../main';

function formatDuration(ms: number) {
  const milliPart = Math.floor(ms / 100 % 10);
  const secPart = Math.floor(ms / 1000 % 60);
  const minPart = Math.floor(ms / 60000);
  return `${minPart}:${secPart.toString().padStart(2, '0')}.${milliPart}`;
}

type SelectCompositionOptions = Parameters<typeof selectComposition>[0];
type RenderMediaOptions = Parameters<typeof renderMedia>[0];

export async function render(
  cx: RenderContext,
  renderOptions: RenderOptions,
  outputLocation: string,
  extraConfig?: Partial<Parameters<typeof renderMedia>[0]>
): Promise<void> {
  const { entryPoint, compositionId, inputProps } = renderOptions;
  const setStatus = (statusText: string) => {
    if (process.stdout.isTTY) {
      process.stdout.cursorTo(0);
      process.stdout.write(statusText.slice(0, process.stdout.columns));
      process.stdout.clearLine(1);
    } else {
      process.stdout.write(`${statusText}  \r`);
    }
  }
  const bundleLocation = await bundle({
    entryPoint,
    onProgress(percent) {
      setStatus(`Bundling: ${percent.toFixed(0)}%`);
    },
  });
  const browserConfig: Partial<SelectCompositionOptions & RenderMediaOptions> = {
    chromiumOptions: {
      gl: process.platform === 'win32' ? 'angle' : 'angle-egl'
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
  let resolvedConcurrency = 0;
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation,
    inputProps,
    onStart(d) {
      resolvedConcurrency = d.resolvedConcurrency;
    },
    onProgress(p) {
      const renderedFrames = String(p.renderedFrames).padStart(totalFrames.length, ' ');
      const encodedFrames = String(p.encodedFrames).padStart(totalFrames.length, ' ');
      const percentage = Math.floor(p.progress * 100);
      const action = p.stitchStage === 'muxing' ? 'Muxing  ' : 'Encoding';
      const timeLeft = formatDuration(p.renderEstimatedTime / resolvedConcurrency);
      setStatus(`${action}: ${renderedFrames} / ${encodedFrames} / ${totalFrames} (${percentage}%) - ${timeLeft}`);
    },
    timeoutInMilliseconds: 1e9,
    enforceAudioTrack: true,
    concurrency: extraConfig?.concurrency ?? '100%',
    onBrowserLog(log) {
      process.stdout.write(`[${log.type}] ${log.text}`);
    },
    ...browserConfig,
    ...extraConfig
  });
  setStatus('');
  process.stdout.write(`Finished.`);
}
