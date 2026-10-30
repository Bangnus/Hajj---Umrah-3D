# umrah-sim-th — จำลองอุมเราะฮ์ 3 มิติ (MVP)

เครื่องจำลองสำหรับฝึกพิธีอุมเราะฮ์แบบ 3 มิติ สำหรับมุสลิมไทย เล่นบนเบราว์เซอร์ได้ทั้งคอมพิวเตอร์และมือถือ
สร้างด้วย **TypeScript + Vite 6 + three.js r170** ไม่ใช้ UI framework (DOM ล้วน)

## ขอบเขตปัจจุบัน

เส้นทางอุมเราะฮ์แบบเนียตที่มีกอตก่อน (miqat-first) มีทั้งหมด 7 ขั้น:

| # | `id` | ขั้นตอน | สิ่งที่ผู้เล่นทำ |
|---|------|---------|----------------|
| 1 | `preparation` | เตรียมตัวที่บ้าน (บ้านไทย) | เก็บของ 5 อย่าง (ต่างกันตามเพศ) แล้วเดินออกจากบ้าน |
| 2 | `airport` | สนามบิน (แบบสุวรรณภูมิ) | เช็กอิน → ตรวจคนเข้าเมือง → ตรวจความปลอดภัย → ประตูขึ้นเครื่อง |
| 3 | `miqat` | มีกอต (ในห้องโดยสารเครื่องบิน) | ไปห้องเปลี่ยนชุด ครองอิห์รอม กดปุ่มกล่าวเนียต แล้วตามด้วยตัลบิยะฮ์ |
| 4 | `tawaf` | เฏาะวาฟ | เริ่มที่แนวหินดำ เดินทวนเข็มนาฬิกา 7 รอบ นับรอบอัตโนมัติ เตือนเมื่อเดินผิดทาง |
| 5 | `prayerZamzam` | ละหมาด 2 ร็อกอะฮ์ + ดื่มซัมซัม | ละหมาดหลังมะกอมอิบรอฮีมทีละท่า (`PRAYER_BEATS`) แล้วดื่มน้ำซัมซัม |
| 6 | `sai` | สะแอ | ต้องเริ่มที่เศาะฟา เดินไป-กลับ 7 เที่ยว ช่วงไฟเขียวผู้ชายวิ่งเหยาะ (ความเร็ว ×1.5) |
| 7 | `tahalul` | ตะฮัลลุล | ผู้ชายโกนศีรษะ / ผู้หญิงตัดปลายผม แล้วออกจากอิห์รอม |

ความสามารถอื่น:
- หน้าสร้างตัวละคร (ชื่อ + เพศ) — เนื้อหา เคล็ดลับ และชุดเปลี่ยนตามเพศ
- การ์ดดุอาอ์ (อาหรับ คำอ่านไทย ความหมาย แหล่งอ้างอิง) ดึงจาก `src/content/duas-th.json` ด้วย `id`
- หน้าจบพิธี (completion) พร้อมรายการขั้นตอนที่ทำครบ และปุ่ม "ฝึกอีกครั้ง"
- บันทึกความคืบหน้าใน `localStorage` (`umrahsim:progress:v1`) กลับมาเล่นต่อได้ และตั้งค่าใน `umrahsim:settings:v1`
- แถบขั้นตอนด้านข้างกดข้ามไปขั้นใดก็ได้ ปุ่ม ย้อนกลับ / ข้าม / ไปต่อ
- ตั้งค่า: เปิด-ปิดเส้นนำทางบนลานเฏาะวาฟ, ล้างความคืบหน้า
- คุณภาพกราฟิกปรับอัตโนมัติ (`Quality`: `low` บนจอสัมผัสหรือจอแคบกว่า 768px, `high` บนเดสก์ท็อป — มีผลต่อจำนวนฝูงชน)

## การรันโปรเจกต์

```bash
npm install
npm run dev        # http://localhost:5180
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + vite build → dist/
npm run preview    # ดู build ที่ port 5181
```

## การควบคุม

| การกระทำ | คีย์บอร์ด / เมาส์ | จอสัมผัส |
|----------|------------------|---------|
| เดิน | `W A S D` หรือปุ่มลูกศร | จอยสติ๊กซ้ายล่าง |
| วิ่ง / เดินเร็ว (ร็อมัล) | กด `Shift` ค้าง | ปุ่มวิ่ง (กดสลับเปิด-ปิด) |
| หมุนกล้อง | ลากเมาส์บนฉาก | ลากนิ้วบนฉาก |
| ซูม | ล้อเมาส์ | — |
| ทำภารกิจ | เดินเข้าวงแหวนบนพื้น / กดปุ่มในแผงภารกิจ | เหมือนกัน |

ลูกศรสีเหลืองที่เท้าผู้เล่นชี้ไปยังเป้าหมายถัดไป

## โครงสร้างโปรเจกต์

```
index.html                 จุดเข้า HTML (canvas #scene + #ui)
src/main.ts                บูตแอป: รอฟอนต์ไทย สร้าง Engine/Hud/Input/Player/Journey แล้วเริ่มขั้นแรกหรือขั้นที่บันทึกไว้
src/engine/engine.ts       renderer, scene, กล้อง, แสง, frame loop และเลือก Quality
src/engine/input.ts        คีย์บอร์ด, ลากเมาส์หมุนกล้อง, ล้อซูม, จอยสติ๊กสัมผัส, ปุ่มวิ่ง
src/engine/player.ts       ตัวละคร (primitive), ชุด/ทรงผม/ท่าละหมาด, การชน (Collider) และ followCamera
src/engine/rings.ts        วงแหวนเรืองแสงบนพื้นที่ยิง callback เมื่อเดินเข้า + disposeTree
src/engine/label.ts        ป้ายข้อความ (sprite จาก canvas รองรับภาษาไทย) และ textTexture
src/world/common.ts        helper สร้างฉาก (box, cyl, floor, tileTexture) และฝูงชนแบบ InstancedMesh
src/world/simple.ts        ฉากบ้าน (HOME), สนามบิน (AIRPORT), ห้องโดยสาร (CABIN), ลานร้านตัดผม (PLAZA)
src/world/haram.ts         มัสยิดอัลฮะรอม กะอ์บะฮ์ หิจร์อิสมาอีล มุมหินดำ/ยะมานี และจุดสำคัญ (SPOTS)
src/world/masa.ts          ทางเดินมัสอา (เศาะฟา–มัรวะฮ์) ย่อเหลือ ~100 ม. พร้อมช่วงไฟเขียว
src/journey/types.ts       ชนิดข้อมูล StageDef, StageCtx, StageBuild, Mission, Profile, Settings
src/journey/stages.ts      นิยาม 7 ขั้นตอน (STAGES) — ตรรกะภารกิจทั้งหมดอยู่ที่นี่
src/journey/journey.ts     ตัวรันลำดับขั้น: สร้าง/ทำลายฉาก, นับภารกิจ, ลูกศรนำทาง, ไปขั้นถัดไป/หน้าจบ
src/journey/prayer.ts      ลำดับท่าละหมาด 2 ร็อกอะฮ์ (PRAYER_BEATS)
src/journey/progress.ts    บันทึก/โหลดความคืบหน้าและการตั้งค่าใน localStorage
src/content/duas-th.json   ข้อมูลดุอาอ์/ซิกร์ภาษาไทย (สำเนาจากโปรเจกต์ reverse)
src/content/duas.ts        ชนิด Dua, getDua(id), ป้ายประเภทภาษาไทย
src/ui/hud.ts              UI ทั้งหมด: หน้าสร้างตัวละคร, แผงภารกิจ, การ์ดดุอาอ์, toast, ละหมาด/ซัมซัม, หน้าจบ, ตั้งค่า
src/ui/styles.css          สไตล์ UI (เดสก์ท็อป + มือถือแบบ bottom sheet)
```

## การเพิ่มขั้นตอนใหม่

เพิ่มออบเจกต์ `StageDef` ลงในอาร์เรย์ `STAGES` ใน `src/journey/stages.ts` (ลำดับในอาร์เรย์ = ลำดับในเกม)

ฟิลด์ของ `StageDef`:
- `id`, `icon`, `title` (ไทย), `arabic`, `desc`
- `tip: (p: Profile) => string` — เคล็ดลับ แยกตาม `p.gender` ได้
- `outfit: 'travel' | 'ihram'` — ชุดตอนเริ่มขั้น (ใช้ตอนเล่นต่อ/กระโดดข้ามขั้น)
- `build(ctx: StageCtx): StageBuild` — สร้างฉากและภารกิจ คืนค่า `mission` (`label`, `text`, `hint`, `total`), `start` (`x`, `z`, `yaw`) และ `camYaw`, `camDist`, `tick(dt)` แบบไม่บังคับ

helper ใน `ctx` ที่ใช้บ่อย:
- `ctx.add(scene)` — ใส่ฉาก (`Scene3D`: group + colliders + tick)
- `ctx.rings.add(x, z, r, onEnter, { label, color, persistent })` — วงแหวนภารกิจ ถ้า `onEnter` คืน `false` วงแหวนจะยังไม่หายไป
- `ctx.progress(n = 1)` — นับภารกิจ เมื่อครบ `mission.total` ปุ่ม "ไปต่อ" จะเปิด
- `ctx.dua(id)` — แสดงการ์ดดุอาอ์จาก `duas-th.json`
- `ctx.toast(msg, 'ok' | 'warn' | 'info')`, `ctx.hint(text)`
- `ctx.action(label, onClick)` — ปุ่มในแผงภารกิจ คืน handle (`setEnabled`, `setLabel`, `remove`)
- `ctx.guide({ x, z } | null)` — ชี้ลูกศรไปที่จุดหนึ่ง (`null` = วงแหวนที่ใกล้ที่สุด)
- `ctx.after(seconds, fn)` — ตั้งเวลา (ถูกยกเลิกอัตโนมัติเมื่อเปลี่ยนขั้น)
- `ctx.player`, `ctx.profile`, `ctx.settings`, `ctx.quality`

ตัวอย่าง:

```ts
import { RING } from '../engine/rings';
import { buildPlaza, PLAZA } from '../world/simple';

{
  id: 'farewell',
  icon: '👋',
  title: 'กล่าวลา',
  arabic: 'الوداع',
  desc: 'เดินไปยังประตูทางออกและขอดุอาอ์ก่อนเดินทางกลับ',
  tip: () => 'ขอดุอาอ์ให้ตัวเองและครอบครัว',
  outfit: 'travel',
  build(ctx) {
    ctx.add(buildPlaza());
    ctx.after(1, () => ctx.toast('เดินไปที่ประตูทางออก', 'info'));
    ctx.rings.add(PLAZA.barber.x, PLAZA.barber.z, 1.5, () => {
      ctx.progress();
      const btn = ctx.action('ขอดุอาอ์', () => {
        btn.remove();
        ctx.progress();
        ctx.dua('safar'); // ต้องมี id นี้ใน duas-th.json
      });
    }, { label: 'ประตูทางออก', color: RING.secondary });
    return {
      mission: { label: 'กล่าวลา', text: 'เดินไปที่ประตู แล้วกดขอดุอาอ์', hint: 'ตามลูกศร', total: 2 },
      start: { x: PLAZA.start.x, z: PLAZA.start.z, yaw: Math.PI },
      camYaw: 0,
    };
  },
},
```

ฉากใหม่ให้เขียนเป็นฟังก์ชันที่คืน `Scene3D` ใน `src/world/` (ดู `simple.ts` เป็นแบบ) แล้วรัน `npm run typecheck`

## เนื้อหาดุอาอ์

- **ต้นฉบับ (source of truth):** `C:/Web/syumra-th-reverse/data/duas-th.json`
- คัดลอกมาไว้ที่ `src/content/duas-th.json` — ถ้าแก้ ให้แก้ที่ต้นฉบับแล้วคัดลอกมาใหม่ อย่าแก้สองที่แยกกัน
- โค้ดอ้างอิงด้วย `id` เท่านั้น (`ctx.dua('talbiyah')`) ถ้าไม่พบ `id` จะมี `console.warn('missing dua', id)`
- แต่ละรายการมี `type`, `stages`, `title_th`, `arabic`, `reading_th`, `meaning_th`, `source`, `grade_th`, `note_th`
- สถานะปัจจุบันเป็น **ร่าง** — ต้องให้ผู้รู้ศาสนาตรวจทานก่อนเผยแพร่จริง

## ข้อจำกัดที่ทราบ / งานถัดไป

- ยังไม่มีขั้นมะดีนะฮ์ และขั้นเดินทางกลับบ้าน
- ยังไม่มีโหมดฮัจญ์
- ตัวละครและฝูงชนเป็น primitive แบบง่าย — ต้องการโมเดลตัวละครจริงและแอนิเมชัน
- ยังไม่มีเสียงบรรยายภาษาไทย และเสียงตัลบิยะฮ์จริง
- UI เป็นภาษาไทยอย่างเดียว ยังไม่มี i18n ภาษาอังกฤษ
- ยังไม่มีใบประกาศนียบัตรเมื่อจบพิธี
- ยังไม่แสดงร็อมัลและอิฎฏิบาอ์เป็นภาพ (มีแค่ข้อความแนะนำ / วิ่งด้วย `Shift`)
- ฝูงชนไม่หลบผู้เล่น (ไม่มี crowd avoidance)
- ระยะสะแอถูกย่อเหลือ ~100 ม. (ของจริง ~400 ม.)
- เนื้อหาศาสนาทั้งหมด (ดุอาอ์ เคล็ดลับ ลำดับพิธี) ต้องผ่านการตรวจทานจากผู้รู้

## ที่มาและลิขสิทธิ์

สเปกที่ได้จากการศึกษา (reverse-engineering) เว็บต้นแบบอยู่ที่ `C:/Web/syumra-th-reverse`
โปรเจกต์นี้ **ไม่ได้ใช้โค้ดหรือ asset ใด ๆ จากเว็บต้นฉบับ** — ทุกฉากสร้างแบบ procedural ด้วย three.js และโค้ดทั้งหมดเขียนขึ้นใหม่
