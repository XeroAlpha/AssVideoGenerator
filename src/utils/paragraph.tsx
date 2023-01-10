import { CSSProperties, ReactElement } from 'react';
import { style } from './style';

export function paragraphToDOM(
  text: string,
  paraStyle?: CSSProperties,
  firstParaStyle?: CSSProperties
): ReactElement[] {
  const paragraphs = text.split('\n\n');
  return paragraphs.map((para, index) => {
    return (
      <div style={style(paraStyle, index === 0 ? firstParaStyle : undefined)}>
        {para.split(/(\n)/g).map((e) => (e === '\n' ? <br /> : e))}
      </div>
    );
  });
}
