import { useMemo } from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";
import { style, StyleMap, useStyledClass } from "../utils/style";

interface DustOptions {
  seed: string;
  radius: number;
  maxLength: number;
  durationRange: [number, number];
  opacityRange: [number, number];
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

function randomRanged(seed: string | number | null, [min, max]: [number, number]) {
  return min + random(seed) * (max - min);
}

function useDusts(options: DustOptions, frame: number): Dust[] {
  const { seed, radius, maxLength, durationRange, opacityRange, dustPerFrame } = options;
  const indexRange = [Math.floor((frame - durationRange[1]) * dustPerFrame), Math.ceil(frame * dustPerFrame)];
  const instances: DustInstance[] = [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cache = useMemo<Record<number, DustInstance>>(() => ({}), [seed, radius, maxLength, ...opacityRange, ...durationRange])
  for (let i = indexRange[0]; i < indexRange[1]; i++) {
    let instance = cache[i];
    if (!instance) {
      const theta = random(`${seed}-t-${i}`) * Math.PI * 2;
      const length = (2 * random(`${seed}-r-${i}`) - 1) * maxLength;
      const midX = Math.cos(theta) * length;
      const midY = Math.sin(theta) * length;
      const offX = -Math.sin(theta) * radius;
      const offY = Math.cos(theta) * radius;
      instance = {
        opacity: randomRanged(`${seed}-a-${i}`, opacityRange),
        duration: randomRanged(`${seed}-d-${i}`, durationRange),
        srcPoint: [midX - offX, midY - offY],
        destVec: [2 * offX, 2 * offY],
        startFrame: i / dustPerFrame
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

const Styles = {
  dustViewDust: style({
    position: 'absolute',
    left: '50%',
    top: '50%'
  })
};

export const AirDustView: React.FC<{
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  dustPerSeconds: number;
  seed?: string;
  extraStyles?: StyleMap;
}> = ({ width, height, offsetX, offsetY, dustPerSeconds, seed, extraStyles }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const styled = useStyledClass(Styles, extraStyles ?? {});
  const dusts = useDusts({
    seed: seed ?? "dust",
    radius: Math.sqrt(width * width + height * height) / 2,
    maxLength: Math.min(width, height) / 2,
    durationRange: [8 * fps, 30 * fps],
    opacityRange: [0.5, 1],
    dustPerFrame: dustPerSeconds / fps
  }, frame);
  return (
    <>
      <div {...styled('dustViewContainer', { transform: `translate(${-(offsetX ?? 0)}px, ${-(offsetY ?? 0)}px)` })}>
        {dusts.map(({ opacity, x, y }, i) => {
          return (
            <div key={i} {...styled('dustViewDust', { opacity, transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))` })} />
          );
        })}
      </div>
    </>
  );
};