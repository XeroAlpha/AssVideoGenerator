import { Freeze, Img, OffthreadVideo, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { clampOne } from '../utils/interpolate';
import { toUrlIfNecessary } from '../utils/staticServerApi';
import { style, StyleMap, useStyledClass } from '../utils/style';

export interface GalleryItem {
  type: 'image' | 'video';
  src: string;
  hideFromProgress?: boolean;
  startFrom?: number;
  durationInFrames: number;
  muted?: boolean;
}

const Styles = {
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
};

const GalleryItemView: React.FC<{
  name: string;
  item: GalleryItem;
  startFrom: number;
  endAt: number;
  style?: React.CSSProperties;
  className?: string;
}> = ({ name, item, startFrom, endAt, style, className }) => {
  const frame = useCurrentFrame();
  let comp: JSX.Element;
  if (item.type === 'video') {
    comp = (
      <OffthreadVideo
        src={toUrlIfNecessary(item.src)}
        startFrom={item.startFrom}
        muted={item.muted}
        style={style}
        className={className}
      />
    );
  } else {
    comp = <Img src={toUrlIfNecessary(item.src)} style={style} className={className} />;
  }
  if (frame < startFrom) {
    comp = <Freeze frame={0}>{comp}</Freeze>;
  } else if (frame >= endAt) {
    comp = <Freeze frame={endAt - startFrom}>{comp}</Freeze>;
  } else {
    comp = (
      <Sequence from={startFrom} layout="none" showInTimeline={false}>
        {comp}
      </Sequence>
    );
  }
  return (
    <>
      {endAt > startFrom ? (
        <Sequence from={startFrom} durationInFrames={endAt - startFrom} name={name} layout="none">
          <></>
        </Sequence>
      ) : null}
      {comp}
    </>
  );
};

export const Gallery: React.FC<{
  items: GalleryItem[];
  transitionInFrames: number;
  startFrom?: number;
}> = ({ items, transitionInFrames, startFrom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let itemProgress = 0;
  let progressOpacity = 1;
  let indicatorProgress = 0;
  let indicatorCount = 0;
  let delay = startFrom ?? 0;
  const itemSeq: number[] = [];
  for (let i = 0; i < items.length; i++) {
    const curProgressOpacity = items[i].hideFromProgress ? 0 : 1;
    if (i === 0) {
      progressOpacity = curProgressOpacity;
    }
    if (curProgressOpacity === 1) {
      indicatorCount += 1;
    }
    itemSeq.push(delay);
    delay += items[i].durationInFrames;
    if (i < items.length - 1) {
      const springValue = spring({
        frame,
        fps,
        delay,
        config: {
          mass: 0.2,
          stiffness: 50,
        },
        durationInFrames: transitionInFrames,
      });
      const nextProgressOpacity = items[i + 1].hideFromProgress ? 0 : 1;
      progressOpacity += springValue * (nextProgressOpacity - curProgressOpacity);
      if (curProgressOpacity === 1) {
        if (nextProgressOpacity === 1) {
          indicatorProgress += springValue;
        } else {
          indicatorProgress += frame > delay + transitionInFrames ? 1 : 0;
        }
      }
      itemProgress += springValue;
    }
  }
  itemSeq.push(delay);
  const imageAnimateStyles: StyleMap<`imageSpec${number}`> = {};
  for (let i = 0; i < items.length; i++) {
    imageAnimateStyles[`imageSpec${i}`] = {
      transform: `translateX(${(i - itemProgress) * 100}%)`,
    };
  }
  const styled = useStyledClass(
    Styles,
    {
      imageProgressContainer: style({
        opacity: clampOne(progressOpacity),
      }),
      imageProgressIndicator: style({
        transform: `translateX(calc((100% + 20px) * ${indicatorProgress}))`,
      }),
    },
    imageAnimateStyles
  );
  return (
    <div {...styled('gallery')}>
      <div {...styled('imageContainer')}>
        <GalleryItemView key="sizer" name="Sizer" item={items[0]} startFrom={0} endAt={0} {...styled('imageSizer')} />
        {items.map((item, i) => (
          <GalleryItemView
            key={i}
            name={`Item ${i + 1}: ${item.type}`}
            item={item}
            startFrom={itemSeq[i]}
            endAt={itemSeq[i + 1]}
            {...styled('image', `imageSpec${i}`)}
          />
        ))}
      </div>
      <div {...styled('imageProgressContainer')}>
        {Array(indicatorCount)
          .fill(0)
          .map((_, i) => {
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
  );
};
