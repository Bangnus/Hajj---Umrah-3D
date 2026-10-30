import { RING } from '../engine/rings';
import { buildHaram, polar, SPOTS, STONE_ANGLE, YAMANI_ANGLE } from '../world/haram';
import { buildMasa, MASA } from '../world/masa';
import { AIRPORT, buildAirport, buildCabin, buildHome, buildPlaza, CABIN, HOME, PLAZA } from '../world/simple';
import type { StageDef } from './types';
import { PRAYER_BEATS } from './prayer';

const TAU = Math.PI * 2;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const faceToward = (from: { x: number; z: number }, to: { x: number; z: number }) => Math.atan2(to.x - from.x, to.z - from.z);
/** Camera yaw that puts the camera behind a player facing `yaw`. */
const behind = (yaw: number) => yaw + Math.PI;

export const STAGES: StageDef[] = [
  {
    id: 'preparation',
    icon: '🧳',
    title: 'เตรียมตัวที่บ้าน',
    arabic: 'الاستعداد',
    desc: 'ก่อนออกเดินทาง ตั้งเจตนาให้บริสุทธิ์เพื่ออัลลอฮ์ ชำระหนี้สิน ขออภัยคนรอบข้าง แล้วจัดกระเป๋าให้พร้อม',
    tip: (p) => p.gender === 'male'
      ? 'ผู้ชายเตรียมผ้าอิห์รอมสีขาว 2 ผืน (ผ้านุ่งและผ้าคลุม) ที่ไม่ได้ตัดเย็บเป็นรูปทรงเสื้อหรือกางเกง เข็มขัดใส่เงิน และรองเท้าแตะที่ไม่หุ้มส้นและหลังเท้า'
      : 'ผู้หญิงไม่มีชุดอิห์รอมเฉพาะ ใช้เสื้อผ้าที่ปกปิดมิดชิดตามปกติ แต่ขณะครองอิห์รอมห้ามสวมนิกอบ (ผ้าปิดหน้า) และถุงมือ',
    outfit: 'travel',
    build(ctx) {
      ctx.add(buildHome());
      const items = ctx.profile.gender === 'male'
        ? ['หนังสือเดินทาง', 'ผ้าอิห์รอม 2 ผืน', 'เข็มขัดอิห์รอม', 'สบู่ไม่มีกลิ่น', 'รองเท้าแตะ']
        : ['หนังสือเดินทาง', 'ชุดคลุมและฮิญาบ', 'กรรไกรเล็ก (ไว้ตะฮัลลุล)', 'ของใช้ไม่มีกลิ่น', 'ผ้าละหมาด'];
      let packed = 0;
      items.forEach((name, i) => {
        const s = HOME.items[i];
        ctx.rings.add(s.x, s.z, 0.9, () => {
          packed++;
          ctx.progress();
          ctx.toast(`เก็บ${name}แล้ว (${packed}/5)`, 'ok');
          if (packed === 5) { ctx.hint('ครบแล้ว เดินออกทางประตูไปขึ้นรถ'); ctx.guide(HOME.door); }
        }, { label: name });
      });
      ctx.rings.add(HOME.outside.x, HOME.outside.z, 1.4, () => {
        if (packed < 5) { ctx.toast('เก็บของให้ครบ 5 อย่างก่อนออกจากบ้าน', 'warn'); return false; }
        ctx.progress();
        ctx.dua('leave_home');
      }, { label: 'ออกจากบ้าน', color: RING.secondary, persistent: false });
      ctx.after(1.2, () => ctx.dua('farewell_traveler'));
      return {
        mission: { label: 'จัดกระเป๋า', text: 'เดินเข้าวงแหวนสีเขียวเพื่อเก็บของ 5 อย่าง แล้วเดินออกจากบ้าน', hint: 'เดินเข้าวงแหวนสีเขียว', total: 6 },
        start: { x: 0, z: -2, yaw: Math.PI },
        camYaw: 0,
        camDist: 4.5,
      };
    },
  },
  {
    id: 'airport',
    icon: '✈️',
    title: 'สนามบิน',
    arabic: 'المطار',
    desc: 'เช็กอิน ผ่านตรวจคนเข้าเมืองและจุดตรวจความปลอดภัย แล้วไปที่ประตูขึ้นเครื่อง',
    tip: () => 'เก็บหนังสือเดินทางและบัตรขึ้นเครื่องไว้ในที่หยิบง่าย ผู้ชายหลายคนครองผ้าอิห์รอมตั้งแต่สนามบิน แต่ยังไม่เนียตจนกว่าจะถึงมีกอต',
    outfit: 'travel',
    build(ctx) {
      ctx.add(buildAirport());
      const next = (i: number) => {
        const s = AIRPORT.steps[i];
        ctx.rings.add(s.x, s.z, 1.5, () => {
          ctx.progress();
          if (i < AIRPORT.steps.length - 1) { ctx.toast(`ผ่าน${s.label}แล้ว`, 'ok'); next(i + 1); }
          else { ctx.toast('ขึ้นเครื่องแล้ว ขอให้เดินทางปลอดภัย', 'ok'); ctx.dua('safar'); }
        }, { label: s.label });
      };
      next(0);
      return {
        mission: { label: 'ขึ้นเครื่อง', text: 'ทำตามลำดับ: เช็กอิน → ตรวจคนเข้าเมือง → ตรวจความปลอดภัย → ประตูขึ้นเครื่อง', hint: 'ตามลูกศรไปยังวงแหวนถัดไป', total: 4 },
        start: { x: AIRPORT.start.x, z: AIRPORT.start.z, yaw: Math.PI },
        camYaw: 0,
      };
    },
  },
  {
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
  },
  {
    id: 'tawaf',
    icon: '🕋',
    title: 'เฏาะวาฟ',
    arabic: 'الطواف',
    desc: 'เดินรอบกะอ์บะฮ์ทวนเข็มนาฬิกา 7 รอบ ให้กะอ์บะฮ์อยู่ทางซ้ายมือ เริ่มและจบที่แนวหินดำ ต้องมีน้ำละหมาด (วุฎูอ์) ตลอดเฏาะวาฟ และเดินอ้อมด้านนอกฮิจญ์รอิสมาอีล (กำแพงครึ่งวงกลม) ห้ามตัดเข้าไปข้างใน',
    tip: (p) => (p.gender === 'male'
      ? 'ผู้ชายเปิดไหล่ขวา (อิฎฏิบาอ์) ตลอดเฏาะวาฟ และเดินเร็วก้าวสั้น (ร็อมัล) ใน 3 รอบแรกถ้าทำได้ (กด Shift) '
      : 'ผู้หญิงเดินตามปกติ ไม่ต้องเบียดเข้าใกล้กะอ์บะฮ์หรือหินดำ ')
      + 'ถ้าเสียน้ำละหมาดระหว่างเฏาะวาฟ ให้ไปอาบใหม่แล้วกลับมาเดินต่อจากรอบที่ค้างไว้',
    outfit: 'ihram',
    build(ctx) {
      const haram = buildHaram({ floorLine: ctx.settings.floorLine, crowd: ctx.quality === 'high' ? 360 : 140 });
      ctx.add(haram);
      const p = ctx.player.pos;
      const ang = () => Math.atan2(-p.z, p.x);
      let started = false, acc = 0, prev = 0, laps = 0, back = 0, warnCd = 0, yamaniLap = -1;

      ctx.after(0.8, () => ctx.dua('masjid_enter'));
      ctx.after(6, () => { if (!started) ctx.dua('see_kaabah'); });
      const st = SPOTS.tawafStart;
      ctx.rings.add(st.x, st.z, 1.6, () => {
        started = true;
        prev = ang();
        acc = wrap(prev - STONE_ANGLE);
        ctx.player.raiseHand();
        ctx.toast('เริ่มรอบที่ 1 — หยุดกล่าวตัลบิยะฮ์ แล้วกล่าว บิสมิลลาฮิ วัลลอฮุอักบัร', 'ok');
        ctx.dua('istilam');
        ctx.after(4, () => ctx.dua('tawaf_lap_1'));
        ctx.hint('เดินทวนเข็มนาฬิกา ให้กะอ์บะฮ์อยู่ทางซ้าย');
      }, { label: 'แนวหินดำ — เริ่มเฏาะวาฟ' });

      return {
        mission: { label: 'เฏาะวาฟ 7 รอบ', text: 'ไปที่วงแหวนตรงแนวหินดำเพื่อเริ่ม แล้วเดินทวนเข็มนาฬิกา', hint: 'ไปที่วงแหวนสีเขียวตรงมุมหินดำ', total: 7 },
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
            } else {
              ctx.toast('ครบ 7 รอบแล้ว อัลฮัมดุลิลลาฮ์', 'ok');
              ctx.guide(SPOTS.maqam);
              if (ctx.profile.gender === 'male') ctx.after(2.5, () => ctx.toast('ผู้ชายคลุมไหล่ขวากลับตามเดิมหลังเฏาะวาฟ', 'info'));
            }
          }
        },
      };
    },
  },
  {
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
  },
  {
    id: 'sai',
    icon: '⛰️',
    title: 'สะแอ',
    arabic: 'السعي',
    desc: 'เดินระหว่างเนินเศาะฟาและมัรวะฮ์ 7 เที่ยว เริ่มที่เศาะฟา จบที่มัรวะฮ์ (เศาะฟาไปมัรวะฮ์นับเป็น 1 เที่ยว)',
    tip: () => 'ระหว่างไฟเขียวสองจุด ผู้ชายวิ่งเหยาะ ๆ ผู้หญิงเดินตามปกติ ระยะจริงระหว่างเศาะฟาและมัรวะฮ์ประมาณ 400 เมตร ในเกมนี้ย่อให้สั้นลง',
    outfit: 'ihram',
    build(ctx) {
      ctx.add(buildMasa(ctx.quality === 'high' ? 160 : 70));
      let started = false, last: 'safa' | 'marwah' | null = null, legs = 0, inGreen = false, greenShown = false;
      const male = ctx.profile.gender === 'male';
      const reach = (hill: 'safa' | 'marwah') => {
        if (legs >= 7) return false;
        if (!started) {
          if (hill === 'marwah') { ctx.toast('สะแอต้องเริ่มที่เนินเศาะฟา', 'warn'); return false; }
          started = true; last = 'safa';
          ctx.dua('safa_approach');
          ctx.after(5, () => ctx.dua('safa_marwah_dhikr'));
          ctx.hint('เดินไปยังเนินมัรวะฮ์');
          ctx.guide({ x: 0, z: MASA.marwahZ });
          return false;
        }
        if (hill === last) return false;
        legs++; last = hill;
        ctx.progress();
        if (legs < 7) {
          ctx.toast(`ครบเที่ยวที่ ${legs} — ถึง${hill === 'safa' ? 'เศาะฟา' : 'มัรวะฮ์'}`, 'ok');
          ctx.dua('safa_marwah_dhikr');
          ctx.guide({ x: 0, z: hill === 'safa' ? MASA.marwahZ : MASA.safaZ });
        } else {
          ctx.toast('ครบ 7 เที่ยวแล้ว อัลฮัมดุลิลลาฮ์', 'ok');
          ctx.guide(null);
        }
        return false;
      };
      ctx.rings.add(0, MASA.safaZ, 4, () => reach('safa'), { label: 'เศาะฟา', persistent: true });
      ctx.rings.add(0, MASA.marwahZ, 4, () => reach('marwah'), { label: 'มัรวะฮ์', persistent: true, color: RING.secondary });
      ctx.guide({ x: 0, z: MASA.safaZ });
      return {
        mission: { label: 'สะแอ 7 เที่ยว', text: 'เริ่มที่วงแหวนเศาะฟา แล้วเดินไป-กลับระหว่างเศาะฟาและมัรวะฮ์ให้ครบ 7 เที่ยว', hint: 'ไปที่วงแหวนเศาะฟาก่อน', total: 7 },
        start: { x: 5, z: 12, yaw: Math.PI },
        camYaw: 0,
        tick() {
          const z = ctx.player.pos.z;
          const now = z < MASA.green.from && z > MASA.green.to;
          if (now === inGreen) return;
          inGreen = now;
          if (now) {
            if (male) ctx.player.speedMul = 1.5;
            if (!greenShown) {
              greenShown = true;
              ctx.dua('sai_green_lights');
              if (male) ctx.toast('ช่วงไฟเขียว: ผู้ชายวิ่งเหยาะ ๆ', 'info');
            }
          } else {
            ctx.player.speedMul = 1;
          }
        },
      };
    },
  },
  {
    id: 'tahalul',
    icon: '✂️',
    title: 'ตะฮัลลุล',
    arabic: 'التحلل',
    desc: 'โกนหรือตัดผมเพื่อออกจากอิห์รอม เป็นขั้นสุดท้ายของอุมเราะฮ์',
    tip: (p) => p.gender === 'male'
      ? 'ผู้ชายโกนศีรษะดีกว่าตัดสั้น ท่านนบี ﷺ ขอดุอาอ์ให้ผู้ที่โกนถึง 3 ครั้ง (มัซฮับชาฟิอีย์ อย่างน้อยตัด 3 เส้น แต่โกนทั้งศีรษะดีที่สุด)'
      : 'ผู้หญิงตัดปลายผมประมาณหนึ่งข้อนิ้ว ทำในที่มิดชิด ให้มะห์รอมหรือผู้หญิงด้วยกันตัดให้',
    outfit: 'ihram',
    build(ctx) {
      ctx.add(buildPlaza());
      const male = ctx.profile.gender === 'male';
      ctx.rings.add(PLAZA.barber.x, PLAZA.barber.z, 1.5, () => {
        ctx.dua('tahallul_hadith');
        let cuts = 0;
        const label = () => `${male ? '✂️ โกนศีรษะ' : '✂️ ตัดปลายผม'} (อีก ${3 - cuts} ครั้ง)`;
        const btn = ctx.action(label(), () => {
          cuts++;
          ctx.progress();
          if (cuts < 3) { btn.setLabel(label()); return; }
          btn.remove();
          ctx.player.setLook({ hair: male ? 'shaved' : 'trimmed' });
          ctx.after(1.5, () => {
            ctx.player.setLook({ outfit: 'travel' });
            ctx.toast('ออกจากอิห์รอมแล้ว ข้อห้ามทั้งหมดสิ้นสุด อุมเราะฮ์ของคุณสมบูรณ์', 'ok');
          });
        });
      }, { label: 'ร้านตัดผม' });
      return {
        mission: { label: 'ตะฮัลลุล', text: male ? 'เดินไปร้านตัดผม แล้วโกนศีรษะ' : 'เดินไปที่จุดตัดผม แล้วตัดปลายผม', hint: 'เดินไปที่วงแหวนหน้าร้านตัดผม', total: 3 },
        start: { x: PLAZA.start.x, z: PLAZA.start.z, yaw: Math.PI },
        camYaw: 0,
      };
    },
  },
];
