import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { Audio, useCurrentFrame, useVideoConfig } from 'remotion';
import { style, useStyledClass } from '../utils/style';

type VolumeCallback = (frame: number) => number;

const Styles = {
  bgmBarContainer: style({
    display: 'flex',
  }),
  bgmBar: style({
    flexGrow: '1',
    flexShrink: '1',
  }),
};

function convertToLogForm(sampled: number[], mapRatio: number, downsample: number) {
  const remap = (v: number) => (v / downsample) ** mapRatio * sampled.length;
  const ret = new Array(downsample);
  for (let i = 0; i < downsample; i++) {
    const from = remap(i);
    const to = remap(i + 1);
    const intFrom = Math.floor(from);
    const intTo = Math.floor(to);
    let sum = 0;
    sum += sampled[intFrom] * (intFrom + 1 - from);
    for (let j = intFrom + 1; j < intTo; j++) {
      sum += sampled[j];
    }
    sum += sampled[intTo] * (to - intTo);
    ret[i] = sum;
  }
  return ret;
}

export const AudioWaveform: React.FC<{
  src: string;
  startFrom?: number;
  volume?: VolumeCallback;
  barSizeProp?: string;
}> = ({ src, startFrom, volume, barSizeProp }) => {
  const startFromWithDefault = startFrom ?? 0;
  const volumeWithDefault = volume ?? (() => 1);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const styled = useStyledClass(Styles);
  const audioData = useAudioData(src);
  if (!audioData) {
    return null;
  }
  const visualization = convertToLogForm(
    visualizeAudio({
      fps,
      frame: frame + startFromWithDefault * fps,
      audioData,
      numberOfSamples: 1024,
    }),
    2,
    128
  );
  return (
    <>
      <Audio
        src={src}
        startFrom={Math.floor(startFromWithDefault * fps)}
        volume={(f) => volumeWithDefault(f)}
        showInTimeline={false}
      />
      <div {...styled('bgmBarContainer')}>
        {visualization.map((v, i) => {
          const finalVolume = v * volumeWithDefault(frame) || 0;
          return <div key={i} {...styled('bgmBar', { [barSizeProp ?? 'height']: `${finalVolume * 100}%` })} />;
        })}
      </div>
    </>
  );
};
