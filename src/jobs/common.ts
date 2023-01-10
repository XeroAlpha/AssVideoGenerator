import { ChildProcess } from 'child_process';
import { copyFileSync } from 'fs';
import { resolve as resolvePath, join as joinPath, extname } from 'path';
import { RenderContext } from '../main';

export function ensureInTmpDir(cx: RenderContext, path: string, hint: string) {
  const resolvedPath = resolvePath(path);
  if (resolvedPath.startsWith(cx.tmpDir)) {
    return resolvedPath;
  }
  const tmpFile = joinPath(cx.tmpDir, hint + extname(resolvedPath));
  copyFileSync(resolvedPath, tmpFile);
  return tmpFile;
}

export function waitForProcess(proc: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    proc.on('error', (err) => reject(err));
    proc.on('exit', () => resolve());
  });
}
