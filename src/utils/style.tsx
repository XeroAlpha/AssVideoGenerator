import {
  Context,
  createContext,
  CSSProperties,
  FC,
  ReactNode,
  useContext,
} from 'react';

export function style(...styles: (CSSProperties | undefined)[]): CSSProperties {
  return Object.assign({}, ...styles.filter((e) => e !== undefined));
}

export type StyleMap<K extends string = string> = Record<
  K,
  CSSProperties | undefined
>;

export const StyledContext: Context<StyleMap> = createContext({});

export const Styled: FC<{
  styles?: StyleMap;
  children: ReactNode;
}> = ({ styles, children }) => {
  const context = useContext(StyledContext);
  return (
    <StyledContext.Provider value={{ ...context, ...styles }}>
      {children}
    </StyledContext.Provider>
  );
};

function splitClassName(className: string): string[] {
  return className.split(/\s+/).filter((e) => e !== '');
}

type UnmergableString = string & NonNullable<unknown>;

export function useStyledClass<K extends string>(styleMap?: StyleMap<K>) {
  const context = useContext(StyledContext);
  const mergedMap = { ...context, ...styleMap };
  return (
    ...classOrStyles: (K | UnmergableString | CSSProperties | undefined)[]
  ) => {
    const classes = classOrStyles.filter(
      (e) => typeof e === 'string'
    ) as string[];
    const styles = classOrStyles.filter(
      (e) => typeof e === 'object'
    ) as CSSProperties[];
    const inheritedStyles: CSSProperties[] = [];
    Object.entries(mergedMap).forEach(([matchClassName, style]) => {
      if (!style) return;
      const matchClasses = splitClassName(matchClassName);
      if (matchClasses.every((e) => classes.includes(e))) {
        inheritedStyles.push(style);
      }
    });
    return {
      className: classes.join(' '),
      style: style(...inheritedStyles, ...styles),
    };
  };
}
