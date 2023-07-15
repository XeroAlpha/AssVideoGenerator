import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  useCurrentFrame,
} from 'remotion';
import { calculateFrameCounts, InputProps } from './Video';
import { DescriptionViewer } from './DescriptionViewer';
import { PreviewViewer } from './PreviewViewer';
import { VideoIntro } from './VideoIntro';
import { getUrl, toUrlIfNecessary } from '../utils/staticServerApi';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

interface SeriesMeta {
  name: string;
  el: (frame: number, durationInFrames: number) => JSX.Element;
  durationInFrames: number;
  startInFrames?: number;
}

export const EpisodePreview: React.FC<InputProps> = (meta) => {
  const series: SeriesMeta[] = [];
  const scaleRatio = Math.min(
    meta.resolution.width / 1920,
    meta.resolution.height / 1080
  );
  const frameCountMeta = calculateFrameCounts(meta);
  if (meta.videoEnd) {
    series.push({
      name: 'videoIntro',
      el: () => <VideoIntro videoEnd={getUrl('video_end')} />,
      durationInFrames: 0,
    });
  }
  series.push({
    name: 'images',
    el: (frame, durationInFrames) => (
      <PreviewViewer
        frame={frame}
        durationInFrames={durationInFrames}
        images={meta.images}
        interval={frameCountMeta.intervalInFrames}
        transitionTime={frameCountMeta.transitionInFrames}
        title={meta.title}
        scaleRatio={scaleRatio}
      />
    ),
    durationInFrames: frameCountMeta.imageDurationInFrames,
  });
  series.push(
    {
      name: 'description',
      el: () => (
        <DescriptionViewer
          title={meta.title}
          description={meta.description}
          staff={meta.staff}
          background={meta.background}
          scaleRatio={scaleRatio}
        />
      ),
      durationInFrames: frameCountMeta.textDurationInFrames,
    },
    {
      name: 'black',
      el: () => <AbsoluteFill style={{ backgroundColor: 'black' }} />,
      durationInFrames: 0,
    }
  );
  const { transitionInFrames } = frameCountMeta;
  let start = 0;
  for (const e of series) {
    e.startInFrames = start;
    start += e.durationInFrames + transitionInFrames;
  }
  const frame = useCurrentFrame();
  const fadeProgress = Math.min(
    interpolate(frame, [0, transitionInFrames], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    interpolate(
      frame - frameCountMeta.durationInFrames,
      [-transitionInFrames, 0],
      [1, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    )
  );
  return (
    <div style={{ flex: 1, backgroundColor: 'white' }}>
      {series.map((e) => {
        const frameStart = e.startInFrames ?? 0;
        const frameStartOffseted = frameStart - transitionInFrames;
        const frameEnd = frameStart + e.durationInFrames;
        const frameEndOffseted = frameEnd + transitionInFrames;
        const frameOutSequence = frame - frameStartOffseted;
        const frameInSequence = clamp(
          frame - frameStart,
          0,
          e.durationInFrames
        );
        const opacity = interpolate(
          frameOutSequence,
          [0, transitionInFrames],
          [0, 1],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }
        );
        return (
          <Sequence
            key={e.name}
            name={e.name}
            from={frameStartOffseted}
            durationInFrames={frameEndOffseted - frameStartOffseted}
          >
            <div
              style={{
                opacity,
                zIndex: frame < frameStart ? 1000 : 0,
              }}
            >
              {e.el(frameInSequence, e.durationInFrames)}
            </div>
          </Sequence>
        );
      })}
      {meta.bgm ? (
        <Sequence name="BGM">
          <Audio
            src={toUrlIfNecessary(meta.bgm.src)}
            startFrom={Math.floor(meta.bgm.start * meta.fps)}
            volume={() => fadeProgress * (meta.bgm?.volume ?? 1)}
          />
        </Sequence>
      ) : null}
    </div>
  );
};
