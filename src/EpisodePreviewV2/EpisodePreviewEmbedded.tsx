import { AbsoluteFill, Img, Sequence, spring, useCurrentFrame } from 'remotion';
import { clampOne } from '../utils/interpolate';
import { getUrl, toUrlIfNecessary } from '../utils/staticServerApi';
import { mergeStyleMap, style, Styled, useStyledClass } from '../utils/style';
import { AirDustView } from './AirDustView';
import { AudioWaveform } from './AudioWaveform';
import { Gallery, GalleryItem } from './Gallery';
import { InfoList } from './InfoList';
import { StaffList } from './StaffList';
import { calculateFrameCounts, InputProps } from './Video';

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
  }),
  bgmBarContainer: style({
    position: 'absolute',
    right: '100px',
    bottom: '0px',
    width: 'calc(100% - 100px)',
    height: '70%',
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    zIndex: '9',
  }),
  bgmBar: style({
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

export const EpisodePreviewEmbedded: React.FC<InputProps> = (meta) => {
  const { transitionInFrames, durationInFrames, endingInFrames, intervalInFrames, videoDurationInFrames } =
    calculateFrameCounts(meta, true);
  const frame = useCurrentFrame();
  const introProgress = clampOne(frame / transitionInFrames);
  const endingProgress = clampOne((durationInFrames - frame) / endingInFrames);
  const galleryItems: GalleryItem[] = meta.images.map((e) => ({
    type: 'image',
    src: toUrlIfNecessary(e),
    durationInFrames: intervalInFrames,
  }));
  const videoUrl = getUrl('video');
  let darkenProgress = endingProgress;
  let videoTransitionProgress = introProgress;
  const videoTransitionSpringDuration = transitionInFrames * 2;
  let videoTransitionSpring: number;
  let bgmSequenceStart = 0;
  if (meta.previewPosition === 'start') {
    darkenProgress = introProgress;
    videoTransitionProgress = endingProgress;
    videoTransitionSpring =
      1 -
      spring({
        frame: frame - durationInFrames + videoTransitionSpringDuration,
        fps: meta.fps,
        durationInFrames: videoTransitionSpringDuration,
        config: { mass: 0.8, stiffness: 10 },
      });
    galleryItems.push({
      type: 'video',
      src: videoUrl,
      durationInFrames: videoDurationInFrames + transitionInFrames,
      hideFromProgress: true,
    });
  } else {
    videoTransitionSpring = spring({
      frame,
      fps: meta.fps,
      durationInFrames: videoTransitionSpringDuration,
      config: { mass: 0.8, stiffness: 50 },
    });
    galleryItems.unshift({
      type: 'video',
      src: getUrl('video'),
      durationInFrames: videoDurationInFrames,
      hideFromProgress: true,
    });
    bgmSequenceStart += videoDurationInFrames + transitionInFrames;
  }
  const styles = mergeStyleMap(Styles, {
    backgroundVideoTransition: style({
      filter: `blur(${videoTransitionProgress * 10}px)`,
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
      <AbsoluteFill>
        <Img src={backgroundUrl} {...styled('background', 'backgroundVideoTransition')} />
      </AbsoluteFill>
      <AirDustView
        width={meta.resolution.width * (1 + meta.images.length * 0.05)}
        height={meta.resolution.height}
        dustPerSeconds={10}
        seed={meta.title}
      />
      <AbsoluteFill {...styled('container')}>
        <div {...styled('leftBar', 'leftBarAnimation')}>
          <div {...styled('previewArea')}>
            <Gallery items={galleryItems} startFrom={transitionInFrames} transitionInFrames={transitionInFrames} />
          </div>
          {meta.staff ? (
            <StaffList
              staff={meta.staff}
              startFrom={transitionInFrames}
              durationInFrames={durationInFrames - transitionInFrames}
            />
          ) : null}
        </div>
        <div {...styled('rightBar', 'darken', 'rightBarAnimation')}>
          {meta.bgm ? (
            <Sequence
              from={bgmSequenceStart}
              durationInFrames={durationInFrames - videoDurationInFrames - transitionInFrames}
              layout="none"
            >
              <AudioWaveform
                src={toUrlIfNecessary(meta.bgm.src)}
                startFrom={meta.bgm.start}
                volume={(frame) =>
                  Math.min(clampOne(frame / transitionInFrames), clampOne((durationInFrames - frame) / endingInFrames))
                }
                barSizeProp="height"
              />
            </Sequence>
          ) : null}
          <InfoList
            episodeName={meta.episodeName}
            title={meta.title}
            description={meta.description}
            info={meta.info}
            startFrom={meta.transition}
            descDuration={meta.interval}
            duration={durationInFrames / meta.fps}
          />
        </div>
      </AbsoluteFill>
      {darkenProgress < 1 ? <AbsoluteFill {...styled('darkenOverlay', 'darkenTransition')} /> : null}
    </Styled>
  );
};
