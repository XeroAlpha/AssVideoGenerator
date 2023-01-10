import { extname } from 'path';

export function withExtension(path: string, newExtension: string) {
  const extension = extname(path);
  return path.slice(0, -extension.length) + newExtension;
}
