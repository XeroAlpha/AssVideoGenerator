import { Resolution } from "./resolution";

export function parseEqualSeperatedMap(strs: string[]) {
  const map: Record<string, string | undefined> = {};
  strs.forEach((str) => {
    const splited = str.split('=', 2);
    map[splited[0]] = splited.length > 1 ? splited[1] : '';
  });
  return map;
}

const resolutionRegExp = /(\d+)x(\d+)(?:;([\d.]+)%)?/
export function parseResolution(str: string): Resolution {
  const match = resolutionRegExp.exec(str);
  if (match) {
    const [, width, height, scalePercent] = match;
    const res = { width: Number(width), height: Number(height), scale: Number(scalePercent ?? 100) / 100 };
    if (
      isFinite(res.width) && res.width > 0 &&
      isFinite(res.height) && res.height > 0 &&
      isFinite(res.scale) && res.scale > 0
    ) {
      return res;
    }
  }
  return { width: NaN, height: NaN, scale: NaN };
}

export function parseResolutionNormalized(str: string | undefined, defaultSize?: string): Resolution {
  const defaultRes = parseResolution(defaultSize ?? '1920x1080');
  const inputRes = parseResolution(str ?? defaultSize ?? '1920x1080');
  const defaultRatio = defaultRes.width / defaultRes.height;
  const inputRatio = inputRes.width / inputRes.height;
  let scale: number;
  if (inputRatio < defaultRatio) {
    scale = inputRes.width / defaultRes.width;
  } else {
    scale = inputRes.height / defaultRes.height;
  }
  scale *= inputRes.scale / defaultRes.scale;
  return { ...inputRes, scale };
}
