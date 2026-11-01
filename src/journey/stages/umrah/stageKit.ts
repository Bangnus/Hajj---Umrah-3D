import { PRAYER_BEATS, type Beat } from '../../prayer';
import type { StageCtx } from '../../types';
import type { Zone, Shape } from '../../../world/props';
import { tr } from '../../../i18n';

/** Small helpers shared by the Madinah, Bir Ali and return-home stages. */

/**
 * Two-rakaat sunnah prayer beats with a custom intention (e.g. "ละหมาดตะฮียะตุลมัสยิด").
 * `anySurah`: after al-Fatihah any surah may be recited (instead of al-Kafirun / al-Ikhlas).
 */
export function twoRakaat(intent: string, anySurah: boolean): Beat[] {
  return PRAYER_BEATS.map((b, i): Beat => {
    if (i === 0) {
      return { ...b, text: tr('หันหน้าไปทางกิบลัต ยกมือขึ้นระดับหูหรือไหล่ กล่าว "อัลลอฮุอักบัร" พร้อมตั้งเจตนาในใจว่าจะ{intent} 2 ร็อกอะฮ์', { intent }) };
    }
    if (!anySurah) return b;
    if (i === 1) return { ...b, text: tr('วางมือขวาทับมือซ้ายที่อก อ่านซูเราะฮ์อัลฟาติหะฮ์ ตามด้วยซูเราะฮ์หรืออายะฮ์ใดก็ได้ที่คุณอ่านได้') };
    if (i === 7) return { ...b, text: tr('กล่าว "อัลลอฮุอักบัร" แล้วลุกขึ้นยืน อ่านซูเราะฮ์อัลฟาติหะฮ์ ตามด้วยซูเราะฮ์หรืออายะฮ์ใดก็ได้') };
    return b;
  });
}

/** Freeze the player facing `yaw`, run the prayer overlay, then release. */
export function pray(ctx: StageCtx, beats: Beat[], yaw: number, done: () => void) {
  const pl = ctx.player;
  ctx.input.reset();
  pl.yaw = yaw;
  pl.frozen = true;
  ctx.hud.prayer(beats, (b) => pl.setPose(b.pose), () => {
    ctx.input.reset();
    pl.setPose('stand');
    pl.frozen = false;
    done();
  });
}

/** Put the player at a spot (optionally switching the keep-inside zone), camera behind. */
export function place(ctx: StageCtx, p: { x: number; z: number }, yaw: number, zone?: Zone, shape?: Shape | null) {
  if (zone && shape) zone.set(shape);
  ctx.input.reset();
  ctx.player.pos.set(p.x, 0, p.z);
  ctx.player.yaw = yaw;
  ctx.input.yaw = yaw + Math.PI;
}

/**
 * Fade to a dark screen with a caption, run `fn` (usually a teleport) while it is dark,
 * then fade back. The overlay always removes itself, even if the stage changes meanwhile.
 */
export function travel(ctx: StageCtx, caption: string, fn: () => void, hold = 1.6) {
  ctx.input.reset();
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:4;pointer-events:none;display:flex;align-items:center;justify-content:center;'
    + 'padding:24px;text-align:center;background:#0d2622;color:#f2d06b;font:600 22px "Noto Sans Thai",sans-serif;opacity:0;transition:opacity .45s';
  el.textContent = caption;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  ctx.player.frozen = true;
  ctx.after(0.55, () => { fn(); });
  ctx.after(hold, () => {
    ctx.input.reset();
    ctx.player.frozen = false;
  });
  window.setTimeout(() => { el.style.opacity = '0'; }, hold * 1000);
  window.setTimeout(() => el.remove(), hold * 1000 + 600);
}
