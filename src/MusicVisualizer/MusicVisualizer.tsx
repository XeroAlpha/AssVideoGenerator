import { getWaveformPortion, useAudioData } from '@remotion/media-utils';
import React, { ReactElement, useMemo } from 'react';
import { AbsoluteFill, Img, interpolate, OffthreadVideo, useCurrentFrame } from 'remotion';
import { AirDustView } from '../common/AirDustView';
import { AudioWaveform } from '../common/AudioWaveform';
import { Marquee } from '../common/Marquee';
import { interpolateClamp } from '../utils/interpolate';
import { Scaler } from '../utils/resolution';
import { toUrlIfNecessary } from '../utils/staticServerApi';
import { style, Styled, Styler, useStyledClass } from '../utils/style';
import { LyricsView } from './LyricsView';
import { InputProps } from './Video';

const Styles = {
  background: style({
    width: '100%',
    height: '100%',
    zIndex: '0',
  }),
  backgroundCover: style({
    objectFit: 'cover'
  }),
  backgroundContain: style({
    objectFit: 'contain'
  }),
  backgroundContainEnable: style({
    display: 'none',
    filter: 'drop-shadow(0 0 10px black)',
    backdropFilter: 'blur(20px)'
  }),
  backgroundBlack: style({
    backgroundColor: 'black'
  }),
  backgroundOverlay: style({
    margin: '-30px',
    width: '200%',
    height: '200%',
  }),
  bgmBarContainer: style({
    position: 'absolute',
    bottom: 'calc(40% + 75px)',
    width: '100%',
    height: '100%',
    padding: '0px 75px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: '3px',
    zIndex: '10',
  }),
  bgmBar: style({
    flexGrow: '1',
    flexShrink: '1',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    filter: 'drop-shadow(white 0px 0px 10px)',
  }),
  airDustContainer: style({
    position: 'absolute',
    zIndex: 1,
    left: '0px',
    top: '0px',
    width: '100%',
    height: '100%',
  }),
  dustViewContainer: style({
    position: 'absolute',
    left: '0px',
    top: '0px',
    width: '100%',
    height: '100%',
    zIndex: '5',
  }),
  dustViewDust: style({
    width: '5px',
    height: '5px',
    borderRadius: '1000px',
    background: 'white',
    filter: 'blur(2px)',
    zIndex: '5',
  }),
  playerCardContainer: style({
    padding: '0px 50px 50px 50px',
    justifyContent: 'end',
    alignItems: 'start',
    zIndex: '30',
  }),
  playerCard: style({
    width: '100%',
    height: '40%',
    padding: '25px',
    display: 'flex',
    gap: '25px',
  }),
  playerAlbumImg: style({
    height: '100%',
    borderRadius: '20px',
    boxShadow: '0px 0px 20px white',
  }),
  playerRightPart: style({
    flexGrow: '1',
    padding: '10px 10px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column-reverse',
  }),
  mediaInfoContainer: style({
    flexGrow: '1',
    display: 'flex',
    flexDirection: 'column-reverse',
    justifyContent: 'flex-start',
  }),
  marquee: style({
    paddingRight: '100px'
  }),
  mediaTitle: style({
    padding: '0px 100px 0px 5px',
    fontFamily: '"思源黑体 Medium"',
    fontWeight: 400,
    fontSize: '45px',
    color: '#eee',
  }),
  "mediaTitle-jp": style({
    fontFamily: 'Source Han Sans JP Medium'
  }),
  "mediaTitle-cn": style({
    fontFamily: '思源黑体 Medium'
  }),
  mediaArtistsContainer: style({
    flexGrow: '1',
    marginBottom: '15px',
    padding: '0px 5px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'end',
  }),
  mediaArtists: style({
    fontFamily: '"思源黑体"',
    fontWeight: 400,
    fontSize: '35px',
    color: '#aaa',
  }),
  "mediaArtists-jp": style({
    fontFamily: 'Source Han Sans JP'
  }),
  "mediaArtists-cn": style({
    fontFamily: '思源黑体'
  }),
  mediaLyricsContainer: style({
    marginTop: '-5px',
    marginBottom: '15px',
    padding: '0px 5px',
    display: 'flex',
    flexDirection: 'column',
    flexWrap: 'wrap',
  }),
  mediaLyrics: style({
    fontFamily: '"思源黑体"',
    fontWeight: 400,
    fontSize: '40px',
    color: '#eee',
  }),
};

function variantText(text: string, prefix: string, styled: Styler) {
  const stack: [string, (string | ReactElement)[]][] = [['', []]];
  let cursor = 0;
  for (;;) {
    const rest = text.slice(cursor);
    const match = /<(\/)?(\w+)>/.exec(rest);
    if (!match) {
      stack[0][1].push(rest);
      break;
    }
    stack[0][1].push(rest.slice(0, match.index));
    const isEndTag = match[1] !== undefined;
    const variant = match[2];
    if (isEndTag) {
      if (stack.length > 1) {
        const [childVariant, children] = stack.shift()!;
        stack[0][1].push(<span {...styled(`${prefix}-${childVariant}`)}>{...children}</span>);
      }
    } else {
      stack.unshift([variant, []]);
    }
    cursor += match.index + match[0].length;
  }
  return (<span>{...stack[0][1]}</span>);
}

function calculateFadeProgress(seconds: number, duration: number, inOutDurations: InputProps['inOutDurations']) {
  const inProgress = interpolateClamp(seconds - inOutDurations.enterDelay, [-Number.EPSILON, inOutDurations.enterDuration], [0, 1]);
  const outProgress = interpolateClamp(seconds - (duration - inOutDurations.exitAdvance), [-inOutDurations.exitDuration, Number.EPSILON], [1, 0]);
  return Math.min(inProgress, outProgress);
}

export const MusicVisualizer: React.FC<InputProps> = (meta) => {
  const frame = useCurrentFrame();
  const seconds = frame / meta.fps;
  const backgroundUrl = meta.background ? toUrlIfNecessary(meta.background) : null;
  const fadeProgress = calculateFadeProgress(seconds, meta.duration, meta.inOutDurations);
  const styles = {
    ...Styles,
    backgroundOverlayDarken: {
      backdropFilter: `brightness(${(1 - fadeProgress * 0.6) * 100}%)`,
    },
    fadeInOut: {
      opacity: fadeProgress
    }
  };
  const styled = useStyledClass(styles, meta.extraStyles);
  const audioData = useAudioData(meta.music);
  const volumeTimeline = useMemo(
    () =>
      audioData
        ? getWaveformPortion({
            audioData,
            startTimeInSeconds: 0,
            durationInSeconds: meta.duration,
            numberOfSamples: Math.ceil(meta.duration * meta.fps),
          })
        : [],
    [audioData, meta.duration, meta.fps]
  );
  const smoothRange = Math.ceil(meta.fps * 0.2);
  const dustSpeedTimeline = useMemo(
    () =>
      volumeTimeline
        .map(({ amplitude }) => amplitude)
        .map((_, index, arr) => {
          const rangeValues: number[] = arr.slice(Math.max(0, index - smoothRange), index);
          const avg = rangeValues.reduce((sum, e) => sum + e, 0) / smoothRange;
          return interpolateClamp(avg, [0, 0.5], [0.01, 1]);
        }),
    [volumeTimeline, smoothRange]
  );
  if (volumeTimeline.length === 0) {
    return null;
  }
  
  return (
    <Styled styles={styles} importantStyles={meta.extraStyles}>
      <Scaler {...meta.resolution}>
        {backgroundUrl ? (
          <>
            <AbsoluteFill>
              {meta.backgroundType === 'video' ? (
                <OffthreadVideo muted src={backgroundUrl} startFrom={meta.backgroundOffset ?? 0} {...styled('background', 'backgroundCover')} />
              ) : (
                <Img src={backgroundUrl} {...styled('background', 'backgroundCover')} />
              )}
            </AbsoluteFill>
            <AbsoluteFill {...styled('backgroundContainEnable')}>
              {meta.backgroundType === 'video' ? (
                <OffthreadVideo muted src={backgroundUrl} {...styled('background', 'backgroundContain')} />
              ) : (
                <Img src={backgroundUrl} {...styled('background', 'backgroundContain')} />
              )}
            </AbsoluteFill>
          </>
        ) : (
          <AbsoluteFill {...styled('background', 'backgroundBlack')} />
        )}
        <AbsoluteFill {...styled('backgroundOverlay', 'backgroundOverlayDarken')} />
        <div {...styled('fadeInOut')}>
          {meta.backgroundType === 'image' ? (
            <AirDustView
              width={meta.resolution.width}
              height={meta.resolution.height}
              dustPerSeconds={20}
              timescale={(sec) => dustSpeedTimeline[Math.floor(sec * meta.fps)] ?? 0.1}
              theta={(rnd) => interpolate(rnd, [0, 1], [Math.PI * 0.9, Math.PI * 1.1])}
              speed={(rnd) => interpolate(rnd, [0, 1], [1 / 10, 1 / 2])}
              dust={({ style }) => <div {...styled('dustViewDust', style)} />}
              {...styled('dustViewContainer')}
            />
          ) : null}
          <AudioWaveform
            src={meta.music}
            horizontalScale="log"
            verticalScale="linear"
            samples={128}
            optimizeFor="speed"
            freqRange={[20, 15000]}
            bar={({ volume }) => <div {...styled('bgmBar', { height: `${volume * 100}%` })} />}
            {...styled('bgmBarContainer')}
          />
          <AbsoluteFill {...styled('playerCardContainer')}>
            <div {...styled('playerCard')}>
              {meta.album ? (
                <Img src={toUrlIfNecessary(meta.album)} {...styled('playerAlbumImg')} />
              ) : null}
              <div {...styled('playerRightPart')}>
                <div {...styled('mediaInfoContainer')}>
                  <Marquee
                    single
                    el={() => <span {...styled('mediaTitle', 'marquee', 'mediaTitle-cn')}>{variantText(meta.title, 'mediaTitle', styled)}</span>}
                    width="100%"
                    speed={meta.fps / 60}
                    broke={meta.fps * 5}
                  />
                  <div {...styled('mediaArtistsContainer')}>
                    {meta.artists
                      .split('\n')
                      .filter((t) => t.trim() !== '')
                      .map((e, i) => (
                        <Marquee
                          key={i}
                          single 
                          el={() => <div {...styled('mediaArtists', 'marquee', 'mediaArtists-cn')}>{variantText(e, 'mediaArtists', styled)}</div>}
                          width="100%"
                          speed={meta.fps / 60}
                          broke={meta.fps * 5}
                        />
                      ))}
                  </div>
                  <div {...styled('mediaLyricsContainer')}>
                    {meta.lyricTracks
                      .map((e, i) => (
                        <div key={i} {...styled('mediaLyrics', {
                          fontFamily: e.fontName ? `"${e.fontName}"` : undefined,
                          fontSize: e.fontSize ? `${e.fontSize}px` : undefined
                        }, `mediaLyrics-${i + 1}`)}>
                          <LyricsView lyrics={e.lyrics} />
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </AbsoluteFill>
        </div>
      </Scaler>
    </Styled>
  );
};
