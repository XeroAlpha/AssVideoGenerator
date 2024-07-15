import { AbsoluteFill, Img } from 'remotion';
import { style } from '../utils/style';

export const VideoShot: React.FC<{
  url: string;
}> = ({ url }) => {
  const videoStyle = style({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: 'black',
  });
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <Img src={url} style={videoStyle} />
    </AbsoluteFill>
  );
};
