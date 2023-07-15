import { Img } from 'remotion';
import { AbsoluteFill } from 'remotion';
import { style } from '../utils/style';

export const VideoIntro: React.FC<{
  videoEnd: string;
}> = ({ videoEnd }) => {
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
      <Img src={videoEnd} style={videoStyle} />
    </AbsoluteFill>
  );
};
