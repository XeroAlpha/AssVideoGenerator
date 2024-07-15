import { ReactElement, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Easing, useCurrentFrame } from 'remotion';

export const Marquee: React.FC<{
  el: React.FC<{ index: number }>;
  single?: boolean;
  width?: string | number;
  speed: number; // pixel per frame
  broke?: number; // paused time in ms
  easing?: (x: number) => number;
}> = ({ el: Element, single, width, speed, broke, easing }) => {
  const brokeOrDefault = broke ?? 0;
  const easingOrDefault = easing ?? Easing.linear;
  const elementCache = useMemo<{ el: ReactElement | null; width: number }[]>(
    () => [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Element]
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [, triggerUpdate] = useState([]);
  const frame = useCurrentFrame();
  let frameLeft = frame;
  let index = 0;
  let translateX = 0;
  const liveItems: { item: { el: ReactElement | null; width: number }; index: number; scrollX: number }[] = [];
  if (single && elementCache[0] && elementCache[0].width <= containerWidth) {
    liveItems.push({ item: elementCache[0], index: 0, scrollX: 0 });
  } else {
    for (;;) {
      const cachedElement = elementCache[index] ?? { width: Infinity };
      const durationInFrames = cachedElement.width / speed;
      frameLeft -= brokeOrDefault;
      if (frameLeft <= 0) {
        translateX = 0;
        break;
      } else if (frameLeft < durationInFrames) {
        const progress = easingOrDefault(1 - frameLeft / durationInFrames);
        translateX = Number.isFinite(cachedElement.width) ? (progress - 1) * cachedElement.width : 0;
        break;
      }
      frameLeft -= durationInFrames;
      index += 1;
    }
    let scrollX = translateX;
    for (;;) {
      const currentElement =
        elementCache[index] ?? (elementCache[index] = { el: <Element index={index} />, width: Infinity });
      liveItems.push({ item: currentElement, index, scrollX });
      index += 1;
      scrollX += currentElement.width;
      if (scrollX >= containerWidth) break;
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const containerDOM = containerRef.current!;
    let dirty = false;
    if (containerDOM.clientWidth > 0 && containerDOM.clientWidth !== containerWidth) {
      dirty = true;
      setContainerWidth(containerDOM.clientWidth);
    }
    for (let i = 0; i < liveItems.length; i++) {
      const child = containerDOM.children[i];
      const currentItem = liveItems[i].item;
      if (child.clientWidth > 0 && child.clientWidth !== currentItem.width) {
        dirty = true;
        currentItem.width = child.clientWidth;
      }
    }
    if (dirty) {
      triggerUpdate([]);
    }
  });
  return (
    <div ref={containerRef} style={{ width: width ?? '100%', display: 'flex', overflow: 'hidden' }}>
      {liveItems.map((e) => (
        <div key={e.index} style={{ flexShrink: '0', transform: `translateX(${translateX.toFixed(5)}px)` }}>
          {e.item.el}
        </div>
      ))}
    </div>
  );
};
