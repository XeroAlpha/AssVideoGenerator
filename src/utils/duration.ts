export function parseDuration(str: string): number {
  const lower = str.toLowerCase();
  if (lower.endsWith('ms')) {
    return parseFloat(lower.slice(0, -2)) / 1000;
  }
  if (lower.endsWith('s')) {
    return parseFloat(lower.slice(0, -1));
  }
  if (lower.endsWith('m')) {
    return parseFloat(lower.slice(0, -1)) * 60;
  }
  if (lower.endsWith('h')) {
    return parseFloat(lower.slice(0, -1)) * 3600;
  }
  return NaN;
}

const timestampRegex =
  /(?:(?:(\d{1,2}):)?(\d{1,2}):)?(\d{1,2})(?:\.(\d{1,3}))?/;
export function parseTimestamp(str: string): number {
  const match = timestampRegex.exec(str);
  if (!match) throw new Error('Invalid timestamp: ' + str);
  const [, hr, min, sec, ms] = match;
  return (
    parseInt(hr || '0', 10) * 3600 +
    parseInt(min || '0', 10) * 60 +
    parseInt(sec || '0', 10) +
    parseInt((ms || '').padEnd(3, '0'), 10) / 1000
  );
}
