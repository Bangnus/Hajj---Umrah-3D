import { RING } from '../../../engine/rings';
import { JAMARAT, buildJamarat, jamrah, type JamrahKey } from '../../../world/jamarat';
import { QIBLA_WEST } from '../../../world/hajjCommon';
import { behind } from '../util';
import type { ActionHandle, Profile, StageDef } from '../../types';
import { afterShave, skyClock, timedDua } from './common';
import { pebbleFx, throwStation } from './jamrah';

const ORDER: JamrahKey[] = ['sughra', 'wusta', 'aqabah'];
const ORDER_TH = ['ต้นแรก (เล็ก)', 'ต้นกลาง', 'ต้นสุดท้าย (ใหญ่)'];
/** After the zenith (zawal): throwing on the days of tashriq starts after midday. */
const AFTER_ZAWAL = 0.58;

export function hajjTasyriq(_p: Profile): StageDef {
  return {
    id: 'hajjTasyriq',
    icon: '📿',
    title: 'วันตัชรีก: ขว้างเสาหิน 3 ต้น',
    arabic: 'أيام التشريق',
    desc: 'วันที่ 11, 12 (และ 13) ซุลหิจญะฮ์ พักค้างคืนที่มีนา และทุกวันหลังตะวันคล้อย ขว้างญัมเราะฮ์ทั้งสามต้น ต้นละ 7 ก้อน เรียงลำดับ ศุฆรอ → วุสฏอ → อะกอบะฮ์ หลังขว้างศุฆรอและวุสฏอ ให้ก้าวออกไปด้านข้าง หันหน้าไปทางกิบลัตและขอดุอาอ์ แต่หลังอะกอบะฮ์ไม่ต้องหยุด',
    tip: () => 'ถ้าจะออกจากมีนาหลังขว้างวันที่ 12 (นะฟัรเอาวัล) ต้องออกก่อนดวงอาทิตย์ตก ถ้าดวงอาทิตย์ตกขณะยังอยู่ในมีนา ต้องค้างคืนและขว้างวันที่ 13 ด้วย (นะฟัรษานี) การอยู่ถึงวันที่ 13 ดีกว่า ผู้ที่ไม่สามารถขว้างเองได้ (เช่น ป่วย ชรา) มอบหมายให้ผู้อื่นขว้างแทนได้',
    outfit: 'travel',
    build(ctx) {
      ctx.add(buildJamarat({ quality: ctx.quality }));
      afterShave(ctx);
      const sky = skyClock(ctx, AFTER_ZAWAL);
      const fx = pebbleFx(ctx);
      let day = 11;
      let counting = true;
      let exited = false;
      let exitRing: { remove(): void } | null = null;

      const startDay = () => {
        counting = day <= 12;
        ctx.toast(`วันที่ ${day} ซุลหิจญะฮ์ — ตะวันคล้อยแล้ว ได้เวลาขว้างเสาหิน`, 'info');
        throwAt(0);
      };

      const throwAt = (k: number) => {
        const j = jamrah(ORDER[k]);
        ctx.hint(`วันที่ ${day}: ขว้าง${j.name} ${ORDER_TH[k]} 7 ก้อน (${k + 1}/3)`);
        throwStation(ctx, fx, j, {
          onThrow: (n) => {
            if (counting) ctx.progress();
            if (n === 1 && k === 0 && day === 11) ctx.dua('jamarat_takbir');
          },
          onDone: () => (k < 2 ? duaStop(k) : afterAqabah()),
        });
      };

      const duaStop = (k: number) => {
        const j = jamrah(ORDER[k]);
        const spot = { x: j.x - JAMARAT.basin.rx - 5, z: 13.5 };
        ctx.toast('ก้าวออกไปด้านข้างให้พ้นทางคนอื่น หันหน้าไปทางกิบลัตแล้วยกมือขอดุอาอ์', 'info');
        ctx.hint('เดินไปที่วงแหวนด้านข้าง แล้วขอดุอาอ์ก่อนไปต้นถัดไป');
        ctx.guide(spot);
        ctx.rings.add(spot.x, spot.z, 1.6, () => {
          timedDua(ctx, {
            qiblaYaw: QIBLA_WEST, sec: 8,
            label: '🤲 กำลังขอดุอาอ์',
            doneLabel: 'เสร็จสิ้นการขอดุอาอ์ ✓',
            onDone: () => throwAt(k + 1),
          });
        }, { label: 'ยืนขอดุอาอ์ หันหน้าไปทางกิบลัต' });
      };

      const afterAqabah = () => {
        ctx.toast('หลังญัมเราะฮ์อะกอบะฮ์ไม่ต้องหยุดขอดุอาอ์ เดินออกไปได้เลย', 'info');
        if (day === 11) { mabit(12); return; }
        if (day === 12) { choose(); return; }
        leave(false);
      };

      const mabit = (next: number) => {
        ctx.hint('กลับไปค้างคืนที่เต็นท์ในมีนา');
        ctx.guide(JAMARAT.minaReturn);
        ctx.rings.add(JAMARAT.minaReturn.x, JAMARAT.minaReturn.z, 2, () => {
          ctx.guide(null);
          const btn = ctx.action('🌙 ค้างคืนที่มีนา (มะบีต)', () => {
            btn.remove();
            const pl = ctx.player;
            pl.frozen = true;
            pl.setPose('sit');
            ctx.toast('ค้างคืนที่มีนา… (คืนวันตัชรีก ต้องอยู่ที่มีนาเกินครึ่งคืน)', 'info');
            sky.to(1.5, 3, () => {
              // Next morning: back at the camp end of the bridge.
              pl.pos.set(JAMARAT.eastStart.x, 0, JAMARAT.eastStart.z);
              pl.yaw = QIBLA_WEST;
              ctx.input.yaw = behind(QIBLA_WEST);
              sky.to(0.2, 4, () => {
                pl.setPose('stand');
                ctx.toast(`เช้าวันที่ ${next} — รอจนตะวันคล้อย (หลังเที่ยง) จึงไปขว้าง`, 'info');
                ctx.dua('takbir_tashriq');
                sky.to(AFTER_ZAWAL, 3, () => {
                  pl.frozen = false;
                  day = next;
                  startDay();
                });
              });
            });
          });
        }, { label: 'กลับที่พักในมีนา (ค้างคืน)', color: RING.secondary });
      };

      const choose = () => {
        ctx.hint('เลือก: ออกจากมีนาวันนี้ก่อนดวงอาทิตย์ตก หรืออยู่ต่อถึงวันที่ 13');
        const btns: ActionHandle[] = [];
        const clear = () => btns.forEach((b) => b.remove());
        btns.push(ctx.action('🚌 นะฟัรเอาวัล: ออกจากมีนาวันนี้ก่อนดวงอาทิตย์ตก', () => {
          clear();
          leave(true);
          ctx.toast('รีบออกจากมีนาก่อนดวงอาทิตย์ตก เดินไปทางออกฝั่งมักกะฮ์', 'info');
          sky.to(1.02, 45, () => {
            if (exited) return;
            ctx.toast('ดวงอาทิตย์ตกขณะคุณยังอยู่ในมีนา จึงต้องค้างคืนและขว้างวันที่ 13 ด้วย', 'warn');
            exitRing?.remove();
            exitRing = null;
            mabit(13);
          });
        }));
        btns.push(ctx.action('⛺ อยู่ต่อ: ค้างคืนแล้วขว้างวันที่ 13 (นะฟัรษานี)', () => {
          clear();
          ctx.toast('อยู่ถึงวันที่ 13 เป็นสิ่งที่ดีกว่า ตามแบบอย่างของท่านนบี ﷺ', 'ok');
          mabit(13);
        }));
      };

      const leave = (early: boolean) => {
        ctx.hint('เดินไปทางออกฝั่งมักกะฮ์ เพื่อออกจากมีนา');
        ctx.guide(JAMARAT.exitWest);
        exitRing = ctx.rings.add(JAMARAT.exitWest.x, JAMARAT.exitWest.z, 2.4, () => {
          exited = true;
          ctx.guide(null);
          ctx.progress();
          ctx.toast(early
            ? 'ออกจากมีนาก่อนดวงอาทิตย์ตกแล้ว (นะฟัรเอาวัล) ก่อนเดินทางกลับบ้าน อย่าลืมเฏาะวาฟวะดาอ์'
            : 'ขว้างครบ 3 วันแล้ว ออกจากมีนา (นะฟัรษานี) ก่อนเดินทางกลับบ้าน อย่าลืมเฏาะวาฟวะดาอ์', 'ok');
        }, { label: 'ออกจากมีนา → มักกะฮ์', color: RING.secondary });
      };

      ctx.after(1, () => ctx.dua('takbir_tashriq'));
      ctx.after(1.5, startDay);

      return {
        mission: {
          label: 'ขว้างเสาหินวันตัชรีก',
          text: 'วันที่ 11 และ 12 ขว้าง 3 ต้น ต้นละ 7 ก้อน (นับวันละ 21 ก้อน) แล้วเลือกออกก่อนดวงอาทิตย์ตก หรืออยู่ต่อถึงวันที่ 13',
          hint: 'เดินไปที่วงแหวนจุดขว้างญัมเราะฮ์ศุฆรอ (ต้นแรก)',
          total: 2 * 21 + 1,
        },
        start: { x: JAMARAT.eastStart.x, z: JAMARAT.eastStart.z, yaw: QIBLA_WEST },
        camYaw: behind(QIBLA_WEST),
      };
    },
  };
}
