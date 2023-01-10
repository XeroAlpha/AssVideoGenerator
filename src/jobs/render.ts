import { bundle } from '@remotion/bundler';
import {
  getCompositions,
  renderFrames,
  stitchFramesToVideo,
} from '@remotion/renderer';
import { RenderContext, RenderOptions } from '../main';

export async function render(
  cx: RenderContext,
  renderOptions: RenderOptions,
  outFile: string
): Promise<void> {
  const { entrypoint, compositionId, inputProps } = renderOptions;
  const bundled = await bundle(entrypoint, () => undefined, {
    enableCaching: false,
  });
  const compositions = await getCompositions(bundled, { inputProps });
  const composition = compositions.find((c) => c.id === compositionId);
  if (!composition) {
    throw new Error(`No video called ${compositionId}`);
  }
  const { assetsInfo } = await renderFrames({
    config: composition,
    webpackBundle: bundled,
    onStart: () => console.log('Rendering frames...'),
    onFrameUpdate: (f) => {
      if (f % 10 === 0) {
        console.log(`Rendered frame ${f}/${composition.durationInFrames}`);
      }
    },
    parallelism: 1,
    outputDir: cx.tmpDir,
    inputProps,
    composition,
    imageFormat: 'jpeg',
    browserExecutable:
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    dumpBrowserLogs: true,
    chromiumOptions: {
      headless: true,
    },
  });
  console.log(`Encoding video...`);
  await stitchFramesToVideo({
    dir: cx.tmpDir,
    force: true,
    fps: composition.fps,
    height: composition.height,
    width: composition.width,
    outputLocation: outFile,
    assetsInfo,
  });
}
