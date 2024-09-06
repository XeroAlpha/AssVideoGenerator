export interface Resolution {
  width: number;
  height: number;
  scale: number;
}

export const Scaler: React.FC<Resolution & {
  children: React.ReactNode
}> = ({ width, height, scale, children }) => (
  <div style={{
    width: width / scale,
    height: height / scale,
    transform: `scale(${scale})`,
    transformOrigin: `left top`
  }}>{children}</div>
);