import { fork } from 'child_process';
import { resolve as resolvePath, relative as relativePath } from 'path';
import { RenderContext, RenderOptions } from '../main';
import { waitForProcess } from './common';

export async function startPreview(
  cx: RenderContext,
  options: RenderOptions,
  openBrowser: boolean
): Promise<void> {
  await waitForProcess(
    fork(
      resolvePath(__dirname, 'preview-cli.js'),
      [
        'studio',
        '--log', 'verbose',
        relativePath(resolvePath(__dirname, '..', '..'), options.entryPoint),
      ],
      {
        stdio: 'inherit',
        signal: cx.signal,
        env: {
          BROWSER: openBrowser ? undefined : 'none',
          REMOTION_INPUT_PROPS: JSON.stringify(options.inputProps),
          ...cx.server.injectEnv(),
        },
      }
    )
  );
}
