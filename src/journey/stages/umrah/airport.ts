import { AIRPORT, buildAirport } from '../../../world/simple';
import type { StageDef } from '../../types';

export const airport: StageDef = {
  id: 'airport',
  icon: '✈️',
  title: 'สนามบิน',
  arabic: 'المطار',
  desc: 'เช็กอิน ผ่านตรวจคนเข้าเมืองและจุดตรวจความปลอดภัย แล้วไปที่ประตูขึ้นเครื่อง',
  tip: () => 'เก็บหนังสือเดินทางและบัตรขึ้นเครื่องไว้ในที่หยิบง่าย ผู้ชายหลายคนครองผ้าอิห์รอมตั้งแต่สนามบิน แต่ยังไม่เนียตจนกว่าจะถึงมีกอต',
  outfit: 'travel',
  build(ctx) {
    ctx.add(buildAirport());
    const next = (i: number) => {
      const s = AIRPORT.steps[i];
      ctx.rings.add(s.x, s.z, 1.5, () => {
        ctx.progress();
        if (i < AIRPORT.steps.length - 1) { ctx.toast(`ผ่าน${s.label}แล้ว`, 'ok'); next(i + 1); }
        else { ctx.toast('ขึ้นเครื่องแล้ว ขอให้เดินทางปลอดภัย', 'ok'); ctx.dua('safar'); }
      }, { label: s.label });
    };
    next(0);
    return {
      mission: { label: 'ขึ้นเครื่อง', text: 'ทำตามลำดับ: เช็กอิน → ตรวจคนเข้าเมือง → ตรวจความปลอดภัย → ประตูขึ้นเครื่อง', hint: 'ตามลูกศรไปยังวงแหวนถัดไป', total: 4 },
      start: { x: AIRPORT.start.x, z: AIRPORT.start.z, yaw: Math.PI },
      camYaw: 0,
    };
  },
};
