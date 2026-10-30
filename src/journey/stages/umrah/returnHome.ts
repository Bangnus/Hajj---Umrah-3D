import { buildHaram, polar } from '../../../world/haram';
import { NABAWI, buildNabawi } from '../../../world/madinah';
import { Zone, label, relocate, sign } from '../../../world/props';
import { AIRPORT, buildAirport, buildHome } from '../../../world/simple';
import type { StageDef } from '../../types';
import { behind, faceToward } from '../util';
import { place, travel } from './stageKit';

/** Areas of this stage, far apart so only one is ever visible. */
const AIR_AT = { x: 3000, z: 0 };
const HOME_AT = { x: -3000, z: 0 };

const WADA_TIP = 'ก่อนออกจากมักกะฮ์ ให้เฏาะวาฟวะดาอ์ (เฏาะวาฟอำลา) 7 รอบเป็นสิ่งสุดท้าย ตามมัซฮับชาฟิอีย์ถือว่าเป็นวาญิบสำหรับผู้ที่จะเดินทางออกจากมักกะฮ์ '
  + 'ผู้ที่ละทิ้งโดยไม่มีเหตุผลอันควรต้องเสียดัม ผู้หญิงที่มีประจำเดือนได้รับการยกเว้น หลังเฏาะวาฟวะดาอ์ไม่ควรอยู่ในมักกะฮ์นานโดยไม่จำเป็น '
  + '(รายละเอียดควรสอบถามผู้รู้หรือหัวหน้าคณะ)';

/** In the Madinah-first route the journey ends in Makkah; otherwise it ends in Madinah. */
const leavesMakkah = (route: string) => route === 'madinah-first';

export const returnHome: StageDef = {
  id: 'returnHome',
  icon: '🏡',
  title: 'เดินทางกลับบ้าน',
  arabic: 'العودة إلى الوطن',
  desc: 'อำลาเมืองศักดิ์สิทธิ์ เดินทางไปสนามบิน แล้วกลับถึงบ้านที่ประเทศไทยอย่างปลอดภัย',
  tip: (p) => leavesMakkah(p.route)
    ? WADA_TIP
    : 'เฏาะวาฟวะดาอ์ทำก่อนออกจากมักกะฮ์ (ก่อนเดินทางมามะดีนะฮ์) ที่มะดีนะฮ์ไม่มีเฏาะวาฟอำลา ก่อนออกจากมัสยิดนะบะวีให้ก้าวเท้าซ้ายออกพร้อมกล่าวดุอาอ์ออกจากมัสยิด',
  outfit: 'travel',
  build(ctx) {
    const low = ctx.quality === 'low';
    const fromMakkah = leavesMakkah(ctx.profile.route);
    const zone = new Zone();
    const fare = relocate(fromMakkah
      ? buildHaram({ floorLine: false, crowd: low ? 70 : 160 })
      : buildNabawi({ crowd: low ? 50 : 110, quality: ctx.quality }), 0, 0);
    const air = relocate(buildAirport(), AIR_AT.x, AIR_AT.z);
    const home = relocate(buildHome(), HOME_AT.x, HOME_AT.z);
    ctx.add(fare.scene);
    ctx.add(air.scene);
    ctx.add(home.scene);
    ctx.player.colliders.push(zone.collider);
    zone.set(fare.shape);
    // Return flight: cover the gate sign and name the departure airport.
    sign(air.scene.group, ['ประตู 14  ✈  กรุงเทพฯ'], 4.3, 1.5, 0, 4.5, -18.42, 0, '#11302a', '#f2d06b');
    label(air.scene.group, fromMakkah ? 'สนามบินนานาชาติคิงอับดุลอะซีซ เจดดาห์' : 'สนามบินนานาชาติมะดีนะฮ์', 0, 6.5, 10, 0.9);

    // (a) Farewell.
    const start = fromMakkah ? polar(27, -0.75) : { x: 0, z: -12 };
    const startYaw = fromMakkah ? faceToward(start, { x: 0, z: 0 }) : Math.PI;
    const fw = fromMakkah ? polar(15, -0.75) : NABAWI.door;
    ctx.rings.add(fw.x, fw.z, 1.6, () => {
      ctx.progress();
      if (fromMakkah) {
        ctx.dua('guidance_wada_multazam');
        ctx.toast('ก่อนออกจากมักกะฮ์ ให้เฏาะวาฟวะดาอ์ 7 รอบเป็นสิ่งสุดท้าย (ในเกมนี้ไม่จำลองการเดินรอบซ้ำ) แล้วขอดุอาอ์ให้ได้กลับมาอีก', 'info');
      } else {
        ctx.dua('masjid_exit');
        ctx.toast('ก้าวเท้าซ้ายออกจากมัสยิดนะบะวี และขอดุอาอ์ให้ได้กลับมาเยือนอีก', 'info');
      }
      ctx.hint('กดปุ่ม "เดินทางไปสนามบิน" เมื่อพร้อม');
      const b = ctx.action('🚌 เดินทางไปสนามบิน', () => {
        if (ctx.player.frozen) return;
        b.remove();
        travel(ctx, fromMakkah ? '🚌 เดินทางจากมักกะฮ์ไปสนามบินเจดดาห์…' : '🚌 เดินทางไปสนามบินมะดีนะฮ์…', () => {
          place(ctx, { x: AIR_AT.x + AIRPORT.start.x, z: AIR_AT.z + AIRPORT.start.z }, Math.PI, zone, air.shape);
          gate();
        });
      });
    }, { label: fromMakkah ? 'อำลาบัยตุลลอฮ์' : 'ประตูมัสยิด — ก้าวเท้าซ้ายออก' });

    // (b) Board the flight home.
    const gate = () => {
      const g = AIRPORT.steps[AIRPORT.steps.length - 1];
      ctx.hint('ทำเช็กอินเรียบร้อยแล้ว เดินไปที่ประตูขึ้นเครื่อง 14');
      ctx.rings.add(AIR_AT.x + g.x, AIR_AT.z + g.z, 1.5, () => {
        ctx.progress();
        ctx.dua('safar');
        ctx.toast('ขึ้นเครื่องแล้ว ขอให้เดินทางกลับโดยปลอดภัย', 'ok');
        ctx.hint('กดปุ่ม "บินกลับประเทศไทย"');
        const b = ctx.action('✈ บินกลับประเทศไทย', () => {
          if (ctx.player.frozen) return;
          b.remove();
          travel(ctx, '✈ กำลังบินกลับประเทศไทย…', () => {
            const sp = { x: HOME_AT.x - 1.5, z: -10.5 };
            place(ctx, sp, faceToward(sp, { x: HOME_AT.x, z: -5 }), zone, home.shape);
            arrive();
          }, 2.4);
        });
      }, { label: 'ประตูขึ้นเครื่อง 14' });
    };

    // (c) Home.
    const arrive = () => {
      ctx.hint('เดินไปที่ประตูบ้าน');
      ctx.after(0.8, () => ctx.toast('ถึงประเทศไทยแล้ว อัลฮัมดุลิลลาฮ์', 'ok'));
      ctx.rings.add(HOME_AT.x, -5.8, 1.1, () => {
        ctx.progress();
        ctx.dua('return_home');
        const name = ctx.profile.name.trim();
        ctx.toast(`ยินดีต้อนรับกลับบ้าน${name ? ` คุณ${name}` : ''} ขออัลลอฮ์ทรงตอบรับการเดินทางของคุณ`, 'ok');
        ctx.after(6, () => ctx.toast('ขอให้รักษาความรู้สึกดี ๆ จากการเดินทางนี้ไว้ ทั้งการละหมาดตรงเวลา ความอดทน และการทำความดี (ซุนนะฮ์เมื่อกลับถึงบ้านเกิดคือแวะละหมาด 2 ร็อกอะฮ์ที่มัสยิดก่อนเข้าบ้าน)', 'info'));
      }, { label: 'ประตูบ้าน' });
    };

    return {
      mission: {
        label: 'กลับบ้าน',
        text: fromMakkah
          ? 'อำลามัสยิดอัลฮะรอม → ขึ้นเครื่องที่สนามบินเจดดาห์ → เดินกลับเข้าบ้านที่ประเทศไทย'
          : 'อำลามัสยิดนะบะวี → ขึ้นเครื่องที่สนามบินมะดีนะฮ์ → เดินกลับเข้าบ้านที่ประเทศไทย',
        hint: fromMakkah ? 'เดินไปที่วงแหวนใกล้กะอ์บะฮ์' : 'เดินไปที่ประตูมัสยิดทางทิศเหนือ',
        total: 3,
      },
      start: { x: start.x, z: start.z, yaw: startYaw },
      camYaw: behind(startYaw),
    };
  },
};
