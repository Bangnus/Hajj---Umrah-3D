import { CABIN, buildCabin } from '../../../world/simple';
import { IHRAM_PRAYER_BEATS } from '../../prayer';
import type { StageDef } from '../../types';
import { tr } from '../../../i18n';

export const miqatPlane: StageDef = {
  id: 'miqat',
  icon: '🛫',
  title: tr('มีกอต'),
  arabic: 'الميقات',
  desc: tr('เครื่องบินจะผ่านเขตมีกอตก่อนถึงเจดดาห์ ห้ามผ่านมีกอตโดยยังไม่ได้เนียตเข้าสู่อิห์รอม (ถ้าผ่านไปแล้วต้องเสียดัม) ควรเนียตก่อนถึงเขตเล็กน้อยเพื่อความแน่ใจ'),
  tip: () => tr('เมื่อเนียตแล้ว ข้อห้ามของอิห์รอมเริ่มมีผล เช่น ห้ามใช้น้ำหอม ห้ามตัดผมหรือเล็บ ผู้ชายห้ามคลุมศีรษะ ผู้หญิงห้ามปิดหน้าและสวมถุงมือ ทั้งชายและหญิงห้ามมีเพศสัมพันธ์และห้ามล่าสัตว์'),
  outfit: 'travel',
  build(ctx) {
    ctx.add(buildCabin());
    ctx.after(1.5, () => ctx.toast(tr('กัปตันประกาศ: อีกประมาณ 30 นาทีเครื่องจะผ่านเขตมีกอต กรุณาครองอิห์รอม'), 'info'));
    ctx.rings.add(CABIN.changing.x, CABIN.changing.z, 1.0, () => {
      ctx.player.setLook({ outfit: 'ihram' });
      ctx.progress();
      ctx.toast(ctx.profile.gender === 'male'
        ? tr('ครองผ้าอิห์รอมแล้ว')
        : tr('พร้อมแล้ว ผู้หญิงสวมชุดปกติที่ปกปิดมิดชิด ไม่ปิดหน้าและไม่สวมถุงมือ'), 'ok');
      ctx.dua('guidance_ihram_wear');
      ctx.hint(tr('ถ้าสะดวก ละหมาดซุนนะฮ์อิห์รอม 2 ร็อกอะฮ์ก่อน (ไม่บังคับ) แล้วกดปุ่ม "กล่าวเนียตอุมเราะฮ์" เมื่อพร้อม'));
      // Optional sunnah prayer before the niyyah; does not count toward the mission.
      const pray = ctx.action(tr('ละหมาดซุนนะฮ์อิห์รอม 2 ร็อกอะฮ์ (ไม่บังคับ)'), () => {
        pray.remove();
        const pl = ctx.player;
        pl.frozen = true;
        ctx.hud.prayer(IHRAM_PRAYER_BEATS, (beat) => pl.setPose(beat.pose), () => {
          pl.setPose('stand');
          pl.frozen = false;
          ctx.toast(tr('ละหมาดซุนนะฮ์อิห์รอมเสร็จแล้ว ต่อไปกล่าวเนียตอุมเราะฮ์ได้เลย'), 'ok');
        });
      });
      ctx.after(2, () => ctx.toast(tr('ซุนนะฮ์ให้ละหมาด 2 ร็อกอะฮ์ก่อนเนียตอิห์รอม ถ้าที่บนเครื่องไม่สะดวก จะข้ามไปเนียตเลยก็ได้'), 'info'));
      const btn = ctx.action(tr('กล่าวเนียตอุมเราะฮ์'), () => {
        btn.remove();
        pray.remove();
        ctx.progress();
        ctx.dua('niyyah_umrah');
        ctx.toast(tr('เนียตแล้ว ข้อห้ามของอิห์รอมเริ่มมีผล'), 'ok');
        ctx.after(5, () => ctx.dua('talbiyah'));
      });
    }, { label: tr('ห้องเปลี่ยนชุด') });
    return {
      mission: { label: tr('ครองอิห์รอมและเนียต'), text: tr('เดินไปห้องเปลี่ยนชุดท้ายเครื่อง เตรียมตัวเข้าสู่อิห์รอม แล้วกล่าวเนียต'), hint: tr('เดินตามทางเดินไปท้ายเครื่อง'), total: 2 },
      start: { x: CABIN.start.x, z: CABIN.start.z, yaw: Math.PI },
      camYaw: 0,
      camDist: 3.4,
    };
  },
};
