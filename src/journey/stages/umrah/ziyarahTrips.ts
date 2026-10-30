import { RING } from '../../../engine/rings';
import { NABAWI, QUBA, UHUD } from '../../../world/madinah';
import type { Shape, Zone } from '../../../world/props';
import type { ActionHandle, StageCtx } from '../../types';
import { place, pray, travel, twoRakaat } from './stageKit';
import { tr } from '../../../i18n';

/** The optional trips are built far away so they are never visible from the mosque. */
export const QUBA_AT = { x: -2000, z: 0 };
export const UHUD_AT = { x: 2000, z: 0 };

const QUBA_PRAYER = twoRakaat(tr('ละหมาดซุนนะฮ์ตะฮียะตุลมัสยิดที่มัสยิดกุบาอ์'), true);

export type ZiyarahArea = 'nabawi' | 'quba' | 'uhud';

export interface OptionalTripsOpts {
  ctx: StageCtx;
  zone: Zone;
  nabShape: Shape | null;
  qubaShape: Shape | null;
  uhudShape: Shape | null;
  getArea: () => ZiyarahArea;
  setArea: (a: ZiyarahArea) => void;
  setSubGoal: (g: { x: number; z: number } | null) => void;
}

/** Sets up optional non-counted bus trips from Masjid an-Nabawi to Masjid Quba and Mount Uhud. */
export function setupOptionalTrips(o: OptionalTripsOpts) {
  const { ctx, zone, nabShape, qubaShape, uhudShape, getArea, setArea, setSubGoal } = o;
  let tripBtns: ActionHandle[] = [];
  let qubaRing = false, qubaArrived = false, qubaPrayed = false, uhudRing = false, uhudDone = false;

  const clearTrip = () => { tripBtns.forEach((b) => b.remove()); tripBtns = []; };

  const nabawiButtons = () => {
    clearTrip();
    tripBtns.push(ctx.action(tr('🚌 ไปมัสยิดกุบาอ์ (ไม่บังคับ)'), () => goTo('quba')));
    tripBtns.push(ctx.action(tr('🚌 ไปอุฮุด (ไม่บังคับ)'), () => goTo('uhud')));
  };

  const offerQubaPrayer = () => {
    const b = ctx.action(tr('🕌 ละหมาด 2 ร็อกอะฮ์ที่มัสยิดกุบาอ์'), () => {
      if (getArea() !== 'quba' || ctx.player.frozen) return;
      b.remove();
      pray(ctx, QUBA_PRAYER, 0, () => {
        qubaPrayed = true;
        ctx.toast(tr('ละหมาดที่มัสยิดกุบาอ์แล้ว ขออัลลอฮ์ทรงตอบรับ กด "กลับมัสยิดนะบะวี" เมื่อพร้อม'), 'ok');
      });
    });
    tripBtns.push(b);
  };

  const visitQuba = () => {
    const d = { x: QUBA_AT.x + QUBA.door.x, z: QUBA_AT.z + QUBA.door.z };
    setSubGoal(qubaArrived ? null : d);
    if (qubaArrived) { if (!qubaPrayed) offerQubaPrayer(); return; }
    if (qubaRing) return;
    qubaRing = true;
    ctx.rings.add(d.x, d.z, 1.6, () => {
      qubaArrived = true;
      setSubGoal(null);
      ctx.dua('quba_hadith');
      ctx.toast(tr('มัสยิดกุบาอ์เป็นมัสยิดหลังแรกที่ท่านนบี ﷺ สร้างเมื่ออพยพมาถึงมะดีนะฮ์ ซุนนะฮ์ให้อาบน้ำละหมาดจากที่พักแล้วมาละหมาดที่นี่'), 'info');
      if (getArea() === 'quba') offerQubaPrayer();
    }, { label: tr('มัสยิดกุบาอ์'), color: RING.secondary });
  };

  const visitUhud = () => {
    const f = { x: UHUD_AT.x + UHUD.fence.x, z: UHUD_AT.z + UHUD.fence.z };
    setSubGoal(uhudDone ? null : f);
    if (uhudRing) return;
    uhudRing = true;
    ctx.rings.add(f.x, f.z, 1.4, () => {
      uhudDone = true;
      setSubGoal(null);
      ctx.dua('graves_visit');
      ctx.toast(tr('ที่นี่คือสุสานของเหล่าชะฮีดในสงครามอุฮุด (ปี ฮ.ศ. 3) รวมถึงท่านฮัมซะฮ์ ลุงของท่านนบี ﷺ ให้สลามและขอดุอาอ์ให้พวกท่าน เนินเล็กด้านข้างคือเนินที่ท่านนบี ﷺ ให้นักยิงธนูประจำการ'), 'info');
    }, { label: tr('สุสานชุฮะดาอ์อุฮุด'), color: RING.secondary });
  };

  const goTo = (where: ZiyarahArea) => {
    if (ctx.player.frozen) return;
    clearTrip();
    const caption = where === 'quba' ? tr('🚌 นั่งรถบัสไปมัสยิดกุบาอ์ (ประมาณ 3–4 กม. ทางใต้ของมัสยิดนะบะวี)')
      : where === 'uhud' ? tr('🚌 นั่งรถบัสไปภูเขาอุฮุด (ประมาณ 5 กม. ทางเหนือของมัสยิดนะบะวี)')
        : tr('🚌 นั่งรถบัสกลับมัสยิดนะบะวี');
    travel(ctx, caption, () => {
      setArea(where);
      if (where === 'nabawi') {
        place(ctx, NABAWI.busStop, 0, zone, nabShape);
        nabawiButtons();
        return;
      }
      if (where === 'quba') {
        place(ctx, { x: QUBA_AT.x + QUBA.start.x, z: QUBA_AT.z + QUBA.start.z }, 0, zone, qubaShape);
        visitQuba();
      } else {
        place(ctx, { x: UHUD_AT.x + UHUD.start.x, z: UHUD_AT.z + UHUD.start.z }, Math.PI, zone, uhudShape);
        visitUhud();
      }
      tripBtns.push(ctx.action(tr('🚌 กลับมัสยิดนะบะวี'), () => goTo('nabawi')));
    });
  };

  nabawiButtons();
}

