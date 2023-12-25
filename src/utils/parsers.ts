export function parseEqualSeperatedMap(strs: string[]) {
  const map: Record<string, string | undefined> = {};
  strs.forEach((str) => {
    const splited = str.split('=', 2);
    map[splited[0]] = splited.length > 1 ? splited[1] : '';
  });
  return map;
}
