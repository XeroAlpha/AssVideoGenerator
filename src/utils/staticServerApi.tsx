export function toUrlIfNecessary(urlOrPath: string) {
  if (urlOrPath.startsWith('proxy@')) {
    return getUrl('proxy', { url: urlOrPath.slice('proxy@'.length) });
  }
  if (urlOrPath.startsWith('http')) {
    return urlOrPath;
  }
  return getUrl('local', { path: urlOrPath });
}

export function getUrl(id: string, query?: string | Record<string, string>) {
  const convertedUrl = new URL(`/${id}`, process.env.REMOTION_STATIC_SERVER?.replace('localhost', location.hostname));
  if (query) {
    convertedUrl.search = new URLSearchParams(query).toString();
  }
  return convertedUrl.toString();
}
