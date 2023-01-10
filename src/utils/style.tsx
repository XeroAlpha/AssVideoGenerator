import { CSSProperties } from 'react';

export function style(...styles: (CSSProperties | undefined)[]): CSSProperties {
  return Object.assign({}, ...styles.filter((e) => e !== undefined));
}
