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
        'preview',
        '--props',
        JSON.stringify(options.inputProps),
        relativePath(resolvePath(__dirname, '..', '..'), options.entrypoint),
      ],
      {
        stdio: 'inherit',
        signal: cx.signal,
        env: {
          BROWSER: openBrowser ? undefined : 'none',
        },
      }
    )
  );
}
