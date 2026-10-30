import { RING } from '../../../engine/rings';
import { HOTEL, buildHotel } from '../../../world/hotel';
import { CABIN, buildCabin } from '../../../world/simple';
import type { Profile, StageCtx, StageDef } from '../../types';
import { TYPE_TH } from './common';
import { tr } from '../../../i18n';

const DESC: Record<Profile['hajjType'], string> = {
  tamattu: tr('ฮัจญ์ตะมัตตุอ์: คุณทำอุมเราะฮ์เสร็จไปแล้วในเดือนฮัจญ์ และได้ออกจากอิห์รอม (ตะฮัลลุล) แล้ว วันที่ 8 ซุลหิจญะฮ์ (วันตัรวิยะฮ์) ให้ครองอิห์รอมใหม่จากที่พักในมักกะฮ์ แล้วเนียตฮัจญ์ ผู้ทำตะมัตตุอ์ต้องเสียดัม (เชือดแพะหรือแกะ 1 ตัว) ถ้าทำไม่ได้ให้ถือศีลอด 3 วันระหว่างฮัจญ์ และอีก 7 วันเมื่อกลับถึงบ้าน'),
  ifrad: tr('ฮัจญ์อิฟรอด: เนียตทำฮัจญ์อย่างเดียวตั้งแต่ที่มีกอต ไม่ต้องเสียดัม และคงอยู่ในอิห์รอมไปจนถึงวันที่ 10 ซุลหิจญะฮ์ เมื่อถึงมักกะฮ์ ซุนนะฮ์ให้เฏาะวาฟกุดูม (เฏาะวาฟเมื่อแรกมาถึง) และจะสะแอของฮัจญ์ต่อจากนั้นเลยก็ได้'),
  qiran: tr('ฮัจญ์กิรอน: เนียตทั้งฮัจญ์และอุมเราะฮ์พร้อมกันตั้งแต่ที่มีกอต คงอยู่ในอิห์รอมไปจนถึงวันที่ 10 ซุลหิจญะฮ์ และต้องเสียดัมเช่นเดียวกับตะมัตตุอ์ เมื่อถึงมักกะฮ์ ซุนนะฮ์ให้เฏาะวาฟกุดูม และจะสะแอต่อจากนั้นเลยก็ได้ (เฏาะวาฟและสะแอของฮัจญ์ใช้แทนของอุมเราะฮ์ด้วย)'),
};

const RULES = tr('เมื่อเนียตแล้ว ข้อห้ามของอิห์รอมเริ่มมีผล: ห้ามใช้น้ำหอม ห้ามตัดผมหรือเล็บ ผู้ชายห้ามคลุมศีรษะและห้ามสวมเสื้อผ้าที่ตัดเย็บเป็นรูปร่าง ผู้หญิงห้ามปิดหน้าและสวมถุงมือ ทั้งชายและหญิงห้ามมีเพศสัมพันธ์และห้ามล่าสัตว์');

/** Niyyah + talbiyah buttons, shared by both variants. */
function niyyahSteps(ctx: StageCtx, after?: () => void) {
  const qiran = ctx.profile.hajjType === 'qiran';
  ctx.hint(qiran ? tr('กดปุ่ม "กล่าวเนียตฮัจญ์และอุมเราะฮ์" เมื่อพร้อม') : tr('กดปุ่ม "กล่าวเนียตฮัจญ์" เมื่อพร้อม'));
  const btn = ctx.action(qiran ? tr('กล่าวเนียตฮัจญ์และอุมเราะฮ์ (กิรอน)') : tr('กล่าวเนียตฮัจญ์'), () => {
    btn.remove();
    ctx.progress();
    ctx.dua(qiran ? 'niyyah_hajj_qiran' : 'niyyah_hajj');
    ctx.toast(tr('เนียตแล้ว ข้อห้ามของอิห์รอมเริ่มมีผล'), 'ok');
    ctx.after(2.5, () => {
      ctx.hint(tr('กล่าวตัลบิยะฮ์ ผู้ชายกล่าวเสียงดัง ผู้หญิงกล่าวเบา ๆ'));
      const tb = ctx.action(tr('กล่าวตัลบิยะฮ์'), () => {
        tb.remove();
        ctx.progress();
        ctx.dua('talbiyah');
        ctx.toast(tr('กล่าวตัลบิยะฮ์บ่อย ๆ ไปจนถึงการขว้างญัมเราะฮ์อะกอบะฮ์ก้อนแรกในวันที่ 10'), 'info');
        after?.();
      });
    });
  });
}

export function hajjIhram(p: Profile): StageDef {
  const tamattu = p.hajjType === 'tamattu';
  return {
    id: 'hajjIhram',
    icon: '🤍',
    title: tr('ครองอิห์รอมฮัจญ์ ({type})', { type: TYPE_TH[p.hajjType] }),
    arabic: 'الإحرام بالحج',
    desc: DESC[p.hajjType],
    tip: (pp) => (pp.gender === 'male'
      ? tr('ผู้ชายสวมผ้าอิห์รอมสีขาว 2 ผืนที่ไม่ได้ตัดเย็บ และรองเท้าแตะที่เปิดส้นและหลังเท้า ')
      : tr('ผู้หญิงสวมชุดปกติที่ปกปิดมิดชิด ไม่ปิดหน้าและไม่สวมถุงมือ ผู้หญิงที่มีประจำเดือนครองอิห์รอมและเนียตได้ตามปกติ '))
      + RULES,
    outfit: 'travel',
    build(ctx) {
      if (tamattu) return buildTamattu(ctx);
      return buildAtMiqat(ctx);
    },
  };
}

function buildTamattu(ctx: StageCtx) {
  ctx.add(buildHotel());
  ctx.timeOfDay(0.22);
  const male = ctx.profile.gender === 'male';
  ctx.after(1, () => ctx.toast(tr('วันที่ 8 ซุลหิจญะฮ์ (วันตัรวิยะฮ์) — คุณทำอุมเราะฮ์เสร็จแล้วตั้งแต่มาถึง วันนี้ครองอิห์รอมใหม่เพื่อฮัจญ์'), 'info'));
  ctx.rings.add(HOTEL.bath.x, HOTEL.bath.z, 1.0, () => {
    ctx.progress();
    ctx.toast(tr('อาบน้ำซุนนะฮ์ (ฆุสล์) ตัดเล็บ และทำความสะอาดร่างกายแล้ว'), 'ok');
    ctx.hint(tr('ไปที่ตู้เสื้อผ้าเพื่อครองอิห์รอม'));
    ctx.rings.add(HOTEL.wardrobe.x, HOTEL.wardrobe.z, 1.0, () => {
      ctx.player.setLook({ outfit: 'ihram' });
      ctx.progress();
      ctx.toast(male ? tr('ครองผ้าอิห์รอมแล้ว') : tr('พร้อมแล้ว สวมชุดปกปิดมิดชิด ไม่ปิดหน้าและไม่สวมถุงมือ'), 'ok');
      ctx.dua('guidance_ihram_wear');
      niyyahSteps(ctx, () => {
        ctx.hint(tr('เดินออกทางประตูเพื่อเดินทางไปมีนา'));
        ctx.rings.add(HOTEL.door.x, HOTEL.door.z, 0.9, () => {
          ctx.progress();
          ctx.toast(tr('ออกเดินทางไปมีนา ลับบัยกัลลอฮุมมะ ลับบัยก์'), 'ok');
        }, { label: tr('ออกเดินทางไปมีนา'), color: RING.secondary });
      });
    }, { label: tr('ตู้เสื้อผ้า — ครองอิห์รอม') });
  }, { label: tr('ห้องน้ำ — อาบน้ำซุนนะฮ์') });
  return {
    mission: { label: tr('ครองอิห์รอมฮัจญ์ที่ที่พัก'), text: tr('อาบน้ำ ครองอิห์รอม เนียตฮัจญ์ กล่าวตัลบิยะฮ์ แล้วออกเดินทางไปมีนา'), hint: tr('เดินไปที่วงแหวนหน้าห้องน้ำ'), total: 5 },
    start: { x: HOTEL.start.x, z: HOTEL.start.z, yaw: Math.PI },
    camYaw: 0,
    camDist: 4.2,
  };
}

function buildAtMiqat(ctx: StageCtx) {
  ctx.add(buildCabin());
  const qiran = ctx.profile.hajjType === 'qiran';
  ctx.after(1.5, () => ctx.toast(tr('กัปตันประกาศ: อีกประมาณ 30 นาทีเครื่องจะผ่านเขตมีกอต กรุณาครองอิห์รอม'), 'info'));
  ctx.rings.add(CABIN.changing.x, CABIN.changing.z, 1.0, () => {
    ctx.player.setLook({ outfit: 'ihram' });
    ctx.progress();
    ctx.toast(ctx.profile.gender === 'male' ? tr('ครองผ้าอิห์รอมแล้ว') : tr('พร้อมแล้ว สวมชุดปกปิดมิดชิด ไม่ปิดหน้าและไม่สวมถุงมือ'), 'ok');
    ctx.dua('guidance_ihram_wear');
    niyyahSteps(ctx, () => {
      ctx.after(4, () => ctx.toast(qiran
        ? tr('กิรอน: อยู่ในอิห์รอมจนถึงวันที่ 10 และต้องเสียดัม เมื่อถึงมักกะฮ์ ซุนนะฮ์ให้เฏาะวาฟกุดูม')
        : tr('อิฟรอด: อยู่ในอิห์รอมจนถึงวันที่ 10 ไม่ต้องเสียดัม เมื่อถึงมักกะฮ์ ซุนนะฮ์ให้เฏาะวาฟกุดูม'), 'info'));
      ctx.after(9, () => ctx.toast(tr('จากนั้นรอในมักกะฮ์โดยยังครองอิห์รอม จนถึงวันที่ 8 จึงเดินทางไปมีนา'), 'info'));
    });
  }, { label: tr('ห้องเปลี่ยนชุด') });
  return {
    mission: { label: tr('ครองอิห์รอมที่มีกอต ({type})', { type: qiran ? tr('กิรอน') : tr('อิฟรอด') }), text: tr('เดินไปห้องเปลี่ยนชุดท้ายเครื่อง ครองอิห์รอม เนียต แล้วกล่าวตัลบิยะฮ์ก่อนผ่านมีกอต'), hint: tr('เดินตามทางเดินไปท้ายเครื่อง'), total: 3 },
    start: { x: CABIN.start.x, z: CABIN.start.z, yaw: Math.PI },
    camYaw: 0,
    camDist: 3.4,
  };
}
