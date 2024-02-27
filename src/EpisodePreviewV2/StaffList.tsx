import { useLayoutEffect, useRef } from 'react';
import { Easing, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { clampOne } from '../utils/interpolate';
import { style, StyleMap, useStyledClass } from '../utils/style';

const Styles = {
  staffBar: style({
    padding: '0px 20px 0px 85px',
    marginTop: '-60px',
    overflow: 'hidden',
  }),
  staffInside: style({
    fontSize: '35px',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: '30px 0px',
    marginLeft: '-25px',
  }),
  staffItem: style({
    padding: '10px 40px 10px 10px',
    verticalAlign: 'middle',
    lineBreak: 'normal',
  }),
  staffLabel: style({
    borderRadius: '1000px',
    padding: '0px 25px 5px 25px',
    margin: '0px 15px 0px -25px',
    backgroundColor: 'black',
    filter: 'drop-shadow(0 0 5px white)',
    fontWeight: 500,
    color: 'white',
    display: 'inline-block',
  }),
};

function splitStaff(staff: string) {
  return staff
    .split('\n')
    .filter((e) => e !== '')
    .map((ln) => ln.split('：', 2).map((e) => e.trim()) as [string, string]);
}

export const StaffList: React.FC<{
  staff: string;
  startFrom?: number;
  durationInFrames: number;
}> = ({ staff, startFrom, durationInFrames }) => {
  const frame = useCurrentFrame() - (startFrom ?? 0);
  const { fps } = useVideoConfig();
  const staffItems = splitStaff(staff);
  const staffItemAnimateStyles: StyleMap<`staffItemSpec${number}`> = {};
  for (let i = 0; i < staffItems.length; i++) {
    const startFrame = i * 0.1 * fps;
    const progress = spring({
      frame,
      fps,
      delay: startFrame,
      config: { mass: 0.5, stiffness: 50 },
    });
    staffItemAnimateStyles[`staffItemSpec${i}`] = {
      transform: `translateX(${(1 - progress) * 100}%)`,
      opacity: `${progress * 100}%`,
    };
  }
  const styled = useStyledClass(Styles, staffItemAnimateStyles);
  const staffDOMRef = useRef<HTMLDivElement | null>(null);
  const easeOutCubic = Easing.out(Easing.cubic);
  useLayoutEffect(() => {
    const progress = 1 - easeOutCubic(clampOne(frame / durationInFrames));
    const staffDOM = staffDOMRef.current;
    if (staffDOM) {
      staffDOM.scrollTop = Math.max(0, staffDOM.scrollHeight - staffDOM.clientHeight) * progress;
    }
  });
  return (
    <div ref={staffDOMRef} {...styled('text', 'staffBar')}>
      <div {...styled('staffInside')}>
        {staffItems.map((item, i) => (
          <div key={i} {...styled('staffItem', `staffItemSpec${i}`)}>
            <span {...styled('staffLabel')}>{item[0]}</span>
            {item[1]}
          </div>
        ))}
      </div>
    </div>
  );
};
