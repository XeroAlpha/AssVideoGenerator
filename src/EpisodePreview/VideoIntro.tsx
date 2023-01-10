import { Img } from 'remotion';
import { CSSProperties } from 'react';
import { AbsoluteFill } from 'remotion';

export const VideoIntro: React.FC<{
  videoEnd: string;
}> = ({ videoEnd }) => {
  const videoStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: 'black',
  };
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
        <Img src={videoEnd} style={videoStyle} />
    </AbsoluteFill>
  );
};
