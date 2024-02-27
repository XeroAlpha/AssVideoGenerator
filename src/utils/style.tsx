import { Context, createContext, CSSProperties, FC, ReactNode, useContext } from 'react';

export function style(...styles: (CSSProperties | undefined)[]): CSSProperties {
  return Object.assign({}, ...styles.filter((e) => e !== undefined));
}

export type StyleMap<K extends string = string> = Record<K, CSSProperties | undefined>;

export type PartialStyleMap<K extends string = string> = Partial<StyleMap<K>>;

/** We assume iteration of an object happens in insertion order. */
export function mergeStyleMap<K extends string>(...styleMaps: (PartialStyleMap<K> | undefined)[]) {
  const merged = {} as StyleMap<K>;
  for (const styleMap of styleMaps) {
    if (!styleMap) continue;
    Object.entries(styleMap).forEach(([className, classStyle]) => {
      if (!classStyle) return;
      if (className in merged) {
        merged[className as K] = style(merged[className as K], classStyle);
      } else {
        merged[className as K] = classStyle;
      }
    });
  }
  return merged;
}

export const StyledContext: Context<[StyleMap, StyleMap]> = createContext([{}, {}]);

export const Styled: FC<{
  styles?: StyleMap;
  importantStyles?: StyleMap;
  children?: ReactNode;
}> = ({ styles, importantStyles, children }) => {
  const [contextPre, contextPost] = useContext(StyledContext);
  const mergedPre = mergeStyleMap(contextPre, styles);
  const mergedPost = mergeStyleMap(contextPost, importantStyles);
  return <StyledContext.Provider value={[mergedPre, mergedPost]}>{children}</StyledContext.Provider>;
};

function splitClassName(className: string): string[] {
  return className.split(/\s+/).filter((e) => e !== '');
}

type UnmergableString = string & NonNullable<unknown>;

export function useStyledClass<K extends string>(...styleMaps: (PartialStyleMap<K> | undefined)[]) {
  const [contextPre, contextPost] = useContext(StyledContext);
  const mergedMap = Object.entries(mergeStyleMap(contextPre, ...styleMaps, contextPost))
    .filter(([, style]) => style !== undefined && style !== null)
    .map(([classNames, style]) => [new Set(splitClassName(classNames)), style]) as [Set<string>, CSSProperties][];
  return (...classOrStyles: (K | UnmergableString | CSSProperties | undefined)[]) => {
    const classes = new Set<string>();
    const styles: CSSProperties[] = [];
    for (const classOrStyle of classOrStyles) {
      if (typeof classOrStyle === 'object') {
        styles.push(classOrStyle);
      } else if (typeof classOrStyle === 'string') {
        const founds = mergedMap.filter(([classNames]) => classNames.has(classOrStyle));
        for (const [foundClassNames, foundStyle] of founds) {
          if (foundClassNames.size <= 1 || [...foundClassNames].every((e) => e === classOrStyle || classes.has(e))) {
            styles.push(foundStyle);
          }
        }
        classes.add(classOrStyle);
      }
    }
    return {
      className: [...classes].join(' '),
      style: style(...styles),
    };
  };
}

export type Styler<K extends string = string> = ReturnType<typeof useStyledClass<K>>;
