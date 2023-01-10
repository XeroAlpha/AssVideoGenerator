import { Composition, getInputProps, registerRoot } from 'remotion';
import { EpisodePreview } from './EpisodePreview';
import type { InputProps } from './index';

export const RemotionVideo: React.FC = () => {
  const props = getInputProps() as InputProps;
  return (
    <Composition
      id="EpisodePreview"
      component={EpisodePreview}
      durationInFrames={props.durationInFrames}
      fps={props.fps}
      width={props.resolution.width}
      height={props.resolution.height}
      defaultProps={props}
    />
  );
};

registerRoot(RemotionVideo);
