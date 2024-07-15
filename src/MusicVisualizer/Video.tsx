import { Composition, registerRoot } from 'remotion';
import { z } from 'zod';
import { extraStyleMapSchema } from '../utils/extraStyle';
import { getInputProps } from '../utils/inputProps';
import { MusicVisualizer } from './MusicVisualizer';

export const inputPropsSchema = z.object({
  fps: z.number().positive(),
  resolution: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    scale: z.number().positive(),
  }),
  music: z.string(),
  album: z.string(),
  title: z.string(),
  artists: z.string(),
  background: z.string(),
  backgroundType: z.enum(['image', 'video']),
  duration: z.number(),
  lyricTracks: z.array(
    z.object({
      fontName: z.string().optional(),
      fontSize: z.number().optional(),
      lyrics: z.array(
        z.object({
          start: z.number(),
          end: z.number(),
          track: z.number(),
          text: z.string(),
        })
      )
    })
  ),
  extraStyles: extraStyleMapSchema,
});

export type InputProps = z.infer<typeof inputPropsSchema>;

export const RemotionVideo: React.FC = () => {
  const props = getInputProps(inputPropsSchema);
  return (
    <>
      <Composition
        id="MusicVisualizer"
        component={MusicVisualizer}
        durationInFrames={Math.ceil(props.fps * props.duration)}
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
