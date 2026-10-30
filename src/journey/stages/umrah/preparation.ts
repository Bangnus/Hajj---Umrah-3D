import { RING } from '../../../engine/rings';
import { HOME, buildHome } from '../../../world/simple';
import type { StageDef } from '../../types';
import { tr } from '../../../i18n';

export const preparation: StageDef = {
  id: 'preparation',
  icon: '🧳',
  title: tr('เตรียมตัวที่บ้าน'),
  arabic: 'الاستعداد',
  desc: tr('ก่อนออกเดินทาง ตั้งเจตนาให้บริสุทธิ์เพื่ออัลลอฮ์ ชำระหนี้สิน ขออภัยคนรอบข้าง แล้วจัดกระเป๋าให้พร้อม'),
  tip: (p) => p.gender === 'male'
    ? tr('ผู้ชายเตรียมผ้าอิห์รอมสีขาว 2 ผืน (ผ้านุ่งและผ้าคลุม) ที่ไม่ได้ตัดเย็บเป็นรูปทรงเสื้อหรือกางเกง เข็มขัดใส่เงิน และรองเท้าแตะที่ไม่หุ้มส้นและหลังเท้า')
    : tr('ผู้หญิงไม่มีชุดอิห์รอมเฉพาะ ใช้เสื้อผ้าที่ปกปิดมิดชิดตามปกติ แต่ขณะครองอิห์รอมห้ามสวมนิกอบ (ผ้าปิดหน้า) และถุงมือ'),
  outfit: 'travel',
  build(ctx) {
    ctx.add(buildHome());
    const items = ctx.profile.gender === 'male'
      ? [tr('หนังสือเดินทาง'), tr('ผ้าอิห์รอม 2 ผืน'), tr('เข็มขัดอิห์รอม'), tr('สบู่ไม่มีกลิ่น'), tr('รองเท้าแตะ')]
      : [tr('หนังสือเดินทาง'), tr('ชุดคลุมและฮิญาบ'), tr('กรรไกรเล็ก (ไว้ตะฮัลลุล)'), tr('ของใช้ไม่มีกลิ่น'), tr('ผ้าละหมาด')];
    let packed = 0;
    items.forEach((name, i) => {
      const s = HOME.items[i];
      ctx.rings.add(s.x, s.z, 0.9, () => {
        packed++;
        ctx.progress();
        ctx.toast(tr('เก็บ{item}แล้ว ({n}/5)', { item: name, n: packed }), 'ok');
        if (packed === 5) { ctx.hint(tr('ครบแล้ว เดินออกทางประตูไปขึ้นรถ')); ctx.guide(HOME.door); }
      }, { label: name });
    });
    ctx.rings.add(HOME.outside.x, HOME.outside.z, 1.4, () => {
      if (packed < 5) { ctx.toast(tr('เก็บของให้ครบ 5 อย่างก่อนออกจากบ้าน'), 'warn'); return false; }
      ctx.progress();
      ctx.dua('leave_home');
    }, { label: tr('ออกจากบ้าน'), color: RING.secondary, persistent: false });
    ctx.after(1.2, () => ctx.dua('farewell_traveler'));
    return {
      mission: { label: tr('จัดกระเป๋า'), text: tr('เดินเข้าวงแหวนสีเขียวเพื่อเก็บของ 5 อย่าง แล้วเดินออกจากบ้าน'), hint: tr('เดินเข้าวงแหวนสีเขียว'), total: 6 },
      start: { x: 0, z: -2, yaw: Math.PI },
      camYaw: 0,
      camDist: 4.5,
    };
  },
};
