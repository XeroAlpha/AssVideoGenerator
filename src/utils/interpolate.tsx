import { interpolate } from 'remotion';

export function interpolateLClamp(
  input: number,
  inputRange: number[],
  outputRange: number[],
  easing?: (input: number) => number
) {
  return interpolate(input, inputRange, outputRange, {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'extend',
  });
}

export function interpolateRClamp(
  input: number,
  inputRange: number[],
  outputRange: number[],
  easing?: (input: number) => number
) {
  return interpolate(input, inputRange, outputRange, {
    easing,
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });
}

export function interpolateClamp(
  input: number,
  inputRange: number[],
  outputRange: number[],
  easing?: (input: number) => number
) {
  return interpolate(input, inputRange, outputRange, {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}
