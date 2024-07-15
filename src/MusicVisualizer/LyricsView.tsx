import { useCurrentFrame, useVideoConfig } from "remotion";

interface LyricItem {
  start: number;
  end: number;
  text: string;
}

export const LyricsView: React.FC<{ lyrics: LyricItem[] }> = ({ lyrics }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timestamp = frame / fps;
  const startOffset = -0.1;
  let prevLyrics: LyricItem | undefined;
  let nextLyrics: LyricItem | undefined;
  for (const item of lyrics) {
    if (item.start - startOffset <= timestamp) {
      if (!prevLyrics || prevLyrics.start < item.start) {
        prevLyrics = item;
      }
    } else if (!nextLyrics || item.start < nextLyrics.start) {
      nextLyrics = item;
    }
  }
  if (!prevLyrics) return (<></>);
  const linkNext = nextLyrics ? nextLyrics.start - prevLyrics.end < 0.7 : false;
  const offsetedStart = prevLyrics.start - startOffset;
  const extendedEnd = linkNext && nextLyrics ? nextLyrics.start - startOffset : prevLyrics.end;
  if (timestamp > extendedEnd) return (<></>);
  const fadeDuration = Math.min(0.15, (extendedEnd - offsetedStart) / 2);
  const fadeProgress = Math.min(Math.max(0, timestamp - offsetedStart), Math.max(0, extendedEnd - timestamp)) / fadeDuration;
  return (<div style={{ opacity: fadeProgress }}>{prevLyrics.text}</div>);
}