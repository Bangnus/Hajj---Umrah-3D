import { RING } from '../../../engine/rings';
import { MASA, buildMasa } from '../../../world/masa';
import type { StageDef } from '../../types';
import { tr } from '../../../i18n';

export const sai: StageDef = {
  id: 'sai',
  icon: '⛰️',
  title: tr('สะแอ'),
  arabic: 'السعي',
  desc: tr('เดินระหว่างเนินเศาะฟาและมัรวะฮ์ 7 เที่ยว เริ่มที่เศาะฟา จบที่มัรวะฮ์ (เศาะฟาไปมัรวะฮ์นับเป็น 1 เที่ยว)'),
  tip: () => tr('ระหว่างไฟเขียวสองจุด ผู้ชายวิ่งเหยาะ ๆ ผู้หญิงเดินตามปกติ ระยะจริงระหว่างเศาะฟาและมัรวะฮ์ประมาณ 400 เมตร ในเกมนี้ย่อให้สั้นลง'),
  outfit: 'ihram',
  build(ctx) {
    ctx.add(buildMasa(ctx.quality === 'high' ? 160 : 70));
    let started = false, last: 'safa' | 'marwah' | null = null, legs = 0, inGreen = false, greenShown = false;
    const male = ctx.profile.gender === 'male';
    const reach = (hill: 'safa' | 'marwah') => {
      if (legs >= 7) return false;
      if (!started) {
        if (hill === 'marwah') { ctx.toast(tr('สะแอต้องเริ่มที่เนินเศาะฟา'), 'warn'); return false; }
        started = true; last = 'safa';
        ctx.dua('safa_approach');
        ctx.after(5, () => ctx.dua('safa_marwah_dhikr'));
        ctx.hint(tr('เดินไปยังเนินมัรวะฮ์'));
        ctx.guide({ x: 0, z: MASA.marwahZ });
        return false;
      }
      if (hill === last) return false;
      legs++; last = hill;
      ctx.progress();
      if (legs < 7) {
        ctx.toast(tr('ครบเที่ยวที่ {n} — ถึง{hill}', { n: legs, hill: hill === 'safa' ? tr('เศาะฟา') : tr('มัรวะฮ์') }), 'ok');
        ctx.dua('safa_marwah_dhikr');
        ctx.guide({ x: 0, z: hill === 'safa' ? MASA.marwahZ : MASA.safaZ });
      } else {
        ctx.toast(tr('ครบ 7 เที่ยวแล้ว อัลฮัมดุลิลลาฮ์'), 'ok');
        ctx.guide(null);
        ctx.after(3, () => ctx.toast(tr('ข้อควรรู้: สะแอไม่บังคับต้องมีน้ำละหมาด แต่ถ้ามีจะดีกว่า ขั้นต่อไปคือตะฮัลลุล ({action})', { action: male ? tr('โกนหรือตัดผม') : tr('ตัดปลายผม') }), 'info'));
      }
      return false;
    };
    ctx.rings.add(0, MASA.safaZ, 4, () => reach('safa'), { label: tr('เศาะฟา'), persistent: true });
    ctx.rings.add(0, MASA.marwahZ, 4, () => reach('marwah'), { label: tr('มัรวะฮ์'), persistent: true, color: RING.secondary });
    ctx.guide({ x: 0, z: MASA.safaZ });
    return {
      mission: { label: tr('สะแอ 7 เที่ยว'), text: tr('เริ่มที่วงแหวนเศาะฟา แล้วเดินไป-กลับระหว่างเศาะฟาและมัรวะฮ์ให้ครบ 7 เที่ยว'), hint: tr('ไปที่วงแหวนเศาะฟาก่อน'), total: 7 },
      start: { x: 5, z: 12, yaw: Math.PI },
      camYaw: 0,
      tick() {
        const z = ctx.player.pos.z;
        const now = z < MASA.green.from && z > MASA.green.to;
        if (now === inGreen) return;
        inGreen = now;
        if (now) {
          if (male) ctx.player.speedMul = 1.5;
          if (!greenShown) {
            greenShown = true;
            ctx.dua('sai_green_lights');
            if (male) ctx.toast(tr('ช่วงไฟเขียว: ผู้ชายวิ่งเหยาะ ๆ'), 'info');
          }
        } else {
          ctx.player.speedMul = 1;
        }
      },
    };
  },
};
