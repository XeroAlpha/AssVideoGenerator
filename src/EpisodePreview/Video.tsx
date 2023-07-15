import { Composition, registerRoot } from 'remotion';
import { z } from 'zod';
import { getInputProps } from '../utils/inputProps';
import { EpisodePreview } from './EpisodePreview';

export const inputPropsSchema = z.object({
  fps: z.number().positive(),
  resolution: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  videoEnd: z.boolean().optional(),
  images: z.array(z.string()),
  title: z.string(),
  description: z.string(),
  staff: z.string().optional(),
  background: z.string().optional(),
  interval: z.number(),
  textDuration: z.number(),
  transition: z.number(),
  bgm: z
    .object({
      src: z.string(),
      start: z.number(),
      volume: z.number(),
    })
    .optional(),
});

export type InputProps = z.infer<typeof inputPropsSchema>;

export function calculateFrameCounts(inputProps: InputProps) {
  const { fps, images, interval, transition, textDuration, videoEnd } =
    inputProps;
  return {
    imageDurationInFrames: Math.floor(
      fps * (images.length * interval - transition)
    ),
    intervalInFrames: Math.floor(fps * interval),
    textDurationInFrames: Math.floor(fps * textDuration),
    transitionInFrames: Math.floor(fps * transition),
    durationInFrames: Math.floor(
      fps *
        (images.length * interval +
          textDuration +
          transition * (videoEnd ? 2 : 1))
    ),
  };
}

export const RemotionVideo: React.FC = () => {
  const props = getInputProps(inputPropsSchema);
  const frameCountMeta = calculateFrameCounts(props);
  return (
    <Composition
      id="EpisodePreview"
      component={EpisodePreview}
      durationInFrames={frameCountMeta.durationInFrames}
      fps={props.fps}
      width={props.resolution.width}
      height={props.resolution.height}
      schema={inputPropsSchema}
      defaultProps={props}
    />
  );
};

registerRoot(RemotionVideo);
