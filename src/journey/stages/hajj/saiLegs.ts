import { RING } from '../../../engine/rings';
import { MASA } from '../../../world/masa';
import type { StageCtx } from '../../types';
import { onFrame } from './common';
import { tr } from '../../../i18n';

/**
 * Reusable sa'i tracker: start at Safa, 7 legs between Safa (z=0) and Marwah (z=-100),
 * ending at Marwah. Each leg calls ctx.progress(). Men jog between the green lights.
 */
export function saiLegs(ctx: StageCtx, o: { onDone: () => void }) {
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
      o.onDone();
    }
    return false;
  };
  ctx.rings.add(0, MASA.safaZ, 4, () => reach('safa'), { label: tr('เศาะฟา'), persistent: true });
  ctx.rings.add(0, MASA.marwahZ, 4, () => reach('marwah'), { label: tr('มัรวะฮ์'), persistent: true, color: RING.secondary });
  ctx.guide({ x: 0, z: MASA.safaZ });

  onFrame(ctx, () => {
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
  });
}
