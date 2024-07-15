import { CSSProperties, useMemo } from 'react';
import { interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { style } from '../utils/style';

interface DustOptions {
  seed: string;
  radius: number;
  minSpeed: number;
  speedFunction: (rnd: number, frame: number) => number;
  opacityFunction: (rnd: number, frame: number) => number;
  thetaFunction: (rnd: number, frame: number) => number;
  distanceFunction: (rnd: number, frame: number) => number;
  dustPerFrame: number;
}

interface DustInstance {
  opacity: number;
  duration: number;
  srcPoint: [number, number];
  destVec: [number, number];
  startFrame: number;
}

interface Dust {
  opacity: number;
  x: number;
  y: number;
}

function useDusts(options: DustOptions, frame: number): Dust[] {
  const { seed, radius, minSpeed, speedFunction, opacityFunction, thetaFunction, distanceFunction, dustPerFrame } =
    options;
  const fromIndex = Math.floor((frame - 1 / minSpeed) * dustPerFrame);
  const toIndex = Math.ceil(frame * dustPerFrame);
  const instances: DustInstance[] = [];
  const cache = useMemo<Record<number, DustInstance>>(
    () => ({}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, radius, minSpeed, speedFunction, opacityFunction, thetaFunction, distanceFunction, dustPerFrame]
  );
  for (let i = fromIndex; i < toIndex; i++) {
    let instance = cache[i];
    const startFrame = i / dustPerFrame;
    if (!instance) {
      const theta = thetaFunction(random(`${seed}-t-${i}`), startFrame);
      const length = distanceFunction(random(`${seed}-r-${i}`), startFrame);
      const midX = Math.cos(theta) * length;
      const midY = Math.sin(theta) * length;
      const offX = -Math.sin(theta) * radius;
      const offY = Math.cos(theta) * radius;
      instance = {
        opacity: opacityFunction(random(`${seed}-a-${i}`), startFrame),
        duration: 1 / speedFunction(random(`${seed}-d-${i}`), startFrame),
        srcPoint: [midX - offX, midY - offY],
        destVec: [2 * offX, 2 * offY],
        startFrame,
      };
      cache[i] = instance;
    }
    instances.push(instance);
  }
  return instances
    .map(({ opacity, duration, srcPoint, destVec, startFrame }) => {
      const progress = (frame - startFrame) / duration;
      if (progress < 0 || progress > 1) {
        return null;
      }
      const x = srcPoint[0] + progress * destVec[0];
      const y = srcPoint[1] + progress * destVec[1];
      return { opacity, x, y };
    })
    .filter((e): e is Dust => e !== null);
}

function useRemappedFrame(frame: number, speed?: (frame: number) => number) {
  const totalFrames = useMemo<(number | undefined)[]>(
    () => [0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [speed]
  );
  if (!speed) {
    return frame;
  }
  let firstValid = frame;
  while (firstValid >= 0 && totalFrames[firstValid] === undefined) {
    firstValid -= 1;
  }
  let currentFrame = totalFrames[firstValid] as number;
  for (let f = firstValid + 1; f <= frame; f += 1) {
    currentFrame += speed(f);
    totalFrames[firstValid] = currentFrame;
  }
  return currentFrame;
}

const Styles = {
  dustViewDust: style({
    position: 'absolute',
    left: '50%',
    top: '50%',
  }),
};

export const AirDustView: React.FC<{
  width: number;
  height: number;
  dust: React.FC<{ x: number; y: number; opacity: number; style: CSSProperties }>;
  offsetX?: number;
  offsetY?: number;
  dustPerSeconds: number;
  seed?: string;
  timescale?: (seconds: number) => number;
  speed?: (rnd: number, seconds: number) => number;
  theta?: (rnd: number, seconds: number) => number;
  opacity?: (rnd: number, seconds: number) => number;
  distance?: (rnd: number, seconds: number) => number;
  style?: CSSProperties;
  className?: string;
}> = ({
  width,
  height,
  dust: Dust,
  offsetX,
  offsetY,
  dustPerSeconds,
  seed,
  timescale,
  speed,
  theta,
  opacity,
  distance,
  style: styleProp,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const remappedFrame = useRemappedFrame(frame, timescale ? (f) => timescale(f / fps) : undefined);
  const maxDistance = Math.max(width, height) / 2;
  const dusts = useDusts(
    {
      seed: seed ?? 'dust',
      radius: Math.sqrt(width * width + height * height) / 2,
      minSpeed: 1 / (30 * fps),
      distanceFunction: distance
        ? (rnd, frame) => distance(rnd, frame / fps)
        : (rnd) => interpolate(rnd, [0, 1], [-maxDistance, maxDistance]),
      speedFunction: speed
        ? (rnd, frame) => speed(rnd, frame / fps) / fps
        : (rnd) => interpolate(rnd, [0, 1], [1 / (30 * fps), 1 / (8 * fps)]),
      opacityFunction: opacity
        ? (rnd, frame) => opacity(rnd, frame / fps)
        : (rnd) => interpolate(rnd, [0, 1], [0.5, 1]),
      thetaFunction: theta
        ? (rnd, frame) => theta(rnd, frame / fps)
        : (rnd) => interpolate(rnd, [0, 1], [0, 2 * Math.PI]),
      dustPerFrame: dustPerSeconds / fps,
    },
    remappedFrame
  );
  const containerStyle = style(
    styleProp,
    offsetX !== 0 || offsetY !== 0 ? { transform: `translate(${-(offsetX ?? 0)}px, ${-(offsetY ?? 0)}px)` } : undefined
  );
  return (
    <>
      <div style={containerStyle} className={className}>
        {dusts.map(({ opacity, x, y }, i) => {
          const dustStyle = style(Styles.dustViewDust, {
            opacity,
            transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))`,
          });
          return <Dust key={i} x={x} y={y} opacity={opacity} style={dustStyle} />;
        })}
      </div>
    </>
  );
};
