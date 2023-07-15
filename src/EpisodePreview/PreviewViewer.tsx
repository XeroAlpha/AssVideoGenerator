import { Img, interpolate, AbsoluteFill, Easing } from 'remotion';
import { toUrlIfNecessary } from '../utils/staticServerApi';
import { style } from '../utils/style';

export const PreviewViewer: React.FC<{
  frame: number;
  durationInFrames: number;
  images: string[];
  interval: number;
  transitionTime: number;
  title: string;
  scaleRatio: number;
}> = ({ frame, images, interval, transitionTime, title, scaleRatio }) => {
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

  const imgBaseStyle = style({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: 'black',
    zIndex: 0,
  });
  const firstImgStyle = style(imgBaseStyle, {
    zIndex: 100,
    opacity: 1 - transitionProgress,
  });
  const scaleStyle = style({
    position: 'absolute',
    left: '0px',
    top: '0px',
    width: `${100 / scaleRatio}%`,
    height: `${100 / scaleRatio}%`,
    zIndex: 200,
    transform: `translate(-50%, -50%) scale(${scaleRatio}) translate(50%, 50%)`,
  });
  const indexStyle = style({
    position: 'absolute',
    right: '50px',
    bottom: '50px',
    zIndex: 200,
    fontSize: '72px',
    fontFamily: '思源黑体',
    fontWeight: 900,
    color: 'rgba(255, 255, 255, .4)',
    opacity: fadeIn,
  });
  const descriptionStyle = style({
    position: 'absolute',
    left: 0,
    bottom: 0,
    padding: '60px',
    zIndex: 200,
    fontSize: '60px',
    fontFamily: '"方正FW轻吟体 简", "方正准圆_GBK", "思源黑体"',
    wordBreak: 'break-all',
    color: 'white',
    textShadow: Array(2).fill('0px 0px 10px black').join(','),
    transform: `translateY(${descriptionMoveIn * 1.2}%)`,
  });
  const titleStyle = style({
    margin: 0,
    marginTop: '15px',
    fontWeight: 700,
    whiteSpace: 'pre-line',
  });
  return (
    <AbsoluteFill>
      <Img src={toUrlIfNecessary(firstImage)} style={firstImgStyle} />
      <Img src={toUrlIfNecessary(secondImage)} style={imgBaseStyle} />
      <div style={scaleStyle}>
        <div style={indexStyle}>
          先行图 {roundIndex + 1} / {images.length}
        </div>
        <div style={descriptionStyle}>
          <p style={titleStyle}>{title}</p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
