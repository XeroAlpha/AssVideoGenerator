import { z } from 'zod';
import { parseEqualSeperatedMap } from './parsers';

export const extraStyleMapSchema = z.record(z.string(), z.record(z.string(), z.string().optional()).optional());

export type ExtraStyleMap = z.infer<typeof extraStyleMapSchema>;

export function parseExtraStyles(prefix: string, map: Record<string, string | undefined>) {
  const extraStyles: ExtraStyleMap = {};
  Object.entries(map)
    .filter(([k]) => k.startsWith(`${prefix}.`))
    .forEach(([k, v]) => {
      const id = k.slice(prefix.length + 1);
      const style = extraStyles[id] || {};
      Object.assign(style, parseEqualSeperatedMap((v || '').split(';')));
      extraStyles[id] = style;
    });
  return extraStyles;
}
