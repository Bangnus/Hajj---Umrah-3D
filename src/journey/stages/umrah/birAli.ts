import { RING } from '../../../engine/rings';
import { BIRALI, buildBirAli } from '../../../world/birali';
import type { StageDef } from '../../types';
import { pray, twoRakaat } from './stageKit';

const IHRAM_PRAYER = twoRakaat('ละหมาดซุนนะฮ์อิห์รอม', false);

export const miqatBirAli: StageDef = {
  id: 'miqatBirAli',
  icon: '📍',
  title: 'มีกอตบิอ์รอะลี',
  arabic: 'ميقات ذي الحليفة',
  desc: 'ผู้ที่เดินทางจากมะดีนะฮ์ไปมักกะฮ์ใช้มีกอตซุลหุลัยฟะฮ์ ซึ่งคนทั่วไปเรียกว่าบิอ์รอะลี อยู่ห่างจากมัสยิดนะบะวีประมาณ 10 กม. ท่านนบี ﷺ ก็ครองอิห์รอมที่นี่ ห้ามผ่านมีกอตไปมักกะฮ์โดยยังไม่ได้เนียตเข้าสู่อิห์รอม (ถ้าผ่านไปแล้วต้องเสียดัม)',
  tip: (p) => (p.gender === 'male'
    ? 'ผู้ชายอาบน้ำซุนนะฮ์ แล้วครองผ้าอิห์รอม 2 ผืน (ผ้านุ่งและผ้าคลุม) ไม่สวมเสื้อผ้าที่ตัดเย็บเป็นรูปทรง และไม่คลุมศีรษะ '
    : 'ผู้หญิงอาบน้ำซุนนะฮ์ แต่งกายปกปิดมิดชิดตามปกติ ไม่ปิดหน้าและไม่สวมถุงมือ ผู้ที่มีประจำเดือนก็อาบน้ำและเนียตอิห์รอมได้ เพียงแต่ไม่ละหมาด ')
    + 'ตามมัซฮับชาฟิอีย์ ซุนนะฮ์ให้ละหมาด 2 ร็อกอะฮ์ก่อนเนียต (ร็อกอะฮ์แรกอ่านอัลกาฟิรูน ร็อกอะฮ์ที่สองอ่านอัลอิคลาศ) หลายคณะให้อาบน้ำและครองผ้าอิห์รอมตั้งแต่ที่พักในมะดีนะฮ์ แล้วมาเนียตที่นี่',
  outfit: 'travel',
  build(ctx) {
    ctx.add(buildBirAli({ crowd: ctx.quality === 'low' ? 40 : 100, quality: ctx.quality }));
    const male = ctx.profile.gender === 'male';
    const ch = male ? BIRALI.change.male : BIRALI.change.female;
    ctx.after(1.2, () => ctx.toast('คุณเดินทางจากมะดีนะฮ์มาถึงมีกอตซุลหุลัยฟะฮ์ (บิอ์รอะลี) ห่างจากมัสยิดนะบะวีประมาณ 10 กม.', 'info'));

    ctx.rings.add(ch.x, ch.z, 1.2, () => {
      ctx.player.setLook({ outfit: 'ihram' });
      ctx.progress();
      ctx.toast(male
        ? 'อาบน้ำและครองผ้าอิห์รอมแล้ว'
        : 'พร้อมแล้ว ผู้หญิงสวมชุดปกติที่ปกปิดมิดชิด ไม่ปิดหน้าและไม่สวมถุงมือ', 'ok');
      ctx.dua('guidance_ihram_wear');
      ctx.hint('ถ้าสะดวก ไปละหมาดซุนนะฮ์อิห์รอม 2 ร็อกอะฮ์ในห้องละหมาด (ไม่บังคับ) แล้วกดปุ่ม "กล่าวเนียตอุมเราะฮ์"');

      // Optional sunnah prayer before the niyyah (Shafi'i).
      const pr = ctx.rings.add(BIRALI.prayer.x, BIRALI.prayer.z, 1.4, () => {
        pray(ctx, IHRAM_PRAYER, 0, () => {
          ctx.toast('ละหมาดซุนนะฮ์อิห์รอมแล้ว ต่อไปกดปุ่ม "กล่าวเนียตอุมเราะฮ์"', 'ok');
        });
      }, { label: 'ละหมาดซุนนะฮ์อิห์รอม (ไม่บังคับ)', color: RING.secondary });

      const btn = ctx.action('กล่าวเนียตอุมเราะฮ์', () => {
        if (ctx.player.frozen) return;
        btn.remove();
        pr.remove();
        ctx.progress();
        ctx.dua('niyyah_umrah');
        ctx.toast('เนียตแล้ว ข้อห้ามของอิห์รอมเริ่มมีผล', 'ok');
        ctx.after(5, () => ctx.dua('talbiyah'));
        ctx.after(9, () => ctx.toast('กล่าวตัลบิยะฮ์บ่อย ๆ ตลอดทางไปมักกะฮ์ จนกระทั่งเริ่มเฏาะวาฟ (ผู้ชายกล่าวเสียงดังพอประมาณ ผู้หญิงกล่าวเบา ๆ)', 'info'));
      });
    }, { label: male ? 'ที่อาบน้ำ / เปลี่ยนชุด (ชาย)' : 'ที่อาบน้ำ / เปลี่ยนชุด (หญิง)' });

    return {
      mission: {
        label: 'ครองอิห์รอมและเนียต',
        text: 'เดินผ่านซุ้มมีกอตไปที่อาบน้ำ/เปลี่ยนชุด เตรียมตัวเข้าสู่อิห์รอม แล้วกล่าวเนียตอุมเราะฮ์',
        hint: 'เดินผ่านซุ้มประตู MIQAT เข้าไปในลานมัสยิด',
        total: 2,
      },
      start: { x: BIRALI.start.x, z: BIRALI.start.z, yaw: 0 },
      camYaw: Math.PI,
    };
  },
};
