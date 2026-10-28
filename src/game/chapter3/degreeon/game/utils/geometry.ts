export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  hitWidth?: number;
  hitHeight?: number;
}

export function intersects(r1: Box, r2: Box) {
  const w1 = r1.hitWidth || r1.width;
  const h1 = r1.hitHeight || r1.height;
  const ox1 = r1.hitWidth ? (r1.width - r1.hitWidth) / 2 : 0;
  const oy1 = r1.hitHeight ? (r1.height - r1.hitHeight) / 2 : 0;
  const rx1 = r1.x + ox1;
  const ry1 = r1.y + oy1;

  const w2 = r2.hitWidth || r2.width;
  const h2 = r2.hitHeight || r2.height;
  const ox2 = r2.hitWidth ? (r2.width - r2.hitWidth) / 2 : 0;
  const oy2 = r2.hitHeight ? (r2.height - r2.hitHeight) / 2 : 0;
  const rx2 = r2.x + ox2;
  const ry2 = r2.y + oy2;

  return !(
    rx2 > rx1 + w1 ||
    rx2 + w2 < rx1 ||
    ry2 > ry1 + h1 ||
    ry2 + h2 < ry1
  );
}
