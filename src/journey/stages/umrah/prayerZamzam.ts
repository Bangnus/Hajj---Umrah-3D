import { RING } from '../../../engine/rings';
import { SPOTS, buildHaram, polar } from '../../../world/haram';
import { PRAYER_BEATS } from '../../prayer';
import { behind, faceToward } from '../util';
import type { StageDef } from '../../types';

export const prayerZamzam: StageDef = {
  id: 'prayerZamzam',
  icon: '🤲',
  title: 'ละหมาดและดื่มซัมซัม',
  arabic: 'الصلاة وزمزم',
  desc: 'ละหมาดซุนนะฮ์ 2 ร็อกอะฮ์หลังมะกอมอิบรอฮีม แล้วไปดื่มน้ำซัมซัม',
  tip: () => 'ร็อกอะฮ์แรกอ่านซูเราะฮ์อัลกาฟิรูน ร็อกอะฮ์ที่สองอ่านอัลอิคลาศ ถ้าคนแน่น ละหมาดที่ใดก็ได้ในมัสยิด หลังดื่มซัมซัม ซุนนะฮ์ให้กลับไปอิสติลามที่หินดำอีกครั้งก่อนไปสะแอ (ถ้าทำได้)',
  outfit: 'ihram',
  build(ctx) {
    ctx.add(buildHaram({ floorLine: ctx.settings.floorLine, crowd: ctx.quality === 'high' ? 360 : 140 }));
    const start = polar(11, 0.05);
    ctx.rings.add(SPOTS.prayer.x, SPOTS.prayer.z, 1.3, () => {
      ctx.dua('maqam_ibrahim');
      const pl = ctx.player;
      pl.yaw = faceToward(pl.pos, { x: 0, z: 0 });
      pl.frozen = true;
      ctx.hud.prayer(PRAYER_BEATS, (beat) => pl.setPose(beat.pose), () => {
        pl.setPose('stand');
        pl.frozen = false;
        ctx.progress();
        ctx.toast('ละหมาดเสร็จแล้ว ไปดื่มน้ำซัมซัม', 'ok');
        const z = SPOTS.zamzam;
        ctx.rings.add(z.x, z.z, 1.4, () => {
          ctx.dua('zamzam_hadith');
          pl.frozen = true;
          ctx.hud.zamzam(() => {
            pl.frozen = false;
            ctx.progress();
            ctx.dua('zamzam_dua');
            // Optional sunnah: return to the Black Stone line for istilam before sa'i (not part of the mission).
            const st = SPOTS.tawafStart;
            ctx.after(3, () => ctx.toast('ถ้าสะดวก ซุนนะฮ์ให้กลับไปอิสติลามที่แนวหินดำอีกครั้งก่อนไปสะแอ (ไม่บังคับ)', 'info'));
            ctx.rings.add(st.x, st.z, 1.6, () => {
              pl.yaw = faceToward(pl.pos, { x: 0, z: 0 });
              pl.raiseHand();
              ctx.dua('istilam');
              ctx.toast('อิสติลามแล้ว ตอนนี้ไปสะแอที่เนินเศาะฟาได้เลย', 'ok');
            }, { label: 'อิสติลามก่อนไปสะแอ (ซุนนะฮ์)', color: RING.secondary });
          });
        }, { label: 'ดื่มน้ำซัมซัม', color: RING.water });
      });
    }, { label: 'ละหมาด 2 ร็อกอะฮ์' });
    return {
      mission: { label: 'ละหมาดและดื่มซัมซัม', text: 'ไปละหมาด 2 ร็อกอะฮ์หลังมะกอมอิบรอฮีม แล้วไปดื่มน้ำซัมซัม', hint: 'เดินไปที่วงแหวนหลังมะกอมอิบรอฮีม', total: 2 },
      start: { x: start.x, z: start.z, yaw: faceToward(start, SPOTS.prayer) },
      camYaw: behind(faceToward(start, SPOTS.prayer)),
    };
  },
};
