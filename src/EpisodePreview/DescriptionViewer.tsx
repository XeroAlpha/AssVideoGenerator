import { AbsoluteFill, Img } from 'remotion';
import { style } from '../utils/style';

export const DescriptionViewer: React.FC<{
  title: string;
  description: string;
  background?: string;
  staff?: string;
}> = ({ title, description, background, staff }) => {
  const imageStyle = style({
    objectFit: 'contain',
    filter: 'blur(5px)',
  });
  const barStyle = style({
    width: '60%',
    height: 'auto',
    color: 'white',
    fontFamily: '"方正FW轻吟体 简"',
    fontWeight: 700,
    zIndex: 100,
    textShadow: Array(2).fill('0px 0px 5px black').join(','),
    wordBreak: 'break-all',
  });
  const titleStyle = style({
    margin: 0,
    marginTop: '0px',
    marginBottom: '15px',
    fontSize: '60px',
    fontWeight: 900,
    whiteSpace: 'pre-line',
  });
  const descriptionParaStyle = style({
    margin: 0,
    marginTop: '0px',
    marginBottom: '15px',
    fontSize: '45px',
  });
  const staffParaStyle = style({
    margin: 0,
    fontSize: '40px',
  });
  const descriptionElements = description.split('\n').map((line, index) => (
    <p key={index} style={descriptionParaStyle}>
      {line}
    </p>
  ));
  if (staff) {
    descriptionElements.push(<div key={1000} style={{ padding: '15px' }} />);
    descriptionElements.push(
      ...staff.split('\n').map((line, index) => (
        <p key={index + 1001} style={staffParaStyle}>
          {line}
        </p>
      ))
    );
  }
  return (
    <div>
      <AbsoluteFill
        style={{
          backgroundColor: 'black',
        }}
      >
        {background ? <Img src={background} style={imageStyle} /> : null}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={barStyle}>
          <p style={titleStyle}>{title}</p>
          {descriptionElements}
        </div>
      </AbsoluteFill>
    </div>
  );
};
