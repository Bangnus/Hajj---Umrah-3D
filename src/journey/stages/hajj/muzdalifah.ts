import * as THREE from 'three';
import { RING } from '../../../engine/rings';
import { MUZ, buildMuzdalifah } from '../../../world/muzdalifah';
import { QIBLA_WEST, rng } from '../../../world/hajjCommon';
import type { Profile, StageDef } from '../../types';
import { praySequence, skyClock, timedDua } from './common';

const PEBBLE_SPOTS = 12;

export function hajjMuzdalifah(_p: Profile): StageDef {
  return {
    id: 'hajjMuzdalifah',
    icon: '🌙',
    title: 'ค้างคืนที่มุซดะลิฟะฮ์',
    arabic: 'المزدلفة',
    desc: 'คืนวันที่ 10 ซุลหิจญะฮ์ หลังออกจากอะรอฟะฮ์ ละหมาดมัฆริบและอิชาอ์รวมกันที่มุซดะลิฟะฮ์ เก็บก้อนหินขนาดเล็ก พักค้างคืน ละหมาดศุบฮิแต่เนิ่น ๆ แล้วซิกร์ขอดุอาอ์ที่อัลมัชอะริลฮะรอมจนฟ้าสว่าง ก่อนออกเดินทางไปมีนา',
    tip: () => 'ก้อนหินควรมีขนาดประมาณเมล็ดถั่ว ไม่ใหญ่กว่านั้น ซุนนะฮ์ให้เก็บ 7 ก้อนสำหรับวันที่ 10 ที่นี่ ส่วนของวันตัชรีกเก็บที่นี่หรือที่มีนาก็ได้ (รวมทั้งหมด 49 ก้อน หรือ 70 ก้อนถ้าอยู่ถึงวันที่ 13) ผู้หญิง ผู้สูงอายุ และผู้อ่อนแอ ได้รับการผ่อนผันให้ออกไปมีนาหลังเที่ยงคืนได้',
    outfit: 'ihram',
    build(ctx) {
      ctx.add(buildMuzdalifah({ quality: ctx.quality }));
      const sky = skyClock(ctx, 1.3);
      let pebbles = 0;

      ctx.rings.add(MUZ.camp.x, MUZ.camp.z, 2.2, () => {
        ctx.toast('ถึงมุซดะลิฟะฮ์แล้ว ละหมาดมัฆริบและอิชาอ์รวมกันก่อนทำอย่างอื่น', 'info');
        praySequence(ctx, [
          { name: 'มัฆริบ', rakaat: 3, note: 'รวมมัฆริบกับอิชาอ์ในเวลาอิชาอ์ (ญัมอ์ตะอ์คีร) อะซานครั้งเดียว อิกอมะฮ์สองครั้ง มัฆริบ 3 ร็อกอะฮ์เต็ม' },
          { name: 'อิชาอ์', rakaat: 2, note: 'อิชาอ์ย่อเหลือ 2 ร็อกอะฮ์ ละหมาดต่อทันทีหลังมัฆริบ' },
        ], {
          qiblaYaw: QIBLA_WEST,
          heading: 'รวมและย่อ',
          label: (s) => `🕌 ละหมาด${s.name} ${s.rakaat} ร็อกอะฮ์ (รวม${s.name === 'อิชาอ์' ? ' + ย่อ' : ''})`,
          onDone: () => {
            ctx.progress();
            ctx.toast('เก็บก้อนหินเล็ก ๆ อย่างน้อย 7 ก้อนสำหรับขว้างญัมเราะฮ์อะกอบะฮ์พรุ่งนี้', 'info');
            ctx.hint('เดินเข้าวงแหวนสีขาวเพื่อเก็บก้อนหิน (อย่างน้อย 7 ก้อน)');
            spawnPebbles();
          },
        });
      }, { label: 'ที่พักในมุซดะลิฟะฮ์' });

      const spawnPebbles = () => {
        const r = rng(42);
        const geo = new THREE.SphereGeometry(0.05, 6, 5);
        const m = new THREE.MeshStandardMaterial({ color: 0x6a645c, roughness: 0.95 });
        for (let i = 0; i < PEBBLE_SPOTS; i++) {
          const a = (i / PEBBLE_SPOTS) * Math.PI * 2 + r() * 0.4;
          const d = 3 + r() * 6;
          const x = MUZ.pebbles.x + Math.cos(a) * d, z = MUZ.pebbles.z + Math.sin(a) * d;
          const pile = new THREE.Group();
          for (let k = 0; k < 5; k++) {
            const s = new THREE.Mesh(geo, m);
            s.position.set(x + (r() - 0.5) * 0.4, 0.04, z + (r() - 0.5) * 0.4);
            pile.add(s);
          }
          ctx.root.add(pile);
          ctx.rings.add(x, z, 0.8, () => {
            pile.removeFromParent();
            pebbles++;
            if (pebbles <= 7) ctx.progress();
            if (pebbles < 7) ctx.toast(`เก็บก้อนหินแล้ว ${pebbles} / 7`, 'ok');
            else if (pebbles === 7) {
              ctx.toast('ครบ 7 ก้อนสำหรับวันที่ 10 แล้ว จะเก็บเผื่อวันตัชรีกด้วยก็ได้', 'ok');
              ctx.hint('ไปที่เสื่อนอนเพื่อพักค้างคืน (หรือเก็บหินเพิ่มก่อน)');
              ctx.guide(MUZ.mat);
              showMat();
            } else ctx.toast(`เก็บเผื่อวันตัชรีกแล้ว ${pebbles - 7} ก้อน (ต้องใช้อีก 42 ก้อน หรือ 63 ก้อนถ้าอยู่ถึงวันที่ 13)`, 'info');
          }, { color: RING.white, label: i % 4 === 0 ? 'ก้อนหิน' : undefined });
        }
      };

      const showMat = () => {
        ctx.rings.add(MUZ.mat.x, MUZ.mat.z, 1.4, () => {
          ctx.guide(null);
          const pl = ctx.player;
          const btn = ctx.action('🌙 นอนพักค้างคืน (มะบีต)', () => {
            btn.remove();
            pl.frozen = true;
            pl.yaw = QIBLA_WEST;
            pl.setPose('sit');
            ctx.toast('พักผ่อนค้างคืนที่มุซดะลิฟะฮ์…', 'info');
            sky.to(1.6, 3, () => sky.to(-0.13, 5, () => {
              pl.setPose('stand');
              pl.frozen = false;
              ctx.toast('เข้าเวลาศุบฮิแล้ว ละหมาดแต่เนิ่น ๆ ตามแบบอย่างท่านนบี ﷺ', 'info');
              praySequence(ctx, [{ name: 'ศุบฮิ', rakaat: 2 }], {
                qiblaYaw: QIBLA_WEST,
                onDone: () => {
                  ctx.progress();
                  ctx.hint('เดินไปที่อัลมัชอะริลฮะรอม (มัสยิดทางทิศเหนือ) เพื่อซิกร์และขอดุอาอ์');
                  ctx.rings.add(MUZ.mashar.x, MUZ.mashar.z, 2.4, () => {
                    ctx.dua('muzdalifah_mashar');
                    sky.to(-0.03, 10);
                    timedDua(ctx, {
                      qiblaYaw: QIBLA_WEST, sec: 10,
                      label: '🤲 ตักบีร ตะฮ์ลีล และขอดุอาอ์',
                      doneLabel: 'ฟ้าสว่างแล้ว — เสร็จสิ้น ✓',
                      onDone: () => {
                        ctx.progress();
                        ctx.toast('ฟ้าสว่างแล้ว ออกเดินทางไปมีนาก่อนดวงอาทิตย์ขึ้น เพื่อขว้างญัมเราะฮ์อะกอบะฮ์', 'ok');
                      },
                    });
                  }, { label: 'อัลมัชอะริลฮะรอม — ซิกร์' });
                },
              });
            }));
          });
        }, { label: 'เสื่อนอน — พักค้างคืน', color: RING.secondary });
      };

      return {
        mission: { label: 'มุซดะลิฟะฮ์', text: 'ละหมาดมัฆริบ+อิชาอ์รวมกัน เก็บหิน 7 ก้อน พักค้างคืน ละหมาดศุบฮิ แล้วซิกร์ที่อัลมัชอะริลฮะรอม', hint: 'เดินไปที่วงแหวนที่พักในมุซดะลิฟะฮ์', total: 10 },
        start: { x: MUZ.start.x, z: MUZ.start.z, yaw: Math.PI },
        camYaw: 0,
      };
    },
  };
}
