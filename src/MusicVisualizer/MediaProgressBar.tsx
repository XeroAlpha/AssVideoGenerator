import { useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, clampOne } from '../utils/interpolate';
import { style, useStyledClass } from '../utils/style';

const Styles = {
  progressBoxContainer: style({
    width: '100%',
  }),
  progressTextContainer: style({
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
  }),
  progressText: style({
    color: '#ddd',
    fontFamily: '"思源黑体"',
    fontWeight: 400,
    fontSize: '30px',
    padding: '0px 3px 10px 3px',
  }),
  progressContainer: style({
    width: '100%',
    height: '16px', // real height 16px * 0.8 = 12.8px
    borderRadius: '2000px',
    border: '2px solid #777',
    overflowX: 'hidden',
  }),
  progressBar: style({
    width: '100%',
    height: '100%',
    borderRadius: '2000px',
    backgroundColor: '#ccc',
    display: 'flex',
    justifyContent: 'end',
  }),
  progressIndicator: style({
    aspectRatio: '1 / 1',
    height: '100%',
    borderRadius: '2000px',
    backgroundColor: '#fff',
    boxShadow: '0 0 20px white',
  }),
};

function formatDuration(sec: number) {
  const secPart = Math.floor(sec % 60);
  const minPart = Math.floor(sec / 60);
  return `${minPart}:${secPart.toString().padStart(2, '0')}`;
}

export const MediaProgressBar: React.FC<{
  durationInFrames?: number;
  startFrom?: number;
}> = ({ durationInFrames, startFrom }) => {
  const frame = useCurrentFrame();
  const videoConfig = useVideoConfig();
  const styled = useStyledClass(Styles);
  const startFromOrDefault = startFrom ?? 0;
  const durationInFramesOrDefault = durationInFrames ?? videoConfig.durationInFrames;
  const progress = clampOne((frame - startFromOrDefault) / durationInFramesOrDefault);
  const elaspedDuration = clamp(frame - startFromOrDefault, 0, durationInFramesOrDefault) / videoConfig.fps;
  const leftDuration = durationInFramesOrDefault / videoConfig.fps - elaspedDuration;
  return (
    <div {...styled('progressBoxContainer')}>
      <div {...styled('progressTextContainer')}>
        <div {...styled('progressText')}>{formatDuration(elaspedDuration)}</div>
        <div {...styled('progressText')}>{`-${formatDuration(leftDuration)}`}</div>
      </div>
      <div {...styled('progressContainer')}>
        <div {...styled('progressBar', { transform: `translateX(calc((100% - 12.8px) * ${progress - 1})` })}>
          <div {...styled('progressIndicator')} />
        </div>
      </div>
    </div>
  );
};
