import { buildMasa } from '../../../world/masa';
import type { Profile, StageDef } from '../../types';
import { afterShave, crowdCount } from './common';
import { saiLegs } from './saiLegs';
import { tr } from '../../../i18n';

export function hajjSai(p: Profile): StageDef {
  const tamattu = p.hajjType === 'tamattu';
  return {
    id: 'hajjSai',
    icon: '⛰️',
    title: tr('สะแอของฮัจญ์'),
    arabic: 'السعي',
    desc: tamattu
      ? tr('ผู้ทำตะมัตตุอ์ต้องสะแอของฮัจญ์หลังเฏาะวาฟอิฟาเฎาะฮ์ (สะแอครั้งก่อนเป็นของอุมเราะฮ์) เดิน 7 เที่ยว เริ่มที่เศาะฟา จบที่มัรวะฮ์ เมื่อเสร็จแล้วคือตะฮัลลุลขั้นที่สอง ข้อห้ามทั้งหมดสิ้นสุด')
      : tr('ผู้ทำอิฟรอดหรือกิรอนที่สะแอแล้วหลังเฏาะวาฟกุดูม ไม่ต้องสะแออีก ถ้ายังไม่ได้สะแอ ต้องสะแอหลังเฏาะวาฟอิฟาเฎาะฮ์ ในเกมนี้ให้ฝึกไว้ทุกคน เดิน 7 เที่ยว เริ่มที่เศาะฟา จบที่มัรวะฮ์ แล้วจึงตะฮัลลุลขั้นที่สอง'),
    tip: () => tr('ระหว่างไฟเขียวสองจุด ผู้ชายวิ่งเหยาะ ๆ ผู้หญิงเดินตามปกติ สะแอไม่จำเป็นต้องมีน้ำละหมาด แต่มีน้ำละหมาดจะดีกว่า'),
    outfit: 'travel',
    build(ctx) {
      ctx.add(buildMasa(crowdCount(ctx, 160, 70)));
      afterShave(ctx);
      if (!tamattu) ctx.after(1.2, () => ctx.toast(tr('ถ้าคุณสะแอแล้วหลังเฏาะวาฟกุดูม สะแอครั้งนี้ไม่จำเป็น ในเกมให้ฝึกไว้'), 'info'));
      saiLegs(ctx, {
        onDone: () => ctx.after(1.5, () => ctx.toast(tr('ตะฮัลลุลขั้นที่สองแล้ว ข้อห้ามของอิห์รอมสิ้นสุดทั้งหมด รวมถึงเรื่องสามีภรรยา'), 'ok')),
      });
      return {
        mission: { label: tr('สะแอ 7 เที่ยว'), text: tr('เริ่มที่วงแหวนเศาะฟา แล้วเดินไป-กลับระหว่างเศาะฟาและมัรวะฮ์ให้ครบ 7 เที่ยว'), hint: tr('ไปที่วงแหวนเศาะฟาก่อน'), total: 7 },
        start: { x: 5, z: 12, yaw: Math.PI },
        camYaw: 0,
      };
    },
  };
}
