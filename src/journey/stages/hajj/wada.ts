import { RING } from '../../../engine/rings';
import { SPOTS, buildHaram, polar } from '../../../world/haram';
import { behind, faceToward } from '../util';
import type { Profile, StageDef } from '../../types';
import { afterShave, crowdCount } from './common';
import { tawafLaps } from './tawafLaps';
import { tr } from '../../../i18n';

export function hajjWada(_p: Profile): StageDef {
  return {
    id: 'hajjWada',
    icon: '👋',
    title: tr('เฏาะวาฟวะดาอ์'),
    arabic: 'طواف الوداع',
    desc: tr('เฏาะวาฟอำลาเป็นสิ่งสุดท้ายที่ทำก่อนออกจากมักกะฮ์ เดินรอบกะอ์บะฮ์ 7 รอบ แล้วออกจากมัสยิดเดินทางกลับ ไม่ควรพักอยู่ต่อนานหลังเฏาะวาฟนี้'),
    tip: (p) => (p.gender === 'female'
      ? tr('ผู้หญิงที่มีประจำเดือนหรือเลือดหลังคลอดได้รับการยกเว้นจากเฏาะวาฟวะดาอ์ ให้ขอดุอาอ์ที่ประตูมัสยิดแล้วเดินทางได้เลย ')
      : '')
      + tr('เฏาะวาฟนี้ไม่มีอิฎฏิบาอ์และร็อมัล ถ้าคนไม่แน่น จะยืนขอดุอาอ์ที่มุลตะซัมก็ได้ โดยไม่ต้องเบียด'),
    outfit: 'travel',
    build(ctx) {
      ctx.add(buildHaram({ floorLine: ctx.settings.floorLine, crowd: crowdCount(ctx, 360, 140) }));
      afterShave(ctx);
      ctx.after(0.8, () => ctx.dua('masjid_enter'));
      if (ctx.profile.gender === 'female') ctx.after(5, () => ctx.toast(tr('ผู้หญิงที่มีประจำเดือนได้รับการยกเว้นจากเฏาะวาฟวะดาอ์'), 'info'));
      const exit = polar(57, -0.75);
      tawafLaps(ctx, {
        startLabel: tr('แนวหินดำ — เริ่มเฏาะวาฟวะดาอ์'),
        startToast: tr('เริ่มเฏาะวาฟวะดาอ์รอบที่ 1 — บิสมิลลาฮิ วัลลอฮุอักบัร'),
        onDone: () => {
          ctx.after(1.5, () => ctx.dua('guidance_wada_multazam'));
          ctx.hint(tr('เดินไปที่ประตูมัสยิดเพื่อออกเดินทาง'));
          ctx.rings.add(exit.x, exit.z, 2, () => {
            ctx.progress();
            ctx.dua('masjid_exit');
            ctx.toast(tr('ฮัจญ์ของคุณครบทุกขั้นตอนแล้ว ขออัลลอฮ์ทรงรับ (ฮัจญัน มับรูรอ)'), 'ok');
          }, { label: tr('ประตูมัสยิด — ออกเดินทาง'), color: RING.secondary });
          ctx.guide(exit);
        },
      });
      const yaw = faceToward(SPOTS.entry, { x: 0, z: 0 });
      return {
        mission: { label: tr('เฏาะวาฟวะดาอ์'), text: tr('เฏาะวาฟอำลา 7 รอบ แล้วเดินออกจากมัสยิด'), hint: tr('ไปที่วงแหวนสีเขียวตรงมุมหินดำ'), total: 8 },
        start: { x: SPOTS.entry.x, z: SPOTS.entry.z, yaw },
        camYaw: behind(yaw),
      };
    },
  };
}
