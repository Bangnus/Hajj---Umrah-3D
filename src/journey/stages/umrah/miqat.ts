import { CABIN, buildCabin } from '../../../world/simple';
import type { StageDef } from '../../types';

export const miqatPlane: StageDef = {
  id: 'miqat',
  icon: '🛫',
  title: 'มีกอต',
  arabic: 'الميقات',
  desc: 'เครื่องบินจะผ่านเขตมีกอตก่อนถึงเจดดาห์ ห้ามผ่านมีกอตโดยยังไม่ได้เนียตเข้าสู่อิห์รอม (ถ้าผ่านไปแล้วต้องเสียดัม) ควรเนียตก่อนถึงเขตเล็กน้อยเพื่อความแน่ใจ',
  tip: () => 'เมื่อเนียตแล้ว ข้อห้ามของอิห์รอมเริ่มมีผล เช่น ห้ามใช้น้ำหอม ห้ามตัดผมหรือเล็บ ผู้ชายห้ามคลุมศีรษะ ผู้หญิงห้ามปิดหน้าและสวมถุงมือ ทั้งชายและหญิงห้ามมีเพศสัมพันธ์และห้ามล่าสัตว์',
  outfit: 'travel',
  build(ctx) {
    ctx.add(buildCabin());
    ctx.after(1.5, () => ctx.toast('กัปตันประกาศ: อีกประมาณ 30 นาทีเครื่องจะผ่านเขตมีกอต กรุณาครองอิห์รอม', 'info'));
    ctx.rings.add(CABIN.changing.x, CABIN.changing.z, 1.0, () => {
      ctx.player.setLook({ outfit: 'ihram' });
      ctx.progress();
      ctx.toast(ctx.profile.gender === 'male'
        ? 'ครองผ้าอิห์รอมแล้ว'
        : 'พร้อมแล้ว ผู้หญิงสวมชุดปกติที่ปกปิดมิดชิด ไม่ปิดหน้าและไม่สวมถุงมือ', 'ok');
      ctx.dua('guidance_ihram_wear');
      ctx.hint('กดปุ่ม "กล่าวเนียตอุมเราะฮ์" เมื่อพร้อม');
      const btn = ctx.action('กล่าวเนียตอุมเราะฮ์', () => {
        btn.remove();
        ctx.progress();
        ctx.dua('niyyah_umrah');
        ctx.toast('เนียตแล้ว ข้อห้ามของอิห์รอมเริ่มมีผล', 'ok');
        ctx.after(5, () => ctx.dua('talbiyah'));
      });
    }, { label: 'ห้องเปลี่ยนชุด' });
    return {
      mission: { label: 'ครองอิห์รอมและเนียต', text: 'เดินไปห้องเปลี่ยนชุดท้ายเครื่อง เตรียมตัวเข้าสู่อิห์รอม แล้วกล่าวเนียต', hint: 'เดินตามทางเดินไปท้ายเครื่อง', total: 2 },
      start: { x: CABIN.start.x, z: CABIN.start.z, yaw: Math.PI },
      camYaw: 0,
      camDist: 3.4,
    };
  },
};
