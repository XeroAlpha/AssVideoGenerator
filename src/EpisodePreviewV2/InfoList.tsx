import { useLayoutEffect, useRef } from 'react';
import { Easing, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, clampOne } from '../utils/interpolate';
import { style, useStyledClass } from '../utils/style';

const defaultTextShadow = Array(2).fill('0px 0px 10px black').join(',');
const Styles = {
  episodeName: style({
    fontSize: '60px',
    fontWeight: 700,
  }),
  title: style({
    fontSize: '45px',
    fontWeight: 700,
    paddingBottom: '20px',
  }),
  seperator: style({
    border: '1px solid white',
    boxShadow: defaultTextShadow,
  }),
  description: style({
    fontSize: '35px',
    flex: '0 1 auto',
    overflowY: 'hidden',
  }),
  descriptionInside: style({
    padding: '20px 0px',
  }),
  infoText: style({
    fontSize: '35px',
    flex: '0 1 0px',
    paddingTop: '20px',
  }),
};

function typewriter(text: string, len: number) {
  const clampedLen = clamp(len, 0, text.length);
  return (
    <>
      {text.slice(0, clampedLen)}
      <span style={{ opacity: '0' }}>{text.slice(clampedLen)}</span>
    </>
  );
}

function typewriterFixedDuration(text: string, progress: number) {
  return typewriter(text, Math.round(clamp(progress, 0, 1) * text.length));
}

function typewriterFixedSpeed(text: string, speed: number, seconds: number): [JSX.Element, number, number] {
  return [
    typewriter(text, Math.round(clamp(seconds * speed, 0, text.length))),
    clampOne((seconds * speed) / text.length),
    text.length / speed,
  ];
}

const typewriterSpeed = 30;

export const InfoList: React.FC<{
  episodeName: string;
  title: string;
  description: string;
  info?: string;
  startFrom?: number;
  descDuration: number;
  duration: number;
}> = ({ episodeName, title, description, info, startFrom, descDuration, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps - (startFrom ?? 0);
  const titleSeconds = seconds;
  const [episodeNameDOM, , episodeDuration] = typewriterFixedSpeed(episodeName, typewriterSpeed, titleSeconds);
  const [titleDOM, sep1Progress, titleDuration] = typewriterFixedSpeed(
    title,
    typewriterSpeed,
    titleSeconds - episodeDuration
  );
  const descProgress = (titleSeconds - episodeDuration - titleDuration / 2) / descDuration;
  const descriptionDOM = typewriterFixedDuration(description, descProgress);
  const [infoDOM, sep2Progress] = typewriterFixedSpeed(
    info ?? '',
    typewriterSpeed,
    titleSeconds - episodeDuration - titleDuration
  );
  const styled = useStyledClass(Styles, {
    seperator1Animation: style({
      opacity: `${sep1Progress * 100}%`,
    }),
    seperator2Animation: style({
      opacity: `${sep2Progress * 100}%`,
    }),
  });
  const descDOMRef = useRef<HTMLDivElement | null>(null);
  const easeOutCubic = Easing.out(Easing.cubic);
  useLayoutEffect(() => {
    const progress = 1 - easeOutCubic(clampOne(seconds / duration));
    const descDOM = descDOMRef.current;
    if (descDOM) {
      descDOM.scrollTop = Math.max(0, descDOM.scrollHeight - descDOM.clientHeight) * progress;
    }
  });
  return (
    <div {...styled('infoList')}>
      <div {...styled('text', 'episodeName')}>{episodeNameDOM}</div>
      <div {...styled('text', 'title')}>{titleDOM}</div>
      <div {...styled('seperator', 'seperator1Animation')} />
      <div ref={descDOMRef} {...styled('description')}>
        <div {...styled('text', 'descriptionInside')}>{descriptionDOM}</div>
      </div>
      <div {...styled('seperator', 'seperator2Animation')} />
      <div {...styled('text', 'infoText')}>{infoDOM}</div>
    </div>
  );
};
