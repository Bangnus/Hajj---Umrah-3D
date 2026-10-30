import { NABAWI, buildNabawi, buildQuba, buildUhud } from '../../../world/madinah';
import { Zone, relocate } from '../../../world/props';
import type { StageDef } from '../../types';
import { pray, twoRakaat } from './stageKit';
import { QUBA_AT, UHUD_AT, setupOptionalTrips, type ZiyarahArea } from './ziyarahTrips';
import { tr } from '../../../i18n';

/** Waypoint in the west of the hall, in front of the corridor opening near Bab as-Salam. */
const CORRIDOR_WAY = { x: -24, z: 13 };
const TAHIYYAH = twoRakaat(tr('ละหมาดซุนนะฮ์ตะฮียะตุลมัสยิด (ละหมาดเคารพมัสยิด)'), true);

type Step = 'door' | 'raudhah' | 'corridor' | 'salam' | 'pause' | 'exit' | 'baqi' | 'done';

export const madinah: StageDef = {
  id: 'madinah',
  icon: '🕌',
  title: tr('ซิยาเราะฮ์มะดีนะฮ์'),
  arabic: 'زيارة المدينة المنورة',
  desc: tr('เยี่ยมมัสยิดนะบะวี ละหมาดที่อัรเราเฎาะฮ์ ให้สลามแด่ท่านนบี ﷺ และเยี่ยมสุสานอัลบะเกียะอ์ การเยือนมะดีนะฮ์เป็นสิ่งที่ส่งเสริมให้ทำ แต่ไม่ใช่ส่วนหนึ่งของพิธีอุมเราะฮ์ อุมเราะฮ์ของคุณสมบูรณ์ได้แม้ไม่ได้มามะดีนะฮ์'),
  tip: (p) => tr('ละหมาดในมัสยิดนะบะวีได้ผลบุญมากกว่าละหมาดในมัสยิดอื่น 1,000 เท่า (ยกเว้นมัสยิดอัลฮะรอม) ปัจจุบันการเข้าอัรเราเฎาะฮ์ต้องจองเวลาผ่านแอป Nusuk')
    + ' ' + (p.gender === 'male'
      ? tr('ผู้ชายและผู้หญิงมีช่วงเวลาเข้าแยกกัน')
      : tr('ผู้หญิงมีช่วงเวลาและทางเข้าอัรเราเฎาะฮ์แยกจากผู้ชาย ส่วนสุสานอัลบะเกียะอ์ ผู้หญิงมักให้สลามจากด้านนอกกำแพงตามระเบียบของสถานที่'))
    + ' ' + tr('การนั่งรถไปมัสยิดกุบาอ์และอุฮุดเป็นทางเลือกเสริม ไม่บังคับ'),
  outfit: 'travel',
  build(ctx) {
    const N = NABAWI, R = N.raudhah;
    const low = ctx.quality === 'low';
    const male = ctx.profile.gender === 'male';
    const zone = new Zone();
    const nab = relocate(buildNabawi({ crowd: low ? 70 : 170, quality: ctx.quality }), 0, 0);
    const quba = relocate(buildQuba(low ? 14 : 36), QUBA_AT.x, QUBA_AT.z);
    const uhud = relocate(buildUhud(low ? 10 : 24), UHUD_AT.x, UHUD_AT.z);
    ctx.add(nab.scene);
    ctx.add(quba.scene);
    ctx.add(uhud.scene);
    ctx.player.colliders.push(zone.collider);
    zone.set(nab.shape);

    let area: ZiyarahArea = 'nabawi';
    let step: Step = 'door';
    let goal: { x: number; z: number } | null = N.door;
    let subGoal: { x: number; z: number } | null = null;
    const target = { x: N.door.x, z: N.door.z };
    ctx.guide(target);

    ctx.after(1, () => ctx.toast(ctx.profile.route === 'madinah-first'
      ? tr('ยินดีต้อนรับสู่มะดีนะฮ์ หลังเยี่ยมมัสยิดนะบะวีแล้ว คุณจะครองอิห์รอมที่มีกอตบิอ์รอะลีระหว่างทางไปมักกะฮ์')
      : tr('ยินดีต้อนรับสู่มะดีนะฮ์ (ก่อนออกจากมักกะฮ์มาที่นี่ ผู้แสวงบุญเฏาะวาฟวะดาอ์เป็นสิ่งสุดท้ายแล้ว)'), 'info'));

    // (a) Enter with the right foot.
    ctx.rings.add(N.door.x, N.door.z, 1.6, () => {
      ctx.progress();
      ctx.dua('masjid_enter');
      ctx.toast(tr('ก้าวเท้าขวาเข้ามัสยิด พร้อมกล่าวดุอาอ์เข้ามัสยิด'), 'ok');
      ctx.hint(tr('ไปที่อัรเราเฎาะฮ์ พื้นที่พรมสีเขียวระหว่างมิมบัรกับห้องของท่านนบี ﷺ'));
      raudhah();
    }, { label: tr('ประตูมัสยิด — ก้าวเท้าขวาเข้า') });

    // (b) Two rakaat in the Raudhah.
    const inRaudhah = () => {
      const p = ctx.player.pos;
      return area === 'nabawi' && p.x > R.minX && p.x < R.maxX && p.z > R.minZ && p.z < R.maxZ;
    };
    const raudhah = () => {
      step = 'raudhah';
      goal = R;
      ctx.rings.add(R.x, R.z, 1.8, () => {
        ctx.dua('raudhah_hadith');
        ctx.toast(tr('คุณอยู่ในอัรเราเฎาะฮ์แล้ว ละหมาดและขอดุอาอ์อย่างสงบ ไม่เบียดหรือใช้เวลานานจนผู้อื่นไม่ได้เข้า'), 'info');
        ctx.hint(tr('กดปุ่ม "ละหมาดตะฮียะตุลมัสยิด" เมื่อพร้อม'));
        const btn = ctx.action(tr('🕌 ละหมาดตะฮียะตุลมัสยิด 2 ร็อกอะฮ์'), () => {
          if (ctx.player.frozen) return;
          if (!inRaudhah()) { ctx.toast(tr('กลับเข้าไปยืนในพื้นที่พรมสีเขียว (อัรเราเฎาะฮ์) ก่อน'), 'warn'); return; }
          btn.remove();
          pray(ctx, TAHIYYAH, 0, () => {
            ctx.progress();
            ctx.toast(tr('ละหมาดเสร็จแล้ว ต่อไปไปให้สลามแด่ท่านนบี ﷺ โดยเข้าทางเดินที่ประตูบาบุสสลาม (ฝั่งตะวันตก)'), 'ok');
            corridor();
          });
        });
      }, { label: tr('อัรเราเฎาะฮ์') });
    };

    // (c) Salam corridor: Bab as-Salam → in front of the chamber → Bab al-Baqi.
    const corridor = () => {
      step = 'corridor';
      goal = N.salamStart;
      ctx.hint(tr('เดินไปทางทิศตะวันตกของโถง แล้วเลี้ยวเข้าทางเดินให้สลามที่ประตูบาบุสสลาม'));
      ctx.rings.add(N.salamStart.x, N.salamStart.z, 1.4, () => {
        step = 'salam';
        goal = N.salam;
        ctx.input.yaw = -Math.PI / 2;
        ctx.toast(tr('มารยาท: เดินอย่างสงบ ไม่ส่งเสียงดัง ไม่แตะหรือลูบผนังและลูกกรง ไม่เบียดผู้อื่น และเดินต่อไปตามแถว'), 'info');
        ctx.hint(tr('เดินตามทางเดินไปทางทิศตะวันออก จนถึงหน้าห้องของท่านนบี ﷺ'));
        ctx.rings.add(N.salam.x, N.salam.z, 1.5, () => {
          ctx.progress();
          step = 'pause';
          goal = null;
          ctx.player.yaw = Math.PI;
          ctx.dua('salam_prophet');
          ctx.toast(tr('ให้สลามแด่ท่านนบี ﷺ ด้วยเสียงเบา ๆ แล้วขยับไปทางขวาเล็กน้อยเพื่อให้สลามแด่อบูบักร์และอุมัร'), 'ok');
          ctx.hint(tr('ยืนสงบสักครู่'));
          ctx.after(7, () => {
            ctx.dua('salawat_ibrahimiyyah');
            ctx.toast(tr('ถ้าจะขอดุอาอ์ ให้หันหน้าไปทางกิบลัต (ทิศใต้) ไม่หันหน้าเข้าหาหลุมฝังศพ แล้วเดินต่อไปออกที่ประตูบาบุลบะกีอ์'), 'info');
            exit();
          });
        }, { label: tr('ให้สลามแด่ท่านนบี ﷺ') });
      }, { label: tr('บาบุสสลาม — เริ่มทางเดิน') });
    };

    const exit = () => {
      step = 'exit';
      goal = N.exit;
      ctx.hint(tr('เดินต่อไปออกทางประตูบาบุลบะกีอ์'));
      ctx.rings.add(N.exit.x, N.exit.z, 1.3, () => {
        ctx.toast(tr('ก้าวเท้าซ้ายออกจากมัสยิด และกล่าวดุอาอ์ออกจากมัสยิด'), 'ok');
        baqi();
      }, { label: tr('บาบุลบะกีอ์ — ก้าวเท้าซ้ายออก') });
    };

    const baqi = () => {
      step = 'baqi';
      const spot = male ? N.baqi.gate : N.baqi.outside;
      goal = spot;
      ctx.hint(tr('เดินไปที่สุสานอัลบะเกียะอ์ ทางทิศตะวันออกของมัสยิด'));
      ctx.rings.add(spot.x, spot.z, 1.6, () => {
        ctx.progress();
        step = 'done';
        goal = null;
        ctx.player.yaw = Math.PI / 2;
        ctx.dua('graves_visit');
        ctx.toast(male
          ? tr('อัลบะเกียะอ์เป็นที่ฝังศพของภรรยาและลูกหลานของท่านนบี ﷺ และเศาะฮาบะฮ์จำนวนมาก เช่น อุษมาน บิน อัฟฟาน ให้สลามและขอดุอาอ์ให้พวกท่าน เดินบนทางเดิน ไม่เหยียบหรือนั่งบนหลุมศพ')
          : tr('อัลบะเกียะอ์เป็นที่ฝังศพของภรรยาและลูกหลานของท่านนบี ﷺ และเศาะฮาบะฮ์จำนวนมาก ผู้หญิงมักให้สลามและขอดุอาอ์จากหน้ากำแพงสุสานตามระเบียบของสถานที่'), 'ok');
        ctx.hint(tr('ครบภารกิจแล้ว กด "ไปต่อ" หรือจะนั่งรถบัสไปมัสยิดกุบาอ์ / อุฮุดก่อนก็ได้'));
        ctx.after(8, () => ctx.toast(tr('ถ้าต้องการ ลองนั่งรถบัสไปมัสยิดกุบาอ์หรืออุฮุด (ไม่บังคับ)'), 'info'));
      }, { label: tr('สุสานอัลบะเกียะอ์') });
    };

    setupOptionalTrips({
      ctx, zone,
      nabShape: nab.shape, qubaShape: quba.shape, uhudShape: uhud.shape,
      getArea: () => area, setArea: (a) => { area = a; }, setSubGoal: (g) => { subGoal = g; },
    });

    return {
      mission: {
        label: tr('ซิยาเราะฮ์มัสยิดนะบะวี'),
        text: tr('เข้ามัสยิดด้วยเท้าขวา → ละหมาด 2 ร็อกอะฮ์ที่อัรเราเฎาะฮ์ → ให้สลามแด่ท่านนบี ﷺ → เยี่ยมสุสานอัลบะเกียะอ์'),
        hint: tr('เดินตามลูกศรไปที่ประตูมัสยิด'),
        total: 4,
      },
      start: { x: N.start.x, z: N.start.z, yaw: 0 },
      camYaw: Math.PI,
      tick() {
        const p = ctx.player.pos;
        let t = area === 'nabawi' ? goal : subGoal;
        if (area === 'nabawi' && step === 'corridor' && p.z < 17 && p.x > -21.5) t = CORRIDOR_WAY;
        if (t) { target.x = t.x; target.z = t.z; } else { target.x = p.x; target.z = p.z; }
      },
    };
  },
};
