import { SPOTS, buildHaram } from '../../../world/haram';
import { behind, faceToward } from '../util';
import type { Profile, StageDef } from '../../types';
import { afterShave, crowdCount } from './common';
import { tawafLaps } from './tawafLaps';

export function hajjIfadhah(_p: Profile): StageDef {
  return {
    id: 'hajjIfadhah',
    icon: '🕋',
    title: 'เฏาะวาฟอิฟาเฎาะฮ์',
    arabic: 'طواف الإفاضة',
    desc: 'เฏาะวาฟอิฟาเฎาะฮ์เป็นรุก่นของฮัจญ์ ขาดไม่ได้ เดินรอบกะอ์บะฮ์ทวนเข็มนาฬิกา 7 รอบ เริ่มและจบที่แนวหินดำ ทำได้ตั้งแต่หลังเที่ยงคืนของคืนวันที่ 10 ดีที่สุดคือวันที่ 10 และทำหลังจากนั้นก็ได้',
    tip: (p) => 'หลังตะฮัลลุลขั้นแรก คุณสวมเสื้อผ้าปกติได้แล้ว ต้องมีน้ำละหมาดตลอดเฏาะวาฟ'
      + (p.gender === 'female' ? ' ผู้หญิงที่มีประจำเดือนต้องรอจนสะอาดก่อนจึงเฏาะวาฟอิฟาเฎาะฮ์ได้ ปรึกษาผู้รู้ในคณะถ้าใกล้วันเดินทางกลับ' : ''),
    outfit: 'travel',
    build(ctx) {
      ctx.add(buildHaram({ floorLine: ctx.settings.floorLine, crowd: crowdCount(ctx, 360, 140) }));
      afterShave(ctx);
      ctx.after(0.8, () => ctx.dua('masjid_enter'));
      tawafLaps(ctx, {
        startLabel: 'แนวหินดำ — เริ่มเฏาะวาฟอิฟาเฎาะฮ์',
        startToast: 'เริ่มเฏาะวาฟอิฟาเฎาะฮ์รอบที่ 1 — บิสมิลลาฮิ วัลลอฮุอักบัร',
        onDone: () => ctx.after(2, () => ctx.toast('ถ้าทำได้ ละหมาดซุนนะฮ์ 2 ร็อกอะฮ์หลังเฏาะวาฟ แล้วไปสะแอต่อ', 'info')),
      });
      const yaw = faceToward(SPOTS.entry, { x: 0, z: 0 });
      return {
        mission: { label: 'เฏาะวาฟอิฟาเฎาะฮ์ 7 รอบ', text: 'ไปที่วงแหวนตรงแนวหินดำเพื่อเริ่ม แล้วเดินทวนเข็มนาฬิกา 7 รอบ', hint: 'ไปที่วงแหวนสีเขียวตรงมุมหินดำ', total: 7 },
        start: { x: SPOTS.entry.x, z: SPOTS.entry.z, yaw },
        camYaw: behind(yaw),
      };
    },
  };
}
