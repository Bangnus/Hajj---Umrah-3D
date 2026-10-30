import { RING } from '../../../engine/rings';
import { ARAFAH, buildArafah } from '../../../world/arafah';
import { QIBLA_WEST } from '../../../world/hajjCommon';
import type { Profile, StageDef } from '../../types';
import { onFrame, praySequence, skyClock } from './common';
import { tr } from '../../../i18n';

const WUQUF_SEC = 36;

export function hajjArafah(_p: Profile): StageDef {
  return {
    id: 'hajjArafah',
    icon: '⛰️',
    title: tr('วุกูฟที่อะรอฟะฮ์'),
    arabic: 'يوم عرفة',
    desc: tr('วันที่ 9 ซุลหิจญะฮ์ การวุกูฟ (อยู่) ที่ทุ่งอะรอฟะฮ์เป็นรุก่นที่สำคัญที่สุดของฮัจญ์ ท่านนบี ﷺ กล่าวว่า "ฮัจญ์คืออะรอฟะฮ์" เข้าเขตอะรอฟะฮ์ ละหมาดซุฮ์ริและอัศริรวมกันและย่อในเวลาซุฮ์ริ แล้วหันหน้าไปทางกิบลัตขอดุอาอ์จนดวงอาทิตย์ตก'),
    tip: () => tr('เวลาวุกูฟเริ่มตั้งแต่ตะวันคล้อยวันที่ 9 ถึงรุ่งอรุณวันที่ 10 ซุนนะฮ์ให้อยู่จนดวงอาทิตย์ตกแล้วจึงออก (บางมัซฮับถือว่าเป็นวาญิบ) ต้องแน่ใจว่าอยู่ภายในเขตอะรอฟะฮ์ตามป้าย ส่วนหน้าของมัสยิดนะมิเราะฮ์อยู่นอกเขต และไม่จำเป็นต้องขึ้นภูเขาเราะห์มะฮ์ ขอดุอาอ์ด้วยภาษาไทยได้'),
    outfit: 'ihram',
    build(ctx) {
      ctx.add(buildArafah({ quality: ctx.quality }));
      const sky = skyClock(ctx, 0.47);
      let entered = false, prayed = false, sunset = false, warnCd = 0;
      const p = ctx.player.pos;

      const enter = () => {
        if (entered) return;
        entered = true;
        ctx.progress();
        ctx.toast(tr('คุณอยู่ในเขตอะรอฟะฮ์แล้ว'), 'ok');
        ctx.hint(tr('ไปที่ที่พักของคณะ (เต็นท์ทางขวาของถนน)'));
        gate.remove();
        ctx.guide(ARAFAH.camp);
      };
      const gate = ctx.rings.add(ARAFAH.gate.x, ARAFAH.gate.z, 4, enter, { label: tr('เข้าเขตอะรอฟะฮ์') });

      ctx.rings.add(ARAFAH.camp.x, ARAFAH.camp.z, 2, () => {
        if (!entered) enter();
        ctx.guide(null);
        ctx.toast(tr('ตะวันคล้อยแล้ว ได้เวลาซุฮ์ริ'), 'info');
        sky.to(0.54, 2);
        praySequence(ctx, [
          { name: tr('ซุฮ์ริ'), rakaat: 2, note: tr('รวมซุฮ์ริกับอัศริในเวลาซุฮ์ริ (ญัมอ์ตักดีม) และย่อเหลือเวลาละ 2 ร็อกอะฮ์ อะซานครั้งเดียว อิกอมะฮ์สองครั้ง') },
          { name: tr('อัศริ'), rakaat: 2, note: tr('ละหมาดอัศริต่อทันทีหลังซุฮ์ริ โดยอิกอมะฮ์ใหม่') },
        ], {
          qiblaYaw: QIBLA_WEST,
          heading: tr('รวมและย่อ'),
          label: (s) => tr('🕌 ละหมาด{name} 2 ร็อกอะฮ์ (รวม + ย่อ)', { name: s.name }),
          onDone: () => {
            prayed = true;
            ctx.progress();
            ctx.hint(tr('เริ่มวุกูฟ: หันหน้าไปทางกิบลัต ยกมือขอดุอาอ์จนดวงอาทิตย์ตก'));
            const w = ctx.action(tr('🤲 เริ่มวุกูฟ — หันหน้าไปทางกิบลัตแล้วขอดุอาอ์'), () => {
              w.remove();
              startWuquf();
            });
          },
        });
      }, { label: tr('ที่พักคณะ — ละหมาดและวุกูฟ') });

      const startWuquf = () => {
        const pl = ctx.player;
        pl.yaw = QIBLA_WEST;
        pl.frozen = true;
        pl.setPose('sit');
        ctx.dua('arafah_best_dua');
        const t0 = sky.t, t1 = 1.03;
        const label = () => tr('🤲 กำลังวุกูฟ… อีก {n} วินาทีดวงอาทิตย์จะตก', { n: Math.max(1, Math.ceil(((t1 - sky.t) / (t1 - t0)) * WUQUF_SEC)) });
        const bar = ctx.action(label(), () => undefined);
        bar.setEnabled(false);
        let shown = '';
        onFrame(ctx, () => { if (sunset) return; const l = label(); if (l !== shown) { shown = l; bar.setLabel(l); } });
        ctx.after(7, () => ctx.toast(tr('ขอดุอาอ์ให้ตัวเอง พ่อแม่ ครอบครัว และมุสลิมทุกคน จะใช้ภาษาไทยก็ได้'), 'info'));
        ctx.after(13, () => ctx.dua('sayyid_istighfar'));
        ctx.after(21, () => ctx.toast(tr('ไม่มีวันใดที่อัลลอฮ์ทรงปลดปล่อยบ่าวจากไฟนรกมากไปกว่าวันอะรอฟะฮ์ (มุสลิม 1348)'), 'info'));
        ctx.after(28, () => ctx.toast(tr('กล่าวตัลบิยะฮ์ ซิกร์ และขออภัยโทษต่อไปจนดวงอาทิตย์ลับขอบฟ้า'), 'info'));
        sky.to(t1, WUQUF_SEC, () => {
          sunset = true;
          bar.remove();
          pl.setPose('stand');
          pl.frozen = false;
          ctx.progress();
          ctx.toast(tr('ดวงอาทิตย์ตกแล้ว ออกเดินทางไปมุซดะลิฟะฮ์อย่างสงบ ยังไม่ต้องละหมาดมัฆริบที่นี่'), 'ok');
          ctx.hint(tr('เดินออกจากเขตอะรอฟะฮ์ไปขึ้นรถไปมุซดะลิฟะฮ์'));
          sky.to(1.12, 20);
          ctx.rings.add(ARAFAH.exit.x, ARAFAH.exit.z, 3, () => {
            ctx.progress();
            ctx.toast(tr('ออกจากอะรอฟะฮ์แล้ว มุ่งหน้าไปมุซดะลิฟะฮ์ ระหว่างทางกล่าวตัลบิยะฮ์และซิกร์'), 'ok');
          }, { label: tr('ไปมุซดะลิฟะฮ์'), color: RING.secondary });
          ctx.guide(ARAFAH.exit);
        });
      };

      onFrame(ctx, (dt) => {
        warnCd -= dt;
        if (!entered && p.z < ARAFAH.boundaryZ - 1) enter();
        if (entered && !sunset && p.z > ARAFAH.boundaryZ + 0.5 && warnCd <= 0) {
          warnCd = 8;
          ctx.toast(prayed
            ? tr('อย่าออกนอกเขตอะรอฟะฮ์ก่อนดวงอาทิตย์ตก กลับเข้ามาในเขต')
            : tr('คุณออกนอกเขตอะรอฟะฮ์แล้ว การวุกูฟต้องอยู่ภายในเขตตามป้าย'), 'warn');
        }
      });

      return {
        mission: { label: tr('วุกูฟที่อะรอฟะฮ์'), text: tr('เข้าเขตอะรอฟะฮ์ ละหมาดซุฮ์ริและอัศริรวมกัน วุกูฟขอดุอาอ์จนดวงอาทิตย์ตก แล้วจึงออกเดินทาง'), hint: tr('เดินตามถนนผ่านป้ายสีเหลืองเข้าเขตอะรอฟะฮ์'), total: 4 },
        start: { x: ARAFAH.start.x, z: ARAFAH.start.z, yaw: Math.PI },
        camYaw: 0,
      };
    },
  };
}
