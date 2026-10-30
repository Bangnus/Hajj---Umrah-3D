import { PLAZA, buildPlaza } from '../../../world/simple';
import type { StageDef } from '../../types';
import { tr } from '../../../i18n';

export const tahalul: StageDef = {
  id: 'tahalul',
  icon: '✂️',
  title: tr('ตะฮัลลุล'),
  arabic: 'التحلل',
  desc: tr('โกนหรือตัดผมเพื่อออกจากอิห์รอม เป็นขั้นสุดท้ายของอุมเราะฮ์'),
  tip: (p) => p.gender === 'male'
    ? tr('ผู้ชายโกนศีรษะดีกว่าตัดสั้น ท่านนบี ﷺ ขอดุอาอ์ให้ผู้ที่โกนถึง 3 ครั้ง (มัซฮับชาฟิอีย์ อย่างน้อยตัด 3 เส้น แต่โกนทั้งศีรษะดีที่สุด)')
    : tr('ผู้หญิงตัดปลายผมประมาณหนึ่งข้อนิ้ว ทำในที่มิดชิด ให้มะห์รอมหรือผู้หญิงด้วยกันตัดให้'),
  outfit: 'ihram',
  build(ctx) {
    ctx.add(buildPlaza());
    const male = ctx.profile.gender === 'male';
    ctx.rings.add(PLAZA.barber.x, PLAZA.barber.z, 1.5, () => {
      ctx.dua('tahallul_hadith');
      let cuts = 0;
      const label = () => tr('{action} (อีก {n} ครั้ง)', { action: male ? tr('✂️ โกนศีรษะ') : tr('✂️ ตัดปลายผม'), n: 3 - cuts });
      const btn = ctx.action(label(), () => {
        cuts++;
        ctx.progress();
        if (cuts < 3) { btn.setLabel(label()); return; }
        btn.remove();
        ctx.player.setLook({ hair: male ? 'shaved' : 'trimmed' });
        ctx.after(1.5, () => {
          ctx.player.setLook({ outfit: 'travel' });
          ctx.toast(tr('ออกจากอิห์รอมแล้ว ข้อห้ามทั้งหมดสิ้นสุด อุมเราะฮ์ของคุณสมบูรณ์'), 'ok');
        });
      });
    }, { label: tr('ร้านตัดผม') });
    return {
      mission: { label: tr('ตะฮัลลุล'), text: male ? tr('เดินไปร้านตัดผม แล้วโกนศีรษะ') : tr('เดินไปที่จุดตัดผม แล้วตัดปลายผม'), hint: tr('เดินไปที่วงแหวนหน้าร้านตัดผม'), total: 3 },
      start: { x: PLAZA.start.x, z: PLAZA.start.z, yaw: Math.PI },
      camYaw: 0,
    };
  },
};
