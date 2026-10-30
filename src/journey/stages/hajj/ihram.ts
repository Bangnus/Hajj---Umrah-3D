import { RING } from '../../../engine/rings';
import { HOTEL, buildHotel } from '../../../world/hotel';
import { CABIN, buildCabin } from '../../../world/simple';
import type { Profile, StageCtx, StageDef } from '../../types';
import { TYPE_TH } from './common';

const DESC: Record<Profile['hajjType'], string> = {
  tamattu: 'ฮัจญ์ตะมัตตุอ์: คุณทำอุมเราะฮ์เสร็จไปแล้วในเดือนฮัจญ์ และได้ออกจากอิห์รอม (ตะฮัลลุล) แล้ว วันที่ 8 ซุลหิจญะฮ์ (วันตัรวิยะฮ์) ให้ครองอิห์รอมใหม่จากที่พักในมักกะฮ์ แล้วเนียตฮัจญ์ ผู้ทำตะมัตตุอ์ต้องเสียดัม (เชือดแพะหรือแกะ 1 ตัว) ถ้าทำไม่ได้ให้ถือศีลอด 3 วันระหว่างฮัจญ์ และอีก 7 วันเมื่อกลับถึงบ้าน',
  ifrad: 'ฮัจญ์อิฟรอด: เนียตทำฮัจญ์อย่างเดียวตั้งแต่ที่มีกอต ไม่ต้องเสียดัม และคงอยู่ในอิห์รอมไปจนถึงวันที่ 10 ซุลหิจญะฮ์ เมื่อถึงมักกะฮ์ ซุนนะฮ์ให้เฏาะวาฟกุดูม (เฏาะวาฟเมื่อแรกมาถึง) และจะสะแอของฮัจญ์ต่อจากนั้นเลยก็ได้',
  qiran: 'ฮัจญ์กิรอน: เนียตทั้งฮัจญ์และอุมเราะฮ์พร้อมกันตั้งแต่ที่มีกอต คงอยู่ในอิห์รอมไปจนถึงวันที่ 10 ซุลหิจญะฮ์ และต้องเสียดัมเช่นเดียวกับตะมัตตุอ์ เมื่อถึงมักกะฮ์ ซุนนะฮ์ให้เฏาะวาฟกุดูม และจะสะแอต่อจากนั้นเลยก็ได้ (เฏาะวาฟและสะแอของฮัจญ์ใช้แทนของอุมเราะฮ์ด้วย)',
};

const RULES = 'เมื่อเนียตแล้ว ข้อห้ามของอิห์รอมเริ่มมีผล: ห้ามใช้น้ำหอม ห้ามตัดผมหรือเล็บ ผู้ชายห้ามคลุมศีรษะและห้ามสวมเสื้อผ้าที่ตัดเย็บเป็นรูปร่าง ผู้หญิงห้ามปิดหน้าและสวมถุงมือ ทั้งชายและหญิงห้ามมีเพศสัมพันธ์และห้ามล่าสัตว์';

/** Niyyah + talbiyah buttons, shared by both variants. */
function niyyahSteps(ctx: StageCtx, after?: () => void) {
  const qiran = ctx.profile.hajjType === 'qiran';
  ctx.hint(`กดปุ่ม "กล่าวเนียต${qiran ? 'ฮัจญ์และอุมเราะฮ์' : 'ฮัจญ์'}" เมื่อพร้อม`);
  const btn = ctx.action(qiran ? 'กล่าวเนียตฮัจญ์และอุมเราะฮ์ (กิรอน)' : 'กล่าวเนียตฮัจญ์', () => {
    btn.remove();
    ctx.progress();
    ctx.dua(qiran ? 'niyyah_hajj_qiran' : 'niyyah_hajj');
    ctx.toast('เนียตแล้ว ข้อห้ามของอิห์รอมเริ่มมีผล', 'ok');
    ctx.after(2.5, () => {
      ctx.hint('กล่าวตัลบิยะฮ์ ผู้ชายกล่าวเสียงดัง ผู้หญิงกล่าวเบา ๆ');
      const tb = ctx.action('กล่าวตัลบิยะฮ์', () => {
        tb.remove();
        ctx.progress();
        ctx.dua('talbiyah');
        ctx.toast('กล่าวตัลบิยะฮ์บ่อย ๆ ไปจนถึงการขว้างญัมเราะฮ์อะกอบะฮ์ก้อนแรกในวันที่ 10', 'info');
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
    title: `ครองอิห์รอมฮัจญ์ (${TYPE_TH[p.hajjType]})`,
    arabic: 'الإحرام بالحج',
    desc: DESC[p.hajjType],
    tip: (pp) => (pp.gender === 'male'
      ? 'ผู้ชายสวมผ้าอิห์รอมสีขาว 2 ผืนที่ไม่ได้ตัดเย็บ และรองเท้าแตะที่เปิดส้นและหลังเท้า '
      : 'ผู้หญิงสวมชุดปกติที่ปกปิดมิดชิด ไม่ปิดหน้าและไม่สวมถุงมือ ผู้หญิงที่มีประจำเดือนครองอิห์รอมและเนียตได้ตามปกติ ')
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
  ctx.after(1, () => ctx.toast('วันที่ 8 ซุลหิจญะฮ์ (วันตัรวิยะฮ์) — คุณทำอุมเราะฮ์เสร็จแล้วตั้งแต่มาถึง วันนี้ครองอิห์รอมใหม่เพื่อฮัจญ์', 'info'));
  ctx.rings.add(HOTEL.bath.x, HOTEL.bath.z, 1.0, () => {
    ctx.progress();
    ctx.toast('อาบน้ำซุนนะฮ์ (ฆุสล์) ตัดเล็บ และทำความสะอาดร่างกายแล้ว', 'ok');
    ctx.hint('ไปที่ตู้เสื้อผ้าเพื่อครองอิห์รอม');
    ctx.rings.add(HOTEL.wardrobe.x, HOTEL.wardrobe.z, 1.0, () => {
      ctx.player.setLook({ outfit: 'ihram' });
      ctx.progress();
      ctx.toast(male ? 'ครองผ้าอิห์รอมแล้ว' : 'พร้อมแล้ว สวมชุดปกปิดมิดชิด ไม่ปิดหน้าและไม่สวมถุงมือ', 'ok');
      ctx.dua('guidance_ihram_wear');
      niyyahSteps(ctx, () => {
        ctx.hint('เดินออกทางประตูเพื่อเดินทางไปมีนา');
        ctx.rings.add(HOTEL.door.x, HOTEL.door.z, 0.9, () => {
          ctx.progress();
          ctx.toast('ออกเดินทางไปมีนา ลับบัยกัลลอฮุมมะ ลับบัยก์', 'ok');
        }, { label: 'ออกเดินทางไปมีนา', color: RING.secondary });
      });
    }, { label: 'ตู้เสื้อผ้า — ครองอิห์รอม' });
  }, { label: 'ห้องน้ำ — อาบน้ำซุนนะฮ์' });
  return {
    mission: { label: 'ครองอิห์รอมฮัจญ์ที่ที่พัก', text: 'อาบน้ำ ครองอิห์รอม เนียตฮัจญ์ กล่าวตัลบิยะฮ์ แล้วออกเดินทางไปมีนา', hint: 'เดินไปที่วงแหวนหน้าห้องน้ำ', total: 5 },
    start: { x: HOTEL.start.x, z: HOTEL.start.z, yaw: Math.PI },
    camYaw: 0,
    camDist: 4.2,
  };
}

function buildAtMiqat(ctx: StageCtx) {
  ctx.add(buildCabin());
  const qiran = ctx.profile.hajjType === 'qiran';
  ctx.after(1.5, () => ctx.toast('กัปตันประกาศ: อีกประมาณ 30 นาทีเครื่องจะผ่านเขตมีกอต กรุณาครองอิห์รอม', 'info'));
  ctx.rings.add(CABIN.changing.x, CABIN.changing.z, 1.0, () => {
    ctx.player.setLook({ outfit: 'ihram' });
    ctx.progress();
    ctx.toast(ctx.profile.gender === 'male' ? 'ครองผ้าอิห์รอมแล้ว' : 'พร้อมแล้ว สวมชุดปกปิดมิดชิด ไม่ปิดหน้าและไม่สวมถุงมือ', 'ok');
    ctx.dua('guidance_ihram_wear');
    niyyahSteps(ctx, () => {
      ctx.after(4, () => ctx.toast(qiran
        ? 'กิรอน: อยู่ในอิห์รอมจนถึงวันที่ 10 และต้องเสียดัม เมื่อถึงมักกะฮ์ ซุนนะฮ์ให้เฏาะวาฟกุดูม'
        : 'อิฟรอด: อยู่ในอิห์รอมจนถึงวันที่ 10 ไม่ต้องเสียดัม เมื่อถึงมักกะฮ์ ซุนนะฮ์ให้เฏาะวาฟกุดูม', 'info'));
      ctx.after(9, () => ctx.toast('จากนั้นรอในมักกะฮ์โดยยังครองอิห์รอม จนถึงวันที่ 8 จึงเดินทางไปมีนา', 'info'));
    });
  }, { label: 'ห้องเปลี่ยนชุด' });
  return {
    mission: { label: `ครองอิห์รอมที่มีกอต (${qiran ? 'กิรอน' : 'อิฟรอด'})`, text: 'เดินไปห้องเปลี่ยนชุดท้ายเครื่อง ครองอิห์รอม เนียต แล้วกล่าวตัลบิยะฮ์ก่อนผ่านมีกอต', hint: 'เดินตามทางเดินไปท้ายเครื่อง', total: 3 },
    start: { x: CABIN.start.x, z: CABIN.start.z, yaw: Math.PI },
    camYaw: 0,
    camDist: 3.4,
  };
}
