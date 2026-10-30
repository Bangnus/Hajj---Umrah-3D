import { MINA, buildMina } from '../../../world/mina';
import { QIBLA_WEST } from '../../../world/hajjCommon';
import type { Profile, StageDef } from '../../types';
import { praySequence, skyClock, type Salah } from './common';

const QASR_NOTE = 'ละหมาดในเวลาของแต่ละเวลา ไม่รวม';

export function hajjTarwiyah(_p: Profile): StageDef {
  return {
    id: 'hajjTarwiyah',
    icon: '⛺',
    title: 'วันตัรวิยะฮ์ที่มีนา',
    arabic: 'يوم التروية',
    desc: 'วันที่ 8 ซุลหิจญะฮ์ เดินทางไปพักที่มีนา ละหมาดซุฮ์ริ อัศริ มัฆริบ อิชาอ์ และศุบฮิของวันที่ 9 ที่นี่ โดยละหมาดแต่ละเวลาในเวลาของมัน ไม่รวม ส่วนละหมาด 4 ร็อกอะฮ์ให้ย่อเหลือ 2 ร็อกอะฮ์ (เกาะศัร) ตามแบบอย่างของท่านนบี ﷺ',
    tip: () => 'การพักที่มีนาในวันที่ 8 และคืนก่อนวันอะรอฟะฮ์เป็นซุนนะฮ์ ใช้เวลานี้กล่าวตัลบิยะฮ์ อ่านอัลกุรอาน และพักผ่อนให้พร้อมสำหรับวันอะรอฟะฮ์ เรื่องการย่อละหมาดของผู้ที่พำนักในมักกะฮ์มาหลายวัน นักวิชาการมีความเห็นต่างกัน ให้ถามผู้รู้ในคณะของคุณ',
    outfit: 'ihram',
    build(ctx) {
      ctx.add(buildMina({ quality: ctx.quality }));
      const sky = skyClock(ctx, 0.36);
      ctx.after(1, () => ctx.dua('talbiyah'));
      ctx.after(6, () => ctx.toast('กล่าวตัลบิยะฮ์ต่อไปเรื่อย ๆ ระหว่างเดินทาง', 'info'));
      const prayers: (Salah & { t: number })[] = [
        { name: 'ซุฮ์ริ', rakaat: 2, t: 0.52, note: `ซุฮ์ริ ย่อจาก 4 เหลือ 2 ร็อกอะฮ์ — ${QASR_NOTE}` },
        { name: 'อัศริ', rakaat: 2, t: 0.76, note: 'อัศริ ย่อเหลือ 2 ร็อกอะฮ์ ในเวลาอัศริ' },
        { name: 'มัฆริบ', rakaat: 3, t: 1.04, note: 'มัฆริบ 3 ร็อกอะฮ์ (ไม่ย่อ)' },
        { name: 'อิชาอ์', rakaat: 2, t: 1.32, note: 'อิชาอ์ ย่อเหลือ 2 ร็อกอะฮ์' },
        { name: 'ศุบฮิ', rakaat: 2, t: -0.12, note: 'ศุบฮิของวันที่ 9: 2 ร็อกอะฮ์ (ไม่ย่อ)' },
      ];
      const labelOf = (s: Salah) => `🕌 ละหมาด${s.name} ${s.rakaat} ร็อกอะฮ์`;
      ctx.rings.add(MINA.tent.x, MINA.tent.z, 2.2, () => {
        ctx.progress();
        ctx.toast('ถึงเต็นท์ของคณะแล้ว พักที่นี่จนถึงเช้าวันที่ 9', 'ok');
        sky.to(prayers[0].t, 2.5);
        praySequence(ctx, prayers, {
          qiblaYaw: QIBLA_WEST,
          heading: 'ละหมาดที่มีนา',
          label: labelOf,
          onEach: (i) => {
            ctx.progress();
            const next = prayers[i + 1];
            if (next) {
              if (next.name === 'ศุบฮิ') {
                ctx.toast('พักค้างคืนที่มีนา…', 'info');
                sky.to(1.6, 2, () => sky.to(next.t, 3));
              } else sky.to(next.t, 3);
            }
          },
          onDone: () => {
            sky.to(0.08, 4, () => ctx.toast('ดวงอาทิตย์ขึ้นแล้ว วันที่ 9 ออกเดินทางไปทุ่งอะรอฟะฮ์ พร้อมกล่าวตัลบิยะฮ์', 'ok'));
          },
        });
      }, { label: 'เต็นท์ของคุณ' });
      return {
        mission: { label: 'พักที่มีนา', text: 'เดินไปที่เต็นท์ของคณะ แล้วละหมาด 5 เวลาที่มีนา (ย่อแต่ไม่รวม)', hint: 'เดินตามถนนแล้วเลี้ยวซ้ายเข้าเต็นท์คณะประเทศไทย', total: 6 },
        start: { x: MINA.start.x, z: MINA.start.z, yaw: Math.PI },
        camYaw: 0,
      };
    },
  };
}
