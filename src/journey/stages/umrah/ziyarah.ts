import { RING } from '../../../engine/rings';
import { NABAWI, QUBA, UHUD, buildNabawi, buildQuba, buildUhud } from '../../../world/madinah';
import { Zone, relocate } from '../../../world/props';
import type { ActionHandle, StageDef } from '../../types';
import { place, pray, travel, twoRakaat } from './stageKit';

/** The optional trips are built far away so they are never visible from the mosque. */
const QUBA_AT = { x: -2000, z: 0 };
const UHUD_AT = { x: 2000, z: 0 };
/** Waypoint in the west of the hall, in front of the corridor opening near Bab as-Salam. */
const CORRIDOR_WAY = { x: -24, z: 13 };

const TAHIYYAH = twoRakaat('ละหมาดซุนนะฮ์ตะฮียะตุลมัสยิด (ละหมาดเคารพมัสยิด)', true);
const QUBA_PRAYER = twoRakaat('ละหมาดซุนนะฮ์ตะฮียะตุลมัสยิดที่มัสยิดกุบาอ์', true);

type Area = 'nabawi' | 'quba' | 'uhud';
type Step = 'door' | 'raudhah' | 'corridor' | 'salam' | 'pause' | 'exit' | 'baqi' | 'done';

export const madinah: StageDef = {
  id: 'madinah',
  icon: '🕌',
  title: 'ซิยาเราะฮ์มะดีนะฮ์',
  arabic: 'زيارة المدينة المنورة',
  desc: 'เยี่ยมมัสยิดนะบะวี ละหมาดที่อัรเราเฎาะฮ์ ให้สลามแด่ท่านนบี ﷺ และเยี่ยมสุสานอัลบะเกียะอ์ การเยือนมะดีนะฮ์เป็นสิ่งที่ส่งเสริมให้ทำ แต่ไม่ใช่ส่วนหนึ่งของพิธีอุมเราะฮ์ อุมเราะฮ์ของคุณสมบูรณ์ได้แม้ไม่ได้มามะดีนะฮ์',
  tip: (p) => 'ละหมาดในมัสยิดนะบะวีได้ผลบุญมากกว่าละหมาดในมัสยิดอื่น 1,000 เท่า (ยกเว้นมัสยิดอัลฮะรอม) ปัจจุบันการเข้าอัรเราเฎาะฮ์ต้องจองเวลาผ่านแอป Nusuk '
    + (p.gender === 'male'
      ? 'ผู้ชายและผู้หญิงมีช่วงเวลาเข้าแยกกัน '
      : 'ผู้หญิงมีช่วงเวลาและทางเข้าอัรเราเฎาะฮ์แยกจากผู้ชาย ส่วนสุสานอัลบะเกียะอ์ ผู้หญิงมักให้สลามจากด้านนอกกำแพงตามระเบียบของสถานที่ ')
    + 'การนั่งรถไปมัสยิดกุบาอ์และอุฮุดเป็นทางเลือกเสริม ไม่บังคับ',
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

    let area: Area = 'nabawi';
    let step: Step = 'door';
    let goal: { x: number; z: number } | null = N.door;
    let subGoal: { x: number; z: number } | null = null;
    // The guide arrow follows this object; tick() moves it (onto the player = hidden).
    const target = { x: N.door.x, z: N.door.z };
    ctx.guide(target);

    ctx.after(1, () => ctx.toast(ctx.profile.route === 'madinah-first'
      ? 'ยินดีต้อนรับสู่มะดีนะฮ์ หลังเยี่ยมมัสยิดนะบะวีแล้ว คุณจะครองอิห์รอมที่มีกอตบิอ์รอะลีระหว่างทางไปมักกะฮ์'
      : 'ยินดีต้อนรับสู่มะดีนะฮ์ (ก่อนออกจากมักกะฮ์มาที่นี่ ผู้แสวงบุญเฏาะวาฟวะดาอ์เป็นสิ่งสุดท้ายแล้ว)', 'info'));

    // (a) Enter with the right foot.
    ctx.rings.add(N.door.x, N.door.z, 1.6, () => {
      ctx.progress();
      ctx.dua('masjid_enter');
      ctx.toast('ก้าวเท้าขวาเข้ามัสยิด พร้อมกล่าวดุอาอ์เข้ามัสยิด', 'ok');
      ctx.hint('ไปที่อัรเราเฎาะฮ์ พื้นที่พรมสีเขียวระหว่างมิมบัรกับห้องของท่านนบี ﷺ');
      raudhah();
    }, { label: 'ประตูมัสยิด — ก้าวเท้าขวาเข้า' });

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
        ctx.toast('คุณอยู่ในอัรเราเฎาะฮ์แล้ว ละหมาดและขอดุอาอ์อย่างสงบ ไม่เบียดหรือใช้เวลานานจนผู้อื่นไม่ได้เข้า', 'info');
        ctx.hint('กดปุ่ม "ละหมาดตะฮียะตุลมัสยิด" เมื่อพร้อม');
        const btn = ctx.action('🕌 ละหมาดตะฮียะตุลมัสยิด 2 ร็อกอะฮ์', () => {
          if (ctx.player.frozen) return;
          if (!inRaudhah()) { ctx.toast('กลับเข้าไปยืนในพื้นที่พรมสีเขียว (อัรเราเฎาะฮ์) ก่อน', 'warn'); return; }
          btn.remove();
          pray(ctx, TAHIYYAH, 0, () => {
            ctx.progress();
            ctx.toast('ละหมาดเสร็จแล้ว ต่อไปไปให้สลามแด่ท่านนบี ﷺ โดยเข้าทางเดินที่ประตูบาบุสสลาม (ฝั่งตะวันตก)', 'ok');
            corridor();
          });
        });
      }, { label: 'อัรเราเฎาะฮ์' });
    };

    // (c) Salam corridor: Bab as-Salam → in front of the chamber → Bab al-Baqi.
    const corridor = () => {
      step = 'corridor';
      goal = N.salamStart;
      ctx.hint('เดินไปทางทิศตะวันตกของโถง แล้วเลี้ยวเข้าทางเดินให้สลามที่ประตูบาบุสสลาม');
      ctx.rings.add(N.salamStart.x, N.salamStart.z, 1.4, () => {
        step = 'salam';
        goal = N.salam;
        ctx.input.yaw = -Math.PI / 2; // camera behind a player heading east
        ctx.toast('มารยาท: เดินอย่างสงบ ไม่ส่งเสียงดัง ไม่แตะหรือลูบผนังและลูกกรง ไม่เบียดผู้อื่น และเดินต่อไปตามแถว', 'info');
        ctx.hint('เดินตามทางเดินไปทางทิศตะวันออก จนถึงหน้าห้องของท่านนบี ﷺ');
        ctx.rings.add(N.salam.x, N.salam.z, 1.5, () => {
          ctx.progress();
          step = 'pause';
          goal = null;
          ctx.player.yaw = Math.PI; // face the chamber (north) to give salam
          ctx.dua('salam_prophet');
          ctx.toast('ให้สลามแด่ท่านนบี ﷺ ด้วยเสียงเบา ๆ แล้วขยับไปทางขวาเล็กน้อยเพื่อให้สลามแด่อบูบักร์และอุมัร', 'ok');
          ctx.hint('ยืนสงบสักครู่');
          ctx.after(7, () => {
            ctx.dua('salawat_ibrahimiyyah');
            ctx.toast('ถ้าจะขอดุอาอ์ ให้หันหน้าไปทางกิบลัต (ทิศใต้) ไม่หันหน้าเข้าหาหลุมฝังศพ แล้วเดินต่อไปออกที่ประตูบาบุลบะกีอ์', 'info');
            exit();
          });
        }, { label: 'ให้สลามแด่ท่านนบี ﷺ' });
      }, { label: 'บาบุสสลาม — เริ่มทางเดิน' });
    };

    const exit = () => {
      step = 'exit';
      goal = N.exit;
      ctx.hint('เดินต่อไปออกทางประตูบาบุลบะกีอ์');
      ctx.rings.add(N.exit.x, N.exit.z, 1.3, () => {
        ctx.toast('ก้าวเท้าซ้ายออกจากมัสยิด และกล่าวดุอาอ์ออกจากมัสยิด', 'ok');
        baqi();
      }, { label: 'บาบุลบะกีอ์ — ก้าวเท้าซ้ายออก' });
    };

    // (d) Al-Baqi (men at the gate path, women in front of the gate).
    const baqi = () => {
      step = 'baqi';
      const spot = male ? N.baqi.gate : N.baqi.outside;
      goal = spot;
      ctx.hint('เดินไปที่สุสานอัลบะเกียะอ์ ทางทิศตะวันออกของมัสยิด');
      ctx.rings.add(spot.x, spot.z, 1.6, () => {
        ctx.progress();
        step = 'done';
        goal = null;
        ctx.player.yaw = Math.PI / 2;
        ctx.dua('graves_visit');
        ctx.toast(male
          ? 'อัลบะเกียะอ์เป็นที่ฝังศพของภรรยาและลูกหลานของท่านนบี ﷺ และเศาะฮาบะฮ์จำนวนมาก เช่น อุษมาน บิน อัฟฟาน ให้สลามและขอดุอาอ์ให้พวกท่าน เดินบนทางเดิน ไม่เหยียบหรือนั่งบนหลุมศพ'
          : 'อัลบะเกียะอ์เป็นที่ฝังศพของภรรยาและลูกหลานของท่านนบี ﷺ และเศาะฮาบะฮ์จำนวนมาก ผู้หญิงมักให้สลามและขอดุอาอ์จากหน้ากำแพงสุสานตามระเบียบของสถานที่', 'ok');
        ctx.hint('ครบภารกิจแล้ว กด "ไปต่อ" หรือจะนั่งรถบัสไปมัสยิดกุบาอ์ / อุฮุดก่อนก็ได้');
        ctx.after(8, () => ctx.toast('ถ้าต้องการ ลองนั่งรถบัสไปมัสยิดกุบาอ์หรืออุฮุด (ไม่บังคับ)', 'info'));
      }, { label: 'สุสานอัลบะเกียะอ์' });
    };

    // Optional bus trips: Quba and Uhud (not counted).
    let tripBtns: ActionHandle[] = [];
    let qubaRing = false, qubaArrived = false, qubaPrayed = false, uhudRing = false, uhudDone = false;
    const clearTrip = () => { tripBtns.forEach((b) => b.remove()); tripBtns = []; };
    const nabawiButtons = () => {
      clearTrip();
      tripBtns.push(ctx.action('🚌 ไปมัสยิดกุบาอ์ (ไม่บังคับ)', () => goTo('quba')));
      tripBtns.push(ctx.action('🚌 ไปอุฮุด (ไม่บังคับ)', () => goTo('uhud')));
    };
    const goTo = (where: Area) => {
      if (ctx.player.frozen) return;
      clearTrip();
      const caption = where === 'quba' ? '🚌 นั่งรถบัสไปมัสยิดกุบาอ์ (ประมาณ 3–4 กม. ทางใต้ของมัสยิดนะบะวี)'
        : where === 'uhud' ? '🚌 นั่งรถบัสไปภูเขาอุฮุด (ประมาณ 5 กม. ทางเหนือของมัสยิดนะบะวี)'
          : '🚌 นั่งรถบัสกลับมัสยิดนะบะวี';
      travel(ctx, caption, () => {
        area = where;
        if (where === 'nabawi') {
          place(ctx, N.busStop, 0, zone, nab.shape);
          nabawiButtons();
          return;
        }
        if (where === 'quba') {
          place(ctx, { x: QUBA_AT.x + QUBA.start.x, z: QUBA_AT.z + QUBA.start.z }, 0, zone, quba.shape);
          visitQuba();
        } else {
          place(ctx, { x: UHUD_AT.x + UHUD.start.x, z: UHUD_AT.z + UHUD.start.z }, Math.PI, zone, uhud.shape);
          visitUhud();
        }
        tripBtns.push(ctx.action('🚌 กลับมัสยิดนะบะวี', () => goTo('nabawi')));
      });
    };
    const offerQubaPrayer = () => {
      const b = ctx.action('🕌 ละหมาด 2 ร็อกอะฮ์ที่มัสยิดกุบาอ์', () => {
        if (area !== 'quba' || ctx.player.frozen) return;
        b.remove();
        pray(ctx, QUBA_PRAYER, 0, () => {
          qubaPrayed = true;
          ctx.toast('ละหมาดที่มัสยิดกุบาอ์แล้ว ขออัลลอฮ์ทรงตอบรับ กด "กลับมัสยิดนะบะวี" เมื่อพร้อม', 'ok');
        });
      });
      tripBtns.push(b);
    };
    const visitQuba = () => {
      const d = { x: QUBA_AT.x + QUBA.door.x, z: QUBA_AT.z + QUBA.door.z };
      subGoal = qubaArrived ? null : d;
      if (qubaArrived) { if (!qubaPrayed) offerQubaPrayer(); return; }
      if (qubaRing) return;
      qubaRing = true;
      ctx.rings.add(d.x, d.z, 1.6, () => {
        qubaArrived = true;
        subGoal = null;
        ctx.dua('quba_hadith');
        ctx.toast('มัสยิดกุบาอ์เป็นมัสยิดหลังแรกที่ท่านนบี ﷺ สร้างเมื่ออพยพมาถึงมะดีนะฮ์ ซุนนะฮ์ให้อาบน้ำละหมาดจากที่พักแล้วมาละหมาดที่นี่', 'info');
        if (area === 'quba') offerQubaPrayer();
      }, { label: 'มัสยิดกุบาอ์', color: RING.secondary });
    };
    const visitUhud = () => {
      const f = { x: UHUD_AT.x + UHUD.fence.x, z: UHUD_AT.z + UHUD.fence.z };
      subGoal = uhudDone ? null : f;
      if (uhudRing) return;
      uhudRing = true;
      ctx.rings.add(f.x, f.z, 1.4, () => {
        uhudDone = true;
        subGoal = null;
        ctx.dua('graves_visit');
        ctx.toast('ที่นี่คือสุสานของเหล่าชะฮีดในสงครามอุฮุด (ปี ฮ.ศ. 3) รวมถึงท่านฮัมซะฮ์ ลุงของท่านนบี ﷺ ให้สลามและขอดุอาอ์ให้พวกท่าน เนินเล็กด้านข้างคือเนินที่ท่านนบี ﷺ ให้นักยิงธนูประจำการ', 'info');
      }, { label: 'สุสานชุฮะดาอ์อุฮุด', color: RING.secondary });
    };
    nabawiButtons();

    return {
      mission: {
        label: 'ซิยาเราะฮ์มัสยิดนะบะวี',
        text: 'เข้ามัสยิดด้วยเท้าขวา → ละหมาด 2 ร็อกอะฮ์ที่อัรเราเฎาะฮ์ → ให้สลามแด่ท่านนบี ﷺ → เยี่ยมสุสานอัลบะเกียะอ์',
        hint: 'เดินตามลูกศรไปที่ประตูมัสยิด',
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
