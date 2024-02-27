import { ReactNode } from 'react';
import { AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { interpolateClamp } from '../utils/interpolate';
import { paragraphToDOM } from '../utils/paragraph';
import { toUrlIfNecessary } from '../utils/staticServerApi';
import { style } from '../utils/style';
import { InputProps } from './Video';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Styles = {
  background: style({
    objectFit: 'cover',
    width: '100%',
    height: '100%',
    zIndex: 0,
  }),
  horizontalLayout: style({
    position: 'absolute',
    height: '100%',
    width: '100%',
    display: 'flex',
    fontFamily: '"方正FW轻吟体 简"',
    zIndex: 10,
  }),
  leftBar: style({
    flex: '0 0',
    color: 'white',
    height: '100%',
    padding: '40px',
    position: 'relative',
  }),
  titleBar: style({
    position: 'absolute',
    right: '40px',
    bottom: '40px',
    maxWidth: 'calc(100% - 120px)',
    backgroundColor: 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(5px)',
    borderRadius: '25px 0px 25px 0px',
    border: '5px solid white',
    padding: '30px',
    fontSize: '50px',
    fontWeight: '700',
    textAlign: 'center',
    color: 'black',
  }),
  titleBarOriginal: style({
    fontFamily: '思源黑体',
    marginTop: '10px',
    fontSize: '35px',
  }),
  kvWrapper: style({
    height: '100%',
  }),
  kv: style({
    height: '100%',
    width: 'fit-content',
    objectFit: 'cover',
    borderRadius: '25px',
    border: '5px solid white',
    backgroundColor: 'black',
  }),
  rightBar: style({
    flex: '1 0',
    height: '100%',
    marginLeft: '20px',
    boxShadow: '-10px 0px 10px rgba(0,0,0,0.5)',
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(10px)',
    fontSize: '35px',
    lineHeight: '50px',
    fontFamily: '方正准圆_GBK',
    color: 'black',
  }),
  page: style({
    position: 'absolute',
    inset: '0 0 0 0',
    padding: '25px 50px 50px 50px',
    overflow: 'clip',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gridAutoRows: 'min-content',
  }),
  label: style({
    height: 'fit-content',
    borderRadius: '1000px',
    marginTop: '20px',
    padding: '10px 25px',
    backgroundColor: 'black',
    color: 'white',
    textAlign: 'center',
    alignSelf: 'start',
  }),
  content: style({
    alignSelf: 'center',
    padding: '30px 0 20px 0',
    marginLeft: '30px',
  }),
  sectionParagraph: style({
    marginTop: '30px',
  }),
  sectionParagraphFirst: style({
    marginTop: '0',
  }),
};

const elasticEasing = Easing.elastic();

export const BangumiPV: React.FC<InputProps> = ({
  title,
  titleOriginal,
  kv,
  extraStyles,
  pages,
  video,
  highlightTime,
}) => {
  const { durationInFrames, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const time = frame / fps;

  const barIntroAnimation = interpolateClamp(time, [0.2, 0.7], [0, 1], Easing.out(Easing.circle));
  const videoAnimationFunc = (frame: number) => {
    return (
      interpolateClamp(frame, [0.7 * fps, 1.2 * fps], [0, 1]) +
      interpolateClamp(frame, [durationInFrames - 0.7 * fps, durationInFrames], [0, -1])
    );
  };

  const backgroundStyle = style(
    {
      opacity: videoAnimationFunc(frame),
      objectFit: 'cover',
      width: '100%',
      height: '100%',
      zIndex: 0,
    },
    extraStyles.background
  );
  const horizontalLayoutStyle = style(
    {
      position: 'absolute',
      height: '100%',
      width: '100%',
      display: 'flex',
      fontFamily: '"方正FW轻吟体 简"',
      opacity: interpolateClamp(frame, [durationInFrames - 0.5 * fps, durationInFrames], [1, 0]),
      zIndex: 10,
    },
    extraStyles.horizontalLayout
  );
  const leftBarStyle = style(
    {
      flex: '0 0',
      color: 'white',
      height: '100%',
      padding: '40px',
      position: 'relative',
      transform: `translateX(${interpolateClamp(barIntroAnimation, [0, 1], [-100, 0])}%)`,
    },
    extraStyles.leftBar
  );
  const titleBarStyle = style(
    {
      position: 'absolute',
      right: '40px',
      bottom: '40px',
      maxWidth: 'calc(100% - 120px)',
      backgroundColor: 'rgba(255,255,255,0.8)',
      backdropFilter: 'blur(5px)',
      borderRadius: '25px 0px 25px 0px',
      border: '5px solid white',
      padding: '30px',
      fontSize: '50px',
      fontWeight: '700',
      textAlign: 'center',
      color: 'black',
    },
    extraStyles.titleBar
  );
  const titleBarOriginalStyle = style(
    {
      fontFamily: '思源黑体',
      marginTop: '10px',
      fontSize: '35px',
    },
    extraStyles.titleBarOriginal
  );
  const kvWrapperStyle = style(
    {
      height: '100%',
    },
    extraStyles.kvWrapper
  );
  const kvStyle = style(
    {
      height: '100%',
      width: 'fit-content',
      objectFit: 'cover',
      borderRadius: '25px',
      border: '5px solid white',
      backgroundColor: 'black',
    },
    extraStyles.kv
  );
  const rightBarStyle = style(
    {
      flex: '1 0',
      height: '100%',
      marginLeft: '20px',
      boxShadow: '-10px 0px 10px rgba(0,0,0,0.5)',
      position: 'relative',
      backgroundColor: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(10px)',
      transform: `translateX(${interpolateClamp(barIntroAnimation, [0, 1], [110, 0])}%)`,
      fontSize: '35px',
      lineHeight: '50px',
      fontFamily: '方正准圆_GBK',
      color: 'black',
    },
    extraStyles.rightBar
  );
  const pageStyleBase = style(
    {
      position: 'absolute',
      inset: '0 0 0 0',
      padding: '25px 50px 50px 50px',
      overflow: 'clip',
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      gridAutoRows: 'min-content',
    },
    extraStyles.page
  );
  const labelStyleBase = style(
    {
      height: 'fit-content',
      borderRadius: '1000px',
      marginTop: '20px',
      padding: '10px 25px',
      backgroundColor: 'black',
      color: 'white',
      textAlign: 'center',
      alignSelf: 'start',
    },
    extraStyles.label
  );
  const sectionContentStyleBase = style(
    {
      alignSelf: 'center',
      padding: '30px 0 20px 0',
      marginLeft: '30px',
    },
    extraStyles.content
  );
  const sectionParagraphStyle = style(
    {
      marginTop: '30px',
    },
    extraStyles.sectionParagraph
  );
  const sectionFirstParagraphStyle = style(
    {
      marginTop: '0',
    },
    extraStyles.sectionParagraphFirst
  );

  const pagesDOM = pages.map((page, pageIndex) => {
    const pageStyle = style(pageStyleBase, extraStyles[`page.p${pageIndex}`]);
    if (page.effect === 'vertical') {
      pageStyle.gridTemplateColumns = '1fr';
    }
    if (pageIndex < pages.length - 1) {
      pageStyle.transform = `translateY(${interpolateClamp(
        time,
        [page.exitTime - 0.2, page.exitTime + 0.3],
        [0, 100],
        Easing.circle
      )}%)`;
    }
    const sectionsDOM = page.sections.flatMap((section, sectionIndex) => {
      let contentDOM: ReactNode = null;
      if (section.style === 'grid') {
        const gridColumnCount = parseInt(section.styleOptions.c || '', 10) || 2;
        const gridStyle = style(
          {
            display: 'grid',
            gridTemplateColumns: `repeat(${gridColumnCount}, 1fr)`,
            columnGap: '10px',
          },
          extraStyles.contentGrid,
          extraStyles[`contentGrid.p${pageIndex}`],
          extraStyles[`contentGrid.p${pageIndex}s${sectionIndex}`]
        );
        contentDOM = (
          <div style={gridStyle}>
            {section.content.split('\n\n').flatMap((para, paraIndex) =>
              para.split('\n').map((line, lineIndex, lines) => {
                const li = lineIndex % gridColumnCount;
                const itemStyle = style(
                  {
                    gridColumnStart: li + 1,
                    gridColumnEnd: li + 2,
                  },
                  extraStyles.contentGridItem,
                  extraStyles[`contentGridItem.p${pageIndex}`],
                  extraStyles[`contentGridItem.p${pageIndex}s${sectionIndex}`],
                  extraStyles[`contentGridItem.p${pageIndex}s${sectionIndex}p${paraIndex}`],
                  extraStyles[`contentGridItem.p${pageIndex}s${sectionIndex}p${paraIndex}#${lineIndex}`]
                );
                if (lineIndex === lines.length - 1) {
                  itemStyle.gridColumnEnd = gridColumnCount + 1;
                }
                return <div style={itemStyle}>{line}</div>;
              })
            )}
          </div>
        );
      } else {
        contentDOM = paragraphToDOM(
          section.content,
          style(
            sectionParagraphStyle,
            extraStyles[`sectionParagraph.p${pageIndex}`],
            extraStyles[`sectionParagraph.p${pageIndex}s${sectionIndex}`]
          ),
          style(
            sectionFirstParagraphStyle,
            extraStyles[`sectionParagraphFirst.p${pageIndex}`],
            extraStyles[`sectionParagraphFirst.p${pageIndex}s${sectionIndex}`]
          )
        );
      }

      const offsetedEnterTime = page.enterTime + sectionIndex * 0.2;
      const enterAnimation = interpolateClamp(
        time,
        [offsetedEnterTime, offsetedEnterTime + 0.5],
        [1, 0],
        Easing.in(elasticEasing)
      );
      const transitionStyle = style({
        opacity: 1 - enterAnimation,
        transform: `translateX(${15 * enterAnimation}vw)`,
      });
      const labelStyle = style(
        labelStyleBase,
        transitionStyle,
        extraStyles[`label.p${pageIndex}`],
        extraStyles[`label.p${pageIndex}s${sectionIndex}`]
      );
      const contentStyle = style(
        sectionContentStyleBase,
        transitionStyle,
        extraStyles[`content.p${pageIndex}`],
        extraStyles[`content.p${pageIndex}s${sectionIndex}`]
      );
      return [
        <div key={`label-${sectionIndex}`} style={labelStyle}>
          {section.name}
        </div>,
        <div key={`content-${sectionIndex}`} style={contentStyle}>
          {contentDOM}
        </div>,
      ];
    });
    return (
      <div key={pageIndex} style={pageStyle}>
        {sectionsDOM}
      </div>
    );
  });

  return (
    <AbsoluteFill style={style({ backgroundColor: 'black' }, extraStyles.root)}>
      <AbsoluteFill style={backgroundStyle}>
        <Sequence from={Math.floor(0.7 * fps)}>
          <OffthreadVideo
            muted
            style={extraStyles.backgroundVideo}
            src={toUrlIfNecessary(video)}
            startFrom={Math.floor(highlightTime * fps)}
          />
          <Audio
            volume={(f) => videoAnimationFunc(f + 0.7 * fps)}
            src={toUrlIfNecessary(video)}
            startFrom={Math.floor(highlightTime * fps)}
          />
        </Sequence>
      </AbsoluteFill>
      <div style={horizontalLayoutStyle}>
        <div style={leftBarStyle}>
          <div style={titleBarStyle}>
            {title.split('\n').map((e, i) => (
              <div key={i}>{e}</div>
            ))}
            {titleOriginal ? (
              <div style={titleBarOriginalStyle}>
                {titleOriginal.split('\n').map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            ) : null}
          </div>
          <div style={kvWrapperStyle}>
            <Img src={toUrlIfNecessary(kv)} style={kvStyle} />
          </div>
        </div>
        <div style={rightBarStyle}>{pagesDOM}</div>
      </div>
    </AbsoluteFill>
  );
};
