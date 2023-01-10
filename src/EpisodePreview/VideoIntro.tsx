import { Freeze, Video } from 'remotion';
import { CSSProperties } from 'react';
import { AbsoluteFill } from 'remotion';

export const VideoIntro: React.FC<{
  video: string;
  videoDuration: number;
}> = ({ video, videoDuration }) => {
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
      <Freeze frame={0}>
        <Video src={video} startFrom={videoDuration} style={videoStyle} />
      </Freeze>
    </AbsoluteFill>
  );
};
