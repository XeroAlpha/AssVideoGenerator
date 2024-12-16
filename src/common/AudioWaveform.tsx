import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { CSSProperties } from 'react';
import { Audio, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, interpolateClamp } from '../utils/interpolate';

type VolumeCallback = (frame: number) => number;

function convertToLogForm(sampled: number[], mapRatio: number, sampleRange: [number, number], targetSamples: number) {
  const remap = (v: number) => (v / targetSamples) ** mapRatio * sampled.length;
  const ret = new Array<number>(sampleRange[1] - sampleRange[0]);
  for (let i = sampleRange[0]; i < sampleRange[1]; i++) {
    const from = clamp(remap(i), 0, sampled.length - 1);
    const to = clamp(remap(i + 1), 0, sampled.length - 1);
    const intFrom = Math.floor(from);
    const intTo = Math.floor(to);
    let sum = 0;
    if (intFrom === intTo) {
      sum += sampled[intFrom] * (to - from);
    } else {
      sum += sampled[intFrom] * (intFrom + 1 - from);
      for (let j = intFrom + 1; j < intTo; j++) {
        sum += sampled[j];
      }
      sum += sampled[intTo] * (to - intTo);
    }
    ret[i - sampleRange[0]] = sum;
  }
  return ret;
}

export const AudioWaveform: React.FC<{
  src: string;
  bar: React.FC<{ volume: number; index: number; samples: number }>;
  startFrom?: number;
  volume?: VolumeCallback;
  samples?: number;
  horizontalScale?: 'log' | 'linear';
  verticalScale?: 'log' | 'linear';
  optimizeFor?: 'accuracy' | 'speed';
  freqRange?: [number, number];
  muted?: boolean;
  style?: CSSProperties;
  className?: string;
}> = ({
  src,
  bar: Bar,
  startFrom,
  volume,
  samples,
  horizontalScale,
  verticalScale,
  optimizeFor,
  freqRange,
  muted,
  style: styleProp,
  className,
}) => {
  const startFromWithDefault = startFrom ?? 0;
  const volumeWithDefault = volume ?? (() => 1);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioData = useAudioData(src);
  if (!audioData) {
    return null;
  }
  const samplesOrDefault = samples ?? 128;
  const fftRange = freqRange
    ? [freqRange[0] / audioData.sampleRate, freqRange[1] / audioData.sampleRate]
    : [0, Infinity];
  const maxSamples = 2 ** Math.floor(2 + Math.log2(audioData.sampleRate / fps));
  let visualization: number[];
  if (horizontalScale === 'linear') {
    visualization = visualizeAudio({
      fps,
      frame: frame + startFromWithDefault * fps,
      audioData,
      numberOfSamples: samplesOrDefault,
      optimizeFor,
    });
    visualization = visualization.slice(
      Math.floor(fftRange[0] * samplesOrDefault),
      Math.ceil(fftRange[1] * samplesOrDefault)
    );
  } else {
    const targetSamples = 2 ** Math.floor(Math.log2((samplesOrDefault * samplesOrDefault) / 4));
    const numberOfSamples = Math.min(maxSamples, targetSamples);
    visualization = visualizeAudio({
      fps,
      frame: frame + startFromWithDefault * fps,
      audioData,
      numberOfSamples,
      optimizeFor,
    });
    visualization = visualization.slice(
      Math.floor(fftRange[0] * numberOfSamples),
      Math.ceil(fftRange[1] * numberOfSamples)
    );
    visualization = convertToLogForm(visualization, 2, [0, samplesOrDefault], samplesOrDefault);
  }
  if (verticalScale === 'log') {
    visualization = visualization.map((e) => {
      const db = 20 * Math.log10(e);
      return interpolateClamp(db, [-60, 0], [0, 1]);
    });
  }
  return (
    <>
      {muted ? null : <Audio
        src={src}
        startFrom={Math.floor(startFromWithDefault * fps)}
        volume={(f) => volumeWithDefault(f)}
        showInTimeline={false}
      />}
      <div style={styleProp} className={className}>
        {visualization.map((v, i) => {
          const finalVolume = v * volumeWithDefault(frame) || 0;
          return <Bar key={i} volume={finalVolume} index={i} samples={visualization.length} />;
        })}
      </div>
    </>
  );
};
