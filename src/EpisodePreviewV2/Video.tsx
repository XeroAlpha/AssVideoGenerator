import { zTextarea } from '@remotion/zod-types';
import { Composition, registerRoot } from 'remotion';
import { z } from 'zod';
import { extraStyleMapSchema } from '../utils/extraStyle';
import { getInputProps } from '../utils/inputProps';
import { EpisodePreview } from './EpisodePreview';

export const inputPropsSchema = z.object({
  fps: z.number().positive(),
  resolution: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  previewPosition: z.string().optional(),
  images: z.array(z.string()),
  episodeName: z.string(),
  title: z.string(),
  description: zTextarea(),
  staff: zTextarea().optional(),
  info: zTextarea().optional(),
  background: z.string().optional(),
  interval: z.number(),
  transition: z.number(),
  ending: z.number().optional(),
  bgm: z
    .object({
      src: z.string(),
      start: z.number(),
      volume: z.number(),
    })
    .optional(),
  extraStyles: extraStyleMapSchema,
});

export type InputProps = z.infer<typeof inputPropsSchema>;

export function calculateFrameCounts(inputProps: InputProps) {
  const { fps, images, interval, transition, ending } = inputProps;
  return {
    imageDurationInFrames: Math.floor(fps * (images.length * interval - transition)),
    intervalInFrames: Math.floor(fps * interval),
    transitionInFrames: Math.floor(fps * transition),
    endingInFrames: Math.floor(fps * (ending ?? transition)),
    durationInFrames: Math.floor(fps * (images.length * interval + (ending ?? transition))),
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
