import { AbsoluteFill, Img, spring, useCurrentFrame } from 'remotion';
import { AirDustView } from '../common/AirDustView';
import { AudioWaveform } from '../common/AudioWaveform';
import { Gallery, GalleryItem } from '../common/Gallery';
import { clampOne } from '../utils/interpolate';
import { toUrlIfNecessary } from '../utils/staticServerApi';
import { mergeStyleMap, style, Styled, useStyledClass } from '../utils/style';
import { InfoList } from './InfoList';
import { StaffList } from './StaffList';
import { calculateFrameCounts, InputProps } from './Video';

const defaultTextShadow = Array(2).fill('0px 0px 10px black').join(',');
const Styles = {
  background: style({
    objectFit: 'cover',
    zIndex: '0',
  }),
  backgroundOverlay: style({
    margin: '-30px',
    width: '200%',
    height: '200%',
  }),
  container: style({
    display: 'flex',
    flexDirection: 'row',
  }),
  darken: style({
    backdropFilter: 'blur(50px) brightness(75%)',
  }),
  text: style({
    fontFamily: '"思源黑体"',
    fontWeight: 400,
    color: 'white',
    textShadow: defaultTextShadow,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    lineBreak: 'anywhere',
  }),
  leftBar: style({
    flexGrow: '0',
    flexShrink: '0',
    flexBasis: '70%',
    height: '100%',
    padding: '0px 30px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  }),
  rightBar: style({
    position: 'relative',
    marginRight: '-100px',
    flexGrow: '1',
    flexShrink: '0',
    flexBasis: '0',
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
  infoList: style({
    zIndex: '10',
  }),
  darkenOverlay: style({
    zIndex: '100',
    margin: '-30px',
    width: '200%',
    height: '200%',
  }),
  bgmBarContainer: style({
    position: 'absolute',
    right: '100px',
    bottom: '0px',
    width: 'calc(100% - 100px)',
    height: '70%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
    zIndex: '9',
  }),
  bgmBar: style({
    flexGrow: '1',
    flexShrink: '1',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    filter: 'blur(10px)',
  }),
  airDustContainer: style({
    position: 'absolute',
    zIndex: 1,
    left: '0px',
    top: '0px',
    width: '100%',
    height: '100%',
  }),
  dustViewContainer: style({
    position: 'absolute',
    left: '0px',
    top: '0px',
    width: '100%',
    height: '100%',
  }),
  dustViewDust: style({
    width: '2px',
    height: '2px',
    borderRadius: '1000px',
    background: 'white',
  }),
};

export const EpisodePreview: React.FC<InputProps> = (meta) => {
  const frameCountMeta = calculateFrameCounts(meta);
  const frame = useCurrentFrame();
  const introProgress = clampOne(frame / frameCountMeta.transitionInFrames);
  const endingProgress = clampOne((frameCountMeta.durationInFrames - frame) / frameCountMeta.endingInFrames);
  const galleryItems: GalleryItem[] = meta.images.map((e) => ({
    type: 'image',
    src: toUrlIfNecessary(e),
    durationInFrames: frameCountMeta.intervalInFrames,
  }));
  let darkenProgress = endingProgress;
  let videoTransitionProgress = introProgress;
  const videoTransitionSpringDuration = frameCountMeta.transitionInFrames * 2;
  let videoTransitionSpring: number;
  if (meta.previewPosition === 'start') {
    darkenProgress = introProgress;
    videoTransitionProgress = endingProgress;
    videoTransitionSpring =
      1 -
      spring({
        frame: frame - frameCountMeta.durationInFrames + videoTransitionSpringDuration,
        fps: meta.fps,
        durationInFrames: videoTransitionSpringDuration,
        config: { mass: 0.8, stiffness: 10 },
      });
  } else {
    videoTransitionSpring = spring({
      frame,
      fps: meta.fps,
      durationInFrames: videoTransitionSpringDuration,
      config: { mass: 0.8, stiffness: 50 },
    });
  }
  const styles = mergeStyleMap(Styles, {
    backgroundVideoTransition: style({
      backdropFilter: `blur(${videoTransitionProgress * 10}px)`,
    }),
    leftBarAnimation: style({
      transform: `translateX(calc((100% - 40px) * ${videoTransitionSpring - 1}))`,
    }),
    rightBarAnimation: style({
      transform: `translateX(calc((100% - 80px) * ${1 - videoTransitionSpring}))`,
    }),
    darkenTransition: style({
      backdropFilter: `brightness(${darkenProgress * 100}%) blur(${(1 - darkenProgress) * 10}px)`,
    }),
    dustViewContainer: style({
      opacity: `${videoTransitionProgress * 100}%`,
    }),
  });
  const styled = useStyledClass(styles, meta.extraStyles);
  const backgroundUrl = toUrlIfNecessary(meta.background);
  return (
    <Styled styles={styles} importantStyles={meta.extraStyles}>
      <AbsoluteFill>
        <Img src={backgroundUrl} {...styled('background')} />
      </AbsoluteFill>
      <AbsoluteFill {...styled('backgroundOverlay', 'backgroundVideoTransition')} />
      <AirDustView
        width={meta.resolution.width * (1 + meta.images.length * 0.05)}
        height={meta.resolution.height}
        dustPerSeconds={10}
        seed={meta.title}
        dust={({ style }) => <div {...styled('dustViewDust', style)} />}
        {...styled('dustViewContainer')}
      />
      <AbsoluteFill {...styled('container')}>
        <div {...styled('leftBar', 'leftBarAnimation')}>
          <div {...styled('previewArea')}>
            <Gallery items={galleryItems} transitionInFrames={frameCountMeta.transitionInFrames} />
          </div>
          {meta.staff ? (
            <StaffList
              staff={meta.staff}
              startFrom={frameCountMeta.transitionInFrames}
              durationInFrames={frameCountMeta.durationInFrames - frameCountMeta.transitionInFrames}
            />
          ) : null}
        </div>
        <div {...styled('rightBar', 'darken', 'rightBarAnimation')}>
          {meta.bgm ? (
            <AudioWaveform
              src={toUrlIfNecessary(meta.bgm.src)}
              startFrom={meta.bgm.start}
              horizontalScale="log"
              verticalScale="linear"
              samples={128}
              optimizeFor="speed"
              freqRange={[0, 15000]}
              volume={(frame) =>
                Math.min(
                  clampOne(frame / frameCountMeta.transitionInFrames),
                  clampOne((frameCountMeta.durationInFrames - frame) / frameCountMeta.endingInFrames)
                )
              }
              bar={({ volume }) => <div {...styled('bgmBar', { height: `${volume * 100}%` })} />}
              {...styled('bgmBarContainer')}
            />
          ) : null}
          <InfoList
            episodeName={meta.episodeName}
            title={meta.title}
            description={meta.description}
            info={meta.info}
            startFrom={meta.transition}
            descDuration={meta.interval}
            duration={frameCountMeta.durationInFrames / meta.fps}
          />
        </div>
      </AbsoluteFill>
      {darkenProgress < 1 ? <AbsoluteFill {...styled('darkenOverlay', 'darkenTransition')} /> : null}
    </Styled>
  );
};
