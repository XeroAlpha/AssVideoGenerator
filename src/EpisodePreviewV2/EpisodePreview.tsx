import { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, useCurrentFrame } from 'remotion';
import { getUrl, toUrlIfNecessary } from '../utils/staticServerApi';
import { style, StyleMap, useStyledClass } from '../utils/style';
import { calculateFrameCounts, InputProps } from './Video';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function clampOne(v: number): number {
  return clamp(v, 0, 1);
}

const defaultTextShadow = Array(2).fill('0px 0px 10px black').join(',');
const Styles = {
  background: style({
    objectFit: 'cover',
    zIndex: '0',
  }),
  container: style({
    display: 'flex',
    flexDirection: 'row',
  }),
  darken: style({
    backdropFilter: 'blur(50px) brightness(75%)',
  }),
  text: style({
    // fontFamily: '"方正FW轻吟体 简", "方正准圆_GBK", "思源黑体"',
    fontFamily: '"思源黑体"',
    fontWeight: 400,
    color: 'white',
    textShadow: defaultTextShadow,
    whiteSpace: 'pre-wrap',
  }),
  leftBar: style({
    flex: '7 0 0px',
    height: '100%',
    padding: '0px 30px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  }),
  rightBar: style({
    marginRight: '-100px',
    flex: '3 0 100px',
    height: '100%',
    padding: '30px 130px 30px 30px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    overflow: 'clip',
    boxShadow: 'rgba(0, 0, 0, 0.5) 30px 0px 10px 40px',
    zIndex: '10',
  }),
  previewArea: style({
    padding: '60px 30px 0px 30px',
    marginBottom: '60px',
    position: 'relative',
  }),
  imageContainer: style({
    border: 'white solid 5px',
    borderRadius: '30px',
    boxShadow: '0px 0px 50px rgba(0, 0, 0, .5)',
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    zIndex: '20',
  }),
  imageSizer: style({
    opacity: '0',
    width: '100%',
  }),
  image: style({
    zIndex: '19',
    position: 'absolute',
    left: '0px',
    top: '0px',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  }),
  imageProgressContainer: style({
    position: 'absolute',
    left: '0px',
    right: '0px',
    bottom: '40px',
    width: 'fit-content',
    margin: '0px auto',
    display: 'flex',
    flexDirection: 'row',
    padding: '5px',
    borderRadius: '30px',
    background: 'rgba(255, 255, 255, .8)',
    backdropFilter: 'blur(20px)',
    overflow: 'clip',
    zIndex: '30',
  }),
  imageProgress: style({
    width: '20px',
    height: '20px',
    margin: '0px 10px',
    borderRadius: '40px',
    background: '#808080',
  }),
  imageProgressIndicator: style({
    position: 'absolute',
    width: '20px',
    height: '20px',
    borderRadius: '40px',
    background: 'black',
  }),
  staffBar: style({
    padding: '0px 20px 0px 85px',
    marginTop: '-60px',
    overflowY: 'hidden',
  }),
  staffInside: style({
    fontSize: '35px',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: '30px 0px',
    marginLeft: '-25px',
  }),
  staffItem: style({
    padding: '5px 40px 5px 10px',
    alignContent: 'center',
    wordBreak: 'break-all',
  }),
  staffLabel: style({
    borderRadius: '1000px',
    padding: '0px 25px 5px 25px',
    margin: '0px 10px 0px -25px',
    backgroundColor: 'black',
    fontWeight: 500,
    color: 'white',
    display: 'inline-block',
  }),
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
  darkenOverlay: style({
    zIndex: '100',
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

function splitStaff(staff: string) {
  return staff
    .split('\n')
    .filter((e) => e !== '')
    .map((ln) => ln.split('：'));
}

const typewriterSpeed = 30;

export const EpisodePreview: React.FC<InputProps> = (meta) => {
  const frameCountMeta = calculateFrameCounts(meta);
  const frame = useCurrentFrame();
  const seconds = frame / meta.fps;
  const introProgress = clampOne(frame / frameCountMeta.transitionInFrames);
  const endingProgress = clampOne((frameCountMeta.durationInFrames - frame) / frameCountMeta.endingInFrames);
  const titleSeconds = seconds - meta.transition;
  const [episodeName, , episodeDuration] = typewriterFixedSpeed(meta.episodeName, typewriterSpeed, titleSeconds);
  const [title, sep1Progress, titleDuration] = typewriterFixedSpeed(
    meta.title,
    typewriterSpeed,
    titleSeconds - episodeDuration
  );
  const descProgress = (titleSeconds - episodeDuration - titleDuration / 2) / meta.interval;
  const description = typewriterFixedDuration(meta.description, descProgress);
  const [info, sep2Progress] = typewriterFixedSpeed(
    meta.info ?? '',
    typewriterSpeed,
    titleSeconds - episodeDuration - titleDuration
  );
  const staffItems = meta.staff ? splitStaff(meta.staff) : null;
  let imageProgress = 0;
  for (let i = 1; i < meta.images.length; i++) {
    imageProgress += spring({
      frame: frame - i * frameCountMeta.intervalInFrames,
      fps: meta.fps,
      config: {
        mass: 0.2,
        stiffness: 50,
      },
      durationInFrames: frameCountMeta.transitionInFrames,
    });
  }
  const imageAnimateStyles: StyleMap<`imageSpec${number}`> = {};
  for (let i = 0; i < meta.images.length; i++) {
    imageAnimateStyles[`imageSpec${i}`] = {
      transform: `translateX(${(i - imageProgress) * 100}%)`,
    };
  }
  const staffItemAnimateStyles: StyleMap<`staffItemSpec${number}`> = {};
  if (staffItems) {
    for (let i = 0; i < staffItems.length; i++) {
      const progress = spring({
        frame: frame - (i * 0.5 + 1) * frameCountMeta.transitionInFrames,
        fps: meta.fps,
        durationInFrames: frameCountMeta.transitionInFrames,
        config: { stiffness: 50 },
      });
      staffItemAnimateStyles[`staffItemSpec${i}`] = {
        transform: `translateY(${(1 - progress) * 100}%)`,
        opacity: `${progress * 100}%`,
      };
    }
  }
  const darkenProgress = meta.previewPosition === 'start' ? introProgress : endingProgress;
  const videoTransitionProgress = meta.previewPosition === 'start' ? endingProgress : introProgress;
  const videoTransitionSpring = spring({
    frame: meta.previewPosition === 'start' ? frameCountMeta.durationInFrames - frame : frame,
    fps: meta.fps,
    durationInFrames: frameCountMeta.transitionInFrames * 2,
    config: { stiffness: 50 },
  });
  const styled = useStyledClass(
    Styles,
    {
      backgroundVideoTransition: style({
        filter: `blur(${videoTransitionProgress * 10}px)`,
      }),
      leftBarAnimation: style({
        transform: `translateX(${(videoTransitionSpring - 1) * 100}%)`,
      }),
      rightBarAnimation: style({
        transform: `translateX(calc((100% - 100px) * ${1 - videoTransitionSpring}))`,
      }),
      darkenTransition: style({
        backdropFilter: `brightness(${darkenProgress * 100}%) blur(${(1 - darkenProgress) * 10}px)`,
      }),
      imageProgressIndicator: style({
        transform: `translateX(calc((100% + 20px) * ${imageProgress}))`,
      }),
      seperator1Animation: style({
        opacity: `${sep1Progress * 100}%`,
      }),
      seperator2Animation: style({
        opacity: `${sep2Progress * 100}%`,
      }),
      ...imageAnimateStyles,
      ...staffItemAnimateStyles,
    },
    meta.extraStyles
  );
  const backgroundUrl = getUrl('video_shot');
  const staffDOMRef = useRef<HTMLDivElement | null>(null);
  const descDOMRef = useRef<HTMLDivElement | null>(null);
  const easeOutCubic = Easing.out(Easing.cubic);
  useLayoutEffect(() => {
    const total = frameCountMeta.durationInFrames;
    const pre = frameCountMeta.imageDurationInFrames;
    const post = frameCountMeta.imageDurationInFrames;
    const progress = 1 - easeOutCubic(clampOne((frame - pre) / (total - pre - post)));
    const staffDOM = staffDOMRef.current;
    if (staffDOM) {
      staffDOM.scrollTop = Math.round(Math.max(0, staffDOM.scrollHeight - staffDOM.clientHeight) * progress);
    }
    const descDOM = descDOMRef.current;
    if (descDOM) {
      // descDOM.style.marginBottom = `${(descDOM.clientHeight - 90) * (descProgress - 1)}px`;
      descDOM.scrollTop = Math.round(Math.max(0, descDOM.scrollHeight - descDOM.clientHeight) * progress);
    }
  });
  return (
    <>
      <AbsoluteFill>
        <Img src={backgroundUrl} {...styled('background')} />
      </AbsoluteFill>
      <AbsoluteFill>
        <Img src={backgroundUrl} {...styled('background', 'backgroundVideoTransition')} />
      </AbsoluteFill>
      <AbsoluteFill {...styled('container')}>
        <div {...styled('leftBar', 'leftBarAnimation')}>
          <div {...styled('previewArea')}>
            <div {...styled('imageContainer')}>
              <Img src={toUrlIfNecessary(meta.images[0])} {...styled('imageSizer')} />
              {meta.images.map((imageUrl, i) => (
                <Img key={i} src={toUrlIfNecessary(imageUrl)} {...styled('image', `imageSpec${i}`)} />
              ))}
            </div>
            <div {...styled('imageProgressContainer')}>
              {meta.images.map((_, i) => {
                if (i === 0) {
                  return (
                    <div key={i} {...styled('imageProgress')}>
                      <div {...styled('imageProgressIndicator')} />
                    </div>
                  );
                }
                return <div key={i} {...styled('imageProgress')} />;
              })}
            </div>
          </div>
          {staffItems ? (
            <div ref={staffDOMRef} {...styled('text', 'staffBar')}>
              <div {...styled('staffInside')}>
                {staffItems.map((item, i) => (
                  <div key={i} {...styled('staffItem', `staffItemSpec${i}`)}>
                    <span {...styled('staffLabel')}>{item[0]}</span>
                    {item[1]}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div {...styled('rightBar', 'darken', 'rightBarAnimation')}>
          <div {...styled('text', 'episodeName')}>{episodeName}</div>
          <div {...styled('text', 'title')}>{title}</div>
          <div {...styled('seperator', 'seperator1Animation')} />
          <div ref={descDOMRef} {...styled('description')}>
            <div {...styled('text', 'descriptionInside')}>{description}</div>
          </div>
          <div {...styled('seperator', 'seperator2Animation')} />
          <div {...styled('text', 'infoText')}>{info}</div>
        </div>
      </AbsoluteFill>
      {endingProgress < 1 ? <AbsoluteFill {...styled('darkenOverlay', 'darkenTransition')} /> : null}
      {meta.bgm ? (
        <Sequence name="BGM">
          <Audio
            src={toUrlIfNecessary(meta.bgm.src)}
            startFrom={Math.floor(meta.bgm.start * meta.fps)}
            volume={() => Math.min(introProgress, endingProgress) * (meta.bgm?.volume ?? 1)}
          />
        </Sequence>
      ) : null}
    </>
  );
};
