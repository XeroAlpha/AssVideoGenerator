import { registerRoot, Composition } from 'remotion';
import { zTextarea } from '@remotion/zod-types';
import { z } from 'zod';
import { getInputProps } from '../utils/inputProps';
import { BangumiPV } from './BangumiPV';

export const sectionSchema = z.object({
  name: z.string(),
  content: zTextarea(),
  style: z.string(),
  styleOptions: z.record(z.string(), z.string().optional()),
});

export const pageSchema = z.object({
  enterTime: z.number(),
  exitTime: z.number(),
  effect: z.string(),
  effectOptions: z.record(z.string(), z.string().optional()),
  sections: z.array(sectionSchema),
});

export const inputPropsSchema = z.object({
  fps: z.number(),
  duration: z.number(),
  resolution: z.object({
    width: z.number(),
    height: z.number(),
  }),
  video: z.string(),
  highlightTime: z.number(),
  kv: z.string(),
  title: zTextarea(),
  titleOriginal: zTextarea().optional(),
  extraStyles: z.record(z.string(), z.record(z.string(), z.string().optional()).optional()),
  pages: z.array(pageSchema),
});

export type Section = z.infer<typeof sectionSchema>;

export type Page = z.infer<typeof pageSchema>;

export type InputProps = z.infer<typeof inputPropsSchema>;

export const RemotionVideo: React.FC = () => {
  const props = getInputProps(inputPropsSchema);
  return (
    <>
      <Composition
        id="BangumiPV"
        component={BangumiPV}
        durationInFrames={Math.floor(props.duration * props.fps)}
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
