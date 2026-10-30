import { SPOTS, STONE_ANGLE, YAMANI_ANGLE, polar } from '../../../world/haram';
import { TAU, wrap } from '../util';
import type { StageCtx } from '../../types';
import { onFrame } from './common';

/**
 * Reusable tawaf lap tracker (7 counter-clockwise laps from the Black Stone line).
 * Each lap calls ctx.progress(). Same logic as the Umrah tawaf: the angle atan2(-z, x)
 * increases counter-clockwise; a lap counts when the accumulated angle since the
 * Black Stone line passes 2π·k.
 */
export function tawafLaps(ctx: StageCtx, o: { startLabel: string; startToast: string; onDone: () => void }) {
  const p = ctx.player.pos;
  const ang = () => Math.atan2(-p.z, p.x);
  let started = false, acc = 0, prev = 0, laps = 0, back = 0, warnCd = 0, yamaniLap = -1;
  const st = SPOTS.tawafStart;
  ctx.rings.add(st.x, st.z, 1.6, () => {
    started = true;
    prev = ang();
    acc = wrap(prev - STONE_ANGLE);
    ctx.player.raiseHand();
    ctx.toast(o.startToast, 'ok');
    ctx.dua('istilam');
    ctx.after(4, () => ctx.dua('tawaf_lap_1'));
    ctx.hint('เดินทวนเข็มนาฬิกา ให้กะอ์บะฮ์อยู่ทางซ้าย');
  }, { label: o.startLabel });

  onFrame(ctx, (dt) => {
    if (!started || laps >= 7) return;
    warnCd -= dt;
    const a = ang();
    const d = wrap(a - prev);
    prev = a;
    ctx.guide(polar(Math.hypot(p.x, p.z), a + 0.6));
    if (Math.abs(d) > 1) return;
    acc += d;
    if (d / Math.max(dt, 1e-3) < -0.08) back += dt; else back = Math.max(0, back - dt);
    if (back > 1.5 && warnCd <= 0) {
      ctx.toast('คุณกำลังเดินผิดทาง เฏาะวาฟต้องเดินทวนเข็มนาฬิกา ให้กะอ์บะฮ์อยู่ทางซ้ายมือ', 'warn');
      warnCd = 10;
    }
    if (a > YAMANI_ANGLE && a < STONE_ANGLE && acc - TAU * laps > Math.PI && yamaniLap !== laps) {
      yamaniLap = laps;
      ctx.dua('rabbana_atina');
    }
    if (acc >= TAU * (laps + 1)) {
      laps++;
      ctx.progress();
      ctx.player.raiseHand();
      if (laps < 7) {
        ctx.toast(`ครบรอบที่ ${laps} — บิสมิลลาฮิ วัลลอฮุอักบัร`, 'ok');
        ctx.dua('istilam');
        const n = laps + 1;
        ctx.after(3.5, () => ctx.dua(`tawaf_lap_${n}`));
      } else {
        ctx.toast('ครบ 7 รอบแล้ว อัลฮัมดุลิลลาฮ์', 'ok');
        ctx.guide(null);
        o.onDone();
      }
    }
  });
}
