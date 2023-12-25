import { fork } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve as resolvePath, relative as relativePath } from 'path';
import { RenderContext, RenderOptions } from '../main';

export interface Previewer {
  setOnCloseListener(listener?: () => void): void;
  updateOptions(options: RenderOptions): void;
  close(): void;
}

export function startPreviewer(cx: RenderContext, initOptions: RenderOptions): Previewer {
  const inputPropFile = resolvePath(cx.tmpDir, 'inputProps.json');
  const updateOptions = (options: RenderOptions) => {
    writeFileSync(inputPropFile, JSON.stringify(options.inputProps));
  };
  let onClose: (() => void) | undefined;
  updateOptions(initOptions);
  const proc = fork(
    resolvePath(__dirname, 'preview-cli.js'),
    [
      'studio',
      '--log',
      'verbose',
      '--props',
      inputPropFile,
      relativePath(resolvePath(__dirname, '..', '..'), initOptions.entryPoint),
    ],
    {
      stdio: ['inherit', 'pipe', 'inherit', 'ipc'],
      env: {
        ...cx.server.injectEnv(),
      },
    }
  );
  proc.stdout?.on('data', (chunk) => {
    if (chunk.includes('To restart')) {
      if (onClose) onClose();
    }
    process.stdout.write(chunk);
  });
  return {
    setOnCloseListener(listener) {
      onClose = listener;
    },
    updateOptions,
    close() {
      proc.kill();
    },
  };
}
