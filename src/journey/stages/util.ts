/** Small math helpers shared by stage definitions. */
export const TAU = Math.PI * 2;
export const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
export const faceToward = (from: { x: number; z: number }, to: { x: number; z: number }) => Math.atan2(to.x - from.x, to.z - from.z);
/** Camera yaw that puts the camera behind a player facing `yaw`. */
export const behind = (yaw: number) => yaw + Math.PI;
