import { CSSProperties } from 'react';
import { AbsoluteFill, Img } from 'remotion';

export const DescriptionViewer: React.FC<{
  title: string;
  description: string;
  background?: string;
  staff?: string;
}> = ({ title, description, background, staff }) => {
  const imageStyle: CSSProperties = {
    objectFit: 'contain',
    filter: 'blur(30px)',
  };
  const barStyle: CSSProperties = {
    width: '60%',
    height: 'auto',
    color: 'white',
    fontFamily: '思源宋体',
    fontWeight: 700,
    zIndex: 100,
    textShadow:
      '1px 0px 3px black, -1px 0px 3px black, 0px 1px 3px black, 0px -1px 3px black',
    wordBreak: 'break-all',
  };
  const titleStyle: CSSProperties = {
    margin: 0,
    marginTop: '0px',
    marginBottom: '15px',
    fontSize: '50px',
    fontWeight: 900,
    whiteSpace: 'pre-line',
  };
  const descriptionParaStyle: CSSProperties = {
    margin: 0,
    marginTop: '0px',
    marginBottom: '15px',
    fontSize: '45px',
  };
  const staffParaStyle: CSSProperties = {
    margin: 0,
    fontSize: '40px',
    fontWeight: 500,
  };
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
