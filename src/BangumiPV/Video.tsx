import { registerRoot, Composition, getInputProps } from 'remotion';
import { BangumiPV } from './BangumiPV';
import type { InputProps } from './index';

export const RemotionVideo: React.FC = () => {
  const props = getInputProps() as InputProps;
  return (
    <>
      <Composition
        id="BangumiPV"
        component={BangumiPV}
        durationInFrames={Math.floor(props.duration * props.fps)}
        fps={props.fps}
        width={props.resolution.width}
        height={props.resolution.height}
        defaultProps={props}
      />
    </>
  );
};

registerRoot(RemotionVideo);
