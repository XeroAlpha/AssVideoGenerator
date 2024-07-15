export function parseEqualSeperatedMap(strs: string[]) {
  const map: Record<string, string | undefined> = {};
  strs.forEach((str) => {
    const splited = str.split('=', 2);
    map[splited[0]] = splited.length > 1 ? splited[1] : '';
  });
  return map;
}

export function parseResolution(str: string) {
  const parts = str.split('x');
  if (parts.length === 2) {
    const [width, height] = parts;
    const res = { width: Number(width), height: Number(height) };
    if (isFinite(res.width) && res.width > 0 && isFinite(res.height) && res.height > 0) {
      return res;
    }
  }
  return { width: NaN, height: NaN };
}

export function parseResolutionNormalized(str: string | undefined, defaultSize?: string) {
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
  return { ...inputRes, scale };
}
