import { zTextarea } from '@remotion/zod-types';
import { Composition, registerRoot } from 'remotion';
import { z } from 'zod';
import { extraStyleMapSchema } from '../utils/extraStyle';
import { getInputProps } from '../utils/inputProps';
import { EpisodePreview } from './EpisodePreview';
import { EpisodePreviewEmbedded } from './EpisodePreviewEmbedded';

export const inputPropsSchema = z.object({
  fps: z.number().positive(),
  remapFps: z.boolean().optional(),
  resolution: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  previewPosition: z.enum(['start', 'end']),
  images: z.array(z.string()),
  episodeName: z.string(),
  title: z.string(),
  description: zTextarea(),
  staff: zTextarea().optional(),
  info: zTextarea().optional(),
  background: z.string(),
  interval: z.number(),
  transition: z.number(),
  ending: z.number().optional(),
  videoDuration: z.number(),
  bgm: z
    .object({
      src: z.string(),
      start: z.number(),
    })
    .optional(),
  extraStyles: extraStyleMapSchema,
});

export type InputProps = z.infer<typeof inputPropsSchema>;

function withInFrames<K extends string>(fps: number, o: Record<K, number>): Record<K | `${K}InFrames`, number> {
  const result = { ...o } as Record<K | `${K}InFrames`, number>;
  Object.keys(o).forEach((k) => {
    result[`${k as K}InFrames`] = Math.floor(fps * o[k as K]);
  });
  return result;
}

export function calculateFrameCounts(inputProps: InputProps, embedVideo?: boolean) {
  const { fps, videoDuration, images, interval, transition, ending } = inputProps;
  const endingWithDefault = ending ?? transition;
  const result = {
    interval,
    transition,
    videoDuration,
    ending: endingWithDefault,
    duration: images.length * interval + endingWithDefault,
  };
  if (embedVideo) {
    result.duration += interval + videoDuration;
  }
  return withInFrames(fps, result);
}

export const RemotionVideo: React.FC = () => {
  const props = getInputProps(inputPropsSchema);
  const frameCountMeta = calculateFrameCounts(props, false);
  const frameCountMetaEmbedded = calculateFrameCounts(props, true);
  return (
    <>
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
      <Composition
        id="EpisodePreviewEmbedded"
        component={EpisodePreviewEmbedded}
        durationInFrames={frameCountMetaEmbedded.durationInFrames}
        fps={props.fps}
        width={props.resolution.width}
        height={props.resolution.height}
        schema={inputPropsSchema}
        defaultProps={props}
      />
    </>
  );
};

registerRoot(RemotionVideo);
