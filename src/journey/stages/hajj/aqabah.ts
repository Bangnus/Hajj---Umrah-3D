import { RING } from '../../../engine/rings';
import { JAMARAT, buildJamarat, jamrah } from '../../../world/jamarat';
import { QIBLA_WEST } from '../../../world/hajjCommon';
import { behind } from '../util';
import type { Profile, StageCtx, StageDef } from '../../types';
import { needsDam, skyClock } from './common';
import { pebbleFx, throwStation } from './jamrah';
import { tr } from '../../../i18n';

export function hajjAqabah(p: Profile): StageDef {
  const dam = needsDam(p);
  return {
    id: 'hajjAqabah',
    icon: '🪨',
    title: tr('ขว้างญัมเราะฮ์อะกอบะฮ์'),
    arabic: 'رمي جمرة العقبة',
    desc: tr('วันที่ 10 ซุลหิจญะฮ์ (วันอีดิลอัฎฮา) ขว้างเฉพาะญัมเราะฮ์อะกอบะฮ์ 7 ก้อน ทีละก้อน กล่าว "อัลลอฮุอักบัร" ทุกก้อน และหยุดกล่าวตัลบิยะฮ์ตั้งแต่ก้อนแรก ')
      + (dam
        ? tr('จากนั้นเชือดฮัดย์ (ดัม) สำหรับฮัจญ์{type} แล้วโกนศีรษะ (ผู้ชาย) หรือตัดปลายผม (ผู้หญิง) เพื่อตะฮัลลุลขั้นแรก', { type: p.hajjType === 'qiran' ? tr('กิรอน') : tr('ตะมัตตุอ์') })
        : tr('ผู้ทำฮัจญ์อิฟรอดไม่ต้องเสียดัม จากนั้นโกนศีรษะ (ผู้ชาย) หรือตัดปลายผม (ผู้หญิง) เพื่อตะฮัลลุลขั้นแรก')),
    tip: () => tr('ลำดับซุนนะฮ์ของวันที่ 10 คือ ขว้าง → เชือด → โกน/ตัดผม → เฏาะวาฟอิฟาเฎาะฮ์ ถ้าทำสลับลำดับก็ใช้ได้ ท่านนบี ﷺ ตอบผู้ที่ทำก่อนหลังว่า "ทำเถิด ไม่เป็นไร" ก้อนหินต้องตกลงในแอ่ง ไม่จำเป็นต้องโดนกำแพง และห้ามขว้างทีเดียว 7 ก้อน'),
    outfit: 'ihram',
    build(ctx) {
      ctx.add(buildJamarat({ quality: ctx.quality }));
      skyClock(ctx, 0.2);
      const fx = pebbleFx(ctx);
      const aq = jamrah('aqabah');
      ctx.after(1, () => ctx.toast(tr('วันนี้ขว้างเฉพาะญัมเราะฮ์อะกอบะฮ์ (ต้นสุดท้ายทางทิศมักกะฮ์) ส่วนอีกสองต้นยังไม่ต้องขว้าง'), 'info'));
      ctx.hint(tr('เดินไปที่วงแหวนจุดขว้าง{name}', { name: aq.name }));
      throwStation(ctx, fx, aq, {
        extra: (n) => (n === 1 ? tr('— หยุดตัลบิยะฮ์แล้ว') : ''),
        onThrow: (n) => {
          ctx.progress();
          if (n === 1) ctx.dua('jamarat_takbir');
        },
        onDone: () => {
          ctx.toast(tr('ขว้างครบ 7 ก้อนแล้ว อัลฮัมดุลิลลาฮ์'), 'ok');
          ctx.after(1.2, () => ctx.dua('takbir_tashriq'));
          if (dam) slaughter(ctx); else barber(ctx);
        },
      });
      return {
        mission: {
          label: dam ? tr('วันที่ 10: ขว้าง เชือด และโกน/ตัดผม') : tr('วันที่ 10: ขว้าง และโกน/ตัดผม'),
          text: dam
            ? tr('ขว้าง{name} 7 ก้อน เชือดฮัดย์ แล้วโกนหรือตัดผมเพื่อตะฮัลลุลขั้นแรก', { name: aq.name })
            : tr('ขว้าง{name} 7 ก้อน แล้วโกนหรือตัดผมเพื่อตะฮัลลุลขั้นแรก', { name: aq.name }),
          hint: tr('เดินไปที่วงแหวนสีเหลืองหน้าญัมเราะฮ์อะกอบะฮ์'),
          total: 7 + (dam ? 1 : 0) + 1,
        },
        start: { x: JAMARAT.aqabahStart.x, z: JAMARAT.aqabahStart.z, yaw: QIBLA_WEST },
        camYaw: behind(QIBLA_WEST),
      };
    },
  };
}

function slaughter(ctx: StageCtx) {
  ctx.hint(tr('เชือดฮัดย์ (ดัม): ส่วนใหญ่ซื้อคูปองไว้ล่วงหน้า ให้ตัวแทนเชือดแทนที่โรงเชือด'));
  const btn = ctx.action(tr('🐑 ยืนยันการเชือดฮัดย์ (ผ่านคูปอง/ตัวแทน)'), () => {
    btn.remove();
    ctx.progress();
    ctx.dua('slaughter_dam');
    ctx.toast(tr('ตัวแทนเชือดฮัดย์ของคุณแล้ว (แพะหรือแกะ 1 ตัว) ถ้าทำได้ ให้รอข่าวว่าเชือดแล้วก่อนโกนผม'), 'ok');
    ctx.after(2, () => barber(ctx));
  });
}

function barber(ctx: StageCtx) {
  const male = ctx.profile.gender === 'male';
  ctx.hint(male ? tr('เดินไปร้านตัดผมใกล้ทางออก เพื่อโกนศีรษะ') : tr('เดินไปที่จุดตัดผมใกล้ทางออก เพื่อตัดปลายผม'));
  ctx.guide(JAMARAT.barber);
  ctx.rings.add(JAMARAT.barber.x, JAMARAT.barber.z, 1.6, () => {
    ctx.guide(null);
    ctx.dua('tahallul_hadith');
    const btn = ctx.action(male ? tr('✂️ โกนศีรษะ') : tr('✂️ ตัดปลายผม (ประมาณหนึ่งข้อนิ้ว)'), () => {
      btn.remove();
      ctx.player.setLook({ hair: male ? 'shaved' : 'trimmed' });
      ctx.progress();
      ctx.after(1.5, () => {
        ctx.player.setLook({ outfit: 'travel' });
        ctx.toast(tr('ตะฮัลลุลขั้นแรกแล้ว ข้อห้ามของอิห์รอมสิ้นสุด ยกเว้นเรื่องสามีภรรยา (จนกว่าจะเฏาะวาฟอิฟาเฎาะฮ์ และสะแอถ้ายังไม่ได้ทำ)'), 'ok');
      });
    });
  }, { label: male ? tr('ร้านตัดผม — โกนศีรษะ') : tr('จุดตัดผม'), color: RING.main });
}
