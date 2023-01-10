import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  useCurrentFrame,
} from 'remotion';
import { InputProps } from './index';
import { DescriptionViewer } from './DescriptionViewer';
import { PreviewViewer } from './PreviewViewer';
import { VideoIntro } from './VideoIntro';

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
  if (meta.video) {
    series.push({
      name: 'videoIntro',
      el: () => (
        <VideoIntro
          video={meta.video ?? ''}
          videoDuration={meta.videoDurationInFrames}
        />
      ),
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
        interval={meta.intervalInFrames}
        transitionTime={meta.transitionInFrames}
        title={meta.title}
      />
    ),
    durationInFrames: meta.imageDurationInFrames,
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
        />
      ),
      durationInFrames: meta.textDurationInFrames,
    },
    {
      name: 'black',
      el: () => <AbsoluteFill style={{ backgroundColor: 'black' }} />,
      durationInFrames: 0,
    }
  );
  const { transitionInFrames } = meta;
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
      frame - meta.durationInFrames,
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
            src={meta.bgm.src}
            startFrom={Math.floor(meta.bgm.start * meta.fps)}
            volume={() => fadeProgress * (meta.bgm?.volume ?? 1)}
            onResize={null}
            onResizeCapture={null}
          />
        </Sequence>
      ) : null}
    </div>
  );
};
