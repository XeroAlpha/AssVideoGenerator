import { CSSProperties } from 'react';
import { Img, interpolate, AbsoluteFill, Easing } from 'remotion';

export const PreviewViewer: React.FC<{
  frame: number;
  durationInFrames: number;
  images: string[];
  interval: number;
  transitionTime: number;
  title: string;
}> = ({ frame, images, interval, transitionTime, title }) => {
  const currentIndex = Math.min(
    Math.floor(frame / interval),
    images.length - 1
  );
  const nextIndex = Math.min(currentIndex + 1, images.length - 1);
  const firstImage = images[currentIndex];
  const secondImage = images[nextIndex];
  const transitionProgress = interpolate(
    frame - interval * (currentIndex + 1),
    [-transitionTime, 0],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
    }
  );
  const roundIndex = transitionProgress < 0.5 ? currentIndex : nextIndex;
  const fadeIn = interpolate(frame, [0, transitionTime], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const descriptionMoveIn = interpolate(frame, [0, transitionTime], [100, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0, 0, 0.3, 1),
  });

  const imgBaseStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: 'black',
    zIndex: 0,
  };
  const firstImgStyle: CSSProperties = {
    ...imgBaseStyle,
    zIndex: 100,
    opacity: 1 - transitionProgress,
  };
  const indexStyle: CSSProperties = {
    position: 'absolute',
    right: '50px',
    bottom: '50px',
    zIndex: 200,
    fontSize: '72px',
    fontFamily: '思源黑体',
    fontWeight: 900,
    color: 'rgba(255, 255, 255, .4)',
    opacity: fadeIn,
  };
  const descriptionStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    bottom: 0,
    padding: '60px',
    zIndex: 200,
    fontSize: '60px',
    fontFamily: '思源宋体',
    wordBreak: 'break-all',
    color: 'white',
    textShadow:
      '1px 0px 10px black, -1px 0px 10px black, 0px 1px 10px black, 0px -1px 10px black',
    transform: `translateY(${descriptionMoveIn * 1.2}%)`,
  };
  const titleStyle: CSSProperties = {
    margin: 0,
    marginTop: '15px',
    fontWeight: 700,
    whiteSpace: 'pre-line',
  };
  return (
    <AbsoluteFill>
      <Img src={firstImage} style={firstImgStyle} />
      <Img src={secondImage} style={imgBaseStyle} />
      <div style={indexStyle}>
        先行图 {roundIndex + 1} / {images.length}
      </div>
      <div style={descriptionStyle}>
        <p style={titleStyle}>{title}</p>
      </div>
    </AbsoluteFill>
  );
};
