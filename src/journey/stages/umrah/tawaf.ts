import { SPOTS, STONE_ANGLE, YAMANI_ANGLE, buildHaram, polar } from '../../../world/haram';
import { TAU, behind, faceToward, wrap } from '../util';
import type { StageDef } from '../../types';

export const tawaf: StageDef = {
  id: 'tawaf',
  icon: '🕋',
  title: 'เฏาะวาฟ',
  arabic: 'الطواف',
  desc: 'เดินรอบกะอ์บะฮ์ทวนเข็มนาฬิกา 7 รอบ ให้กะอ์บะฮ์อยู่ทางซ้ายมือ เริ่มและจบที่แนวหินดำ ต้องมีน้ำละหมาด (วุฎูอ์) ตลอดเฏาะวาฟ และเดินอ้อมด้านนอกฮิจญ์รอิสมาอีล (กำแพงครึ่งวงกลม) ห้ามตัดเข้าไปข้างใน',
  tip: (p) => (p.gender === 'male'
    ? 'ผู้ชายเปิดไหล่ขวา (อิฎฏิบาอ์) ตลอดเฏาะวาฟ และเดินเร็วก้าวสั้น (ร็อมัล) ใน 3 รอบแรกถ้าทำได้ (ในเกมนี้ตัวละครจะเร่งฝีเท้าให้เอง) '
    : 'ผู้หญิงเดินตามปกติ ไม่ต้องเบียดเข้าใกล้กะอ์บะฮ์หรือหินดำ ')
    + 'ถ้าเสียน้ำละหมาดระหว่างเฏาะวาฟ ให้ไปอาบใหม่แล้วกลับมาเดินต่อจากรอบที่ค้างไว้',
  outfit: 'ihram',
  build(ctx) {
    const haram = buildHaram({ floorLine: ctx.settings.floorLine, crowd: ctx.quality === 'high' ? 360 : 140 });
    ctx.add(haram);
    const p = ctx.player.pos;
    const ang = () => Math.atan2(-p.z, p.x);
    let started = false, acc = 0, prev = 0, laps = 0, back = 0, warnCd = 0, yamaniLap = -1, wudu = false;
    const male = ctx.profile.gender === 'male';
    /** Men: raml (brisk, short steps) in laps 1–3, normal walking from lap 4. */
    const pace = (lap: number) => {
      if (!male) return;
      if (lap <= 3) {
        ctx.player.speedMul = 1.25;
        ctx.hint(`รอบที่ ${lap}: ร็อมัล — เดินเร็ว ก้าวสั้น`);
      } else {
        ctx.player.speedMul = 1;
        ctx.hint(`รอบที่ ${lap}: เดินตามปกติ ไม่ต้องร็อมัลแล้ว`);
      }
    };

    // Tawaf requires wudu; the player confirms it before the start ring will work (not part of the mission count).
    const wuduBtn = ctx.action('✔ ฉันมีน้ำละหมาด (วุฎูอ์) แล้ว', () => {
      wuduBtn.remove();
      wudu = true;
      ctx.toast('ดีมาก เฏาะวาฟต้องมีน้ำละหมาดตลอด ไปที่แนวหินดำเพื่อเริ่มได้เลย', 'ok');
      // Already standing in the start ring: let it fire again on the next frame.
      startRing.inside = false;
    });

    ctx.after(0.8, () => ctx.dua('masjid_enter'));
    ctx.after(6, () => { if (!started) ctx.dua('see_kaabah'); });
    const st = SPOTS.tawafStart;
    const startRing = ctx.rings.add(st.x, st.z, 1.6, () => {
      if (!wudu) {
        ctx.toast('ก่อนเริ่มเฏาะวาฟ ต้องมีน้ำละหมาด (วุฎูอ์) ก่อน ถ้ามีแล้วกดปุ่ม "ฉันมีน้ำละหมาด (วุฎูอ์) แล้ว"', 'warn');
        return false;
      }
      started = true;
      prev = ang();
      acc = wrap(prev - STONE_ANGLE);
      ctx.player.raiseHand();
      ctx.toast('เริ่มรอบที่ 1 — หยุดกล่าวตัลบิยะฮ์ แล้วกล่าว บิสมิลลาฮิ วัลลอฮุอักบัร', 'ok');
      ctx.dua('istilam');
      ctx.after(4, () => ctx.dua('tawaf_lap_1'));
      ctx.hint('เดินทวนเข็มนาฬิกา ให้กะอ์บะฮ์อยู่ทางซ้าย');
      if (male) {
        ctx.player.setLook({ idtiba: true });
        ctx.after(2.5, () => ctx.toast('อิฎฏิบาอ์: ผู้ชายพาดผ้าคลุมไว้ใต้รักแร้ขวา เปิดไหล่ขวาตลอด 7 รอบของเฏาะวาฟนี้', 'info'));
        pace(1);
      }
    }, { label: 'แนวหินดำ — เริ่มเฏาะวาฟ' });

    return {
      mission: { label: 'เฏาะวาฟ 7 รอบ', text: 'ยืนยันว่ามีน้ำละหมาด (วุฎูอ์) แล้วไปที่วงแหวนตรงแนวหินดำเพื่อเริ่ม จากนั้นเดินทวนเข็มนาฬิกา', hint: 'ไปที่วงแหวนสีเขียวตรงมุมหินดำ', total: 7 },
      start: { x: SPOTS.entry.x, z: SPOTS.entry.z, yaw: faceToward(SPOTS.entry, { x: 0, z: 0 }) },
      camYaw: behind(faceToward(SPOTS.entry, { x: 0, z: 0 })),
      tick(dt) {
        if (!started || laps >= 7 || ctx.count() >= 7) return;
        warnCd -= dt;
        const a = ang();
        const d = wrap(a - prev);
        prev = a;
        // Arrow points along the tawaf direction, a little ahead of the player.
        ctx.guide(polar(Math.hypot(p.x, p.z), a + 0.6));
        if (Math.abs(d) > 1) return; // teleport / glitch
        acc += d; // laps only count when the line is actually crossed
        if (d / dt < -0.08) back += dt; else back = Math.max(0, back - dt);
        if (back > 1.5 && warnCd <= 0) {
          ctx.toast('คุณกำลังเดินผิดทาง เฏาะวาฟต้องเดินทวนเข็มนาฬิกา ให้กะอ์บะฮ์อยู่ทางซ้ายมือ', 'warn');
          warnCd = 10;
        }
        // Between the Yamani corner and the Black Stone.
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
            pace(n);
          } else {
            ctx.toast('ครบ 7 รอบแล้ว อัลฮัมดุลิลลาฮ์', 'ok');
            ctx.guide(SPOTS.maqam);
            if (male) {
              ctx.player.speedMul = 1;
              ctx.player.setLook({ idtiba: false });
            }
            if (male) ctx.after(2.5, () => ctx.toast('ผู้ชายคลุมไหล่ขวากลับตามเดิมหลังเฏาะวาฟ', 'info'));
          }
        }
      },
    };
  },
};
