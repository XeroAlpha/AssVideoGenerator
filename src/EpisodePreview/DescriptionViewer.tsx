import { AbsoluteFill, Img } from 'remotion';
import { toUrlIfNecessary } from '../utils/staticServerApi';
import { style, useStyledClass } from '../utils/style';

const Styles = {
  black: style({
    backgroundColor: 'black',
  }),
  center: style({
    justifyContent: 'center',
    alignItems: 'center',
  }),
  image: style({
    objectFit: 'contain',
    filter: 'blur(5px)',
  }),
  bar: style({
    width: '60%',
    height: 'auto',
    color: 'white',
    fontFamily: '"方正FW轻吟体 简", "方正准圆_GBK", "思源黑体"',
    fontWeight: 700,
    zIndex: 100,
    textShadow: Array(2).fill('0px 0px 5px black').join(','),
    wordBreak: 'break-all',
  }),
  title: style({
    margin: 0,
    marginTop: '0px',
    marginBottom: '15px',
    fontSize: '60px',
    fontWeight: 900,
    whiteSpace: 'pre-line',
  }),
  descriptionPara: style({
    margin: 0,
    marginTop: '0px',
    marginBottom: '15px',
    fontSize: '45px',
  }),
  spacing: style({
    padding: '15px',
  }),
  staffPara: style({
    margin: 0,
    fontSize: '40px',
  }),
};

export const DescriptionViewer: React.FC<{
  title: string;
  description: string;
  background?: string;
  staff?: string;
  scaleRatio: number;
}> = ({ title, description, background, staff, scaleRatio }) => {
  const styled = useStyledClass({
    ...Styles,
    scaleHelper: {
      width: `${100 / scaleRatio}%`,
      height: `${100 / scaleRatio}%`,
      transform: `translate(-50%, -50%) scale(${scaleRatio}) translate(50%, 50%)`,
    },
  });
  const descriptionElements = description.split('\n').map((line, index) => (
    <p key={index} {...styled('descriptionPara')}>
      {line}
    </p>
  ));
  if (staff) {
    descriptionElements.push(<div key={1000} {...styled('spacing')} />);
    descriptionElements.push(
      ...staff.split('\n').map((line, index) => (
        <p key={index + 1001} {...styled('staffPara')}>
          {line}
        </p>
      ))
    );
  }
  return (
    <>
      <AbsoluteFill {...styled('black')}>
        {background ? <Img src={toUrlIfNecessary(background)} {...styled('image')} /> : null}
      </AbsoluteFill>
      <AbsoluteFill {...styled('center', 'scaleHelper')}>
        <div {...styled('bar')}>
          <p {...styled('title')}>{title}</p>
          {descriptionElements}
        </div>
      </AbsoluteFill>
    </>
  );
};
