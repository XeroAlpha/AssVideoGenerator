import { useCurrentFrame, useVideoConfig } from "remotion";

interface LyricItem {
  start: number;
  end: number;
  text: string;
  segments: {
    text: string;
    start: number;
  }[];
  fade?: [number, number];
  flags: string[];
}

const StartOffset = -0.1;
const FadeDuration = 0.15;
const MinimumDuration = 0.7;
const LinkThreshold = 0.4;

export const LyricsView: React.FC<{
  lyrics: LyricItem[]
}> = ({ lyrics }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timestamp = frame / fps;
  let prevLyrics: LyricItem | undefined;
  let nextLyrics: LyricItem | undefined;
  for (const item of lyrics) {
    if (item.start - StartOffset <= timestamp) {
      if (!prevLyrics || prevLyrics.start < item.start) {
        prevLyrics = item;
      }
    } else if (!nextLyrics || item.start < nextLyrics.start) {
      nextLyrics = item;
    }
  }
  if (!prevLyrics) {
    if (nextLyrics) {
      return (<div style={{ opacity: 0 }}>{nextLyrics.text}</div>);
    }
    return (<></>);
  }
  const linkNext = nextLyrics ? nextLyrics.start - prevLyrics.end < LinkThreshold : false;
  const offsetedStart = prevLyrics.start - StartOffset;
  const extendedEnd = linkNext && nextLyrics ? nextLyrics.start - StartOffset : Math.max(prevLyrics.end, prevLyrics.start + MinimumDuration);
  const fadeDuration = Math.min(FadeDuration, (extendedEnd - offsetedStart) / 2);
  const fadeProgress = Math.min(Math.max(0, timestamp - offsetedStart), Math.max(0, extendedEnd - timestamp), fadeDuration) / fadeDuration;
  return (<div style={{ opacity: fadeProgress }}>{prevLyrics.text}</div>);
}