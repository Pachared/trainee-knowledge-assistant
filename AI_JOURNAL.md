# AI Usage Journal

เอกสารนี้สรุปลำดับการใช้ AI ช่วยพัฒนา Project Trainee Knowledge Assistant ตั้งแต่เริ่มต้นจนถึงสถานะล่าสุด โดยเรียงเป็น session เพื่อให้เห็น prompt, แนวทางที่ AI ตอบ, สิ่งที่ผู้ใช้ปรับ/กำกับ และผลลัพธ์ของแต่ละช่วง

## Session 1: กำหนดโจทย์และ Tech Stack

**Prompt:** ขอให้สร้าง web application ตามโจทย์ Login Page, Chat Page คุยกับ AI, Upload Page สำหรับ PDF/TXT, Token Usage พร้อมระบุ stack เป็น Next.js only, API Routes, Prisma, SQLite, Chroma, OpenAI และ Docker Compose รวมถึงต้องใช้ UI คล้าย ChatGPT และเป็นธีมขาว modern

**AI Response:** วางแนวทางสร้าง project ด้วย Next.js + TypeScript, แยก API route/service/repo, ใช้ Prisma migration กับ SQLite, ใช้ Chroma เป็น vector DB และ OpenAI สำหรับ chat/embedding พร้อม Docker Compose

**My Adjustment:** ผู้ใช้กำหนดรายละเอียดเพิ่มว่า mock user ต้องเก็บใน env, UI ต้องแยก sidebar เมนูแชทใหม่ ค้นหาแชท ประวัติแชท, mobile drawer ต้องเหมือนรูป, font ต้องใช้ Noto Sans Thai และ Roboto, และต้องรองรับ responsive typography

## Session 2: เปลี่ยน UI เป็น MUI ทั้งระบบ

**Prompt:** เปลี่ยนการตกแต่งเป็น MUI ทั้งระบบ ส่วนไหนต้องใช้ CSS ให้ใช้เท่าที่จำเป็น

**AI Response:** ปรับ component structure ให้ใช้ MUI เช่น Box, Stack, Paper, Typography, Button, Drawer, Dialog และ MUI theme แทน styling แบบกระจัดกระจาย

**My Adjustment:** ผู้ใช้ต้องการ UX ใกล้ ChatGPT มากขึ้น โดยเน้น sidebar, chat layout, input composer, mobile drawer และให้ project ดู modern สีขาว

## Session 3: ทำ Docker, Prisma, Chroma และ startup flow

**Prompt:** แก้ Docker ให้มี public fallback, ตั้ง `CHROMA_URL=http://chroma:8000`, เพิ่ม startup migration/seed สำหรับ SQLite ใน container และ push ทุกครั้ง

**AI Response:** ปรับ Dockerfile และ docker-compose ให้ web container รัน `prisma migrate deploy`, seed mock user และ start Next.js server โดย depends_on Chroma healthcheck

**My Adjustment:** ผู้ใช้ทดสอบด้วย `docker compose up` แล้วเจอ error หลายรอบ ทำให้ต้องแก้ image tag, Chroma URL, startup flow และ Docker Desktop state issue เพิ่มเติม

## Session 4: แก้ PDF parser

**Prompt:** แก้ PDF parser ให้ใช้ API ปัจจุบันของ `pdf-parse` หรือ pin version ที่รองรับ default export

**AI Response:** เลือก pin `pdf-parse` version ที่รองรับการใช้งานใน project และปรับ import ให้เสถียรกับ runtime ปัจจุบัน

**My Adjustment:** ผู้ใช้ต้องการให้ upload PDF ใช้งานได้จริง ไม่ใช่แค่ผ่าน build จึงเพิ่ม integration test สำหรับ PDF fixture และ failed PDF reason

## Session 5: เพิ่ม Integration Tests

**Prompt:** เพิ่ม integration tests สำหรับ login -> upload TXT/PDF -> chat with document -> usage

**AI Response:** เพิ่ม Vitest integration flow ที่ mock Chroma/OpenAI, ใช้ SQLite test database, login ผ่าน mock user, upload TXT/PDF, chat กับ document, ตรวจ SSE events และ token usage

**My Adjustment:** ผู้ใช้ต้องการความมั่นใจว่าฟีเจอร์หลักใช้งานต่อกันได้ ไม่ใช่ทดสอบแยก function อย่างเดียว

## Session 6: เพิ่ม Playwright E2E

**Prompt:** เพิ่ม e2e test ด้วย Playwright สำหรับ desktop/mobile drawer และ protected routes

**AI Response:** เพิ่ม Playwright tests เพื่อตรวจ redirect ไป login เมื่อยังไม่ login, desktop shell, mobile drawer และ protected route behavior

**My Adjustment:** ผู้ใช้เน้น UX ตามภาพตัวอย่าง จึงต้องมี e2e สำหรับ layout และ drawer ไม่ใช่แค่ API

## Session 7: เพิ่มสถานะเอกสารและ error ที่ละเอียดขึ้น

**Prompt:** เพิ่มสถานะเอกสาร/ข้อความ error ที่ละเอียดขึ้น เช่น `failedReason` เพื่อรู้ว่า PDF fail เพราะอะไร

**AI Response:** เพิ่ม field `failedReason` ใน Prisma schema/migration และปรับ document service ให้เก็บเหตุผลเมื่อ PDF parse fail หรือ Chroma indexing fail

**My Adjustment:** ผู้ใช้ต้องการ debug ได้จาก UI/API ว่า failure เกิดที่ PDF parser, Chroma หรือขั้นตอนอื่น

## Session 8: เพิ่ม management actions

**Prompt:** เพิ่ม delete/rename chat, delete document, retry indexing และปุ่ม re-index Chroma

**AI Response:** เพิ่ม API routes และ UI actions สำหรับ rename/delete chat, delete document, re-index รายเอกสาร และ bulk re-index เอกสารที่ Chroma fail

**My Adjustment:** ผู้ใช้ต้องการให้ app ใช้งานจริงมากขึ้น ไม่ใช่แค่ demo ถามตอบ จึงต้องจัดการข้อมูลที่สร้างแล้วได้

## Session 9: ปรับ token usage ให้ใช้ค่าจริงจาก OpenAI

**Prompt:** ปรับ token usage ให้ใช้ usage จริงจาก OpenAI response เมื่อมี API key แทนการ estimate อย่างเดียว

**AI Response:** ปรับ streaming service ให้อ่าน `response.completed` usage จาก OpenAI Responses API และ fallback เป็น estimate เฉพาะกรณีไม่มี usage

**My Adjustment:** ผู้ใช้ต้องการให้หน้า usage สะท้อนต้นทุนจริงใกล้เคียง production มากขึ้น

## Session 10: Pin dependency และ Docker image

**Prompt:** Pin dependency ที่ยังเป็น latest โดยเฉพาะ next, openai, chromadb, pdf-parse และ pin `chromadb/chroma` Docker image เป็น version หรือ digest

**AI Response:** ปรับ package.json ให้ใช้ version ชัดเจนและ pin Chroma Docker image ด้วย digest เพื่อลดความเสี่ยง package/image อัปเดตแล้วพัง

**My Adjustment:** ผู้ใช้เคยเจอปัญหา package API เปลี่ยน จึงต้องการ reproducible build

## Session 11: เพิ่ม diagnostics และ production hardening

**Prompt:** เพิ่ม audit endpoint/admin diagnostics สำหรับ Chroma status, DB migration status, upload directory writable รวมถึง diagnostics UI หน้า admin

**AI Response:** เพิ่ม `/api/admin/diagnostics` และ `/admin` page เพื่อแสดง OpenAI, Chroma, Database migrations และ upload directory status

**My Adjustment:** ผู้ใช้ต้องการไม่ต้อง curl API เอง จึงเพิ่ม UI สำหรับตรวจระบบด้วยสายตา

## Session 12: ปรับ secret handling และ cleanup scripts

**Prompt:** เปลี่ยน secret handling ใน production เป็น secret manager หรือ Docker secrets และเพิ่ม cleanup script สำหรับ e2e SQLite เก่า

**AI Response:** เพิ่มแนวทาง Docker secrets ผ่าน `_FILE` env pattern และเพิ่ม cleanup script สำหรับลบ `prisma/integration-e2e-*.db`

**My Adjustment:** ผู้ใช้ต้องการลดความเสี่ยง secret หลุด และลดไฟล์ test database ค้างใน repo

## Session 13: เพิ่ม rate limit/storage quota ต่อ user

**Prompt:** เพิ่ม rate limit/storage quota ต่อ user สำหรับ upload และ chat จริงจังขึ้น

**AI Response:** เพิ่ม quota สำหรับจำนวนเอกสาร, storage MB ต่อ user และจำนวนข้อความต่อวัน พร้อม rate limiter สำหรับ login/upload/chat

**My Adjustment:** ผู้ใช้ต้องการให้ระบบมี guardrail ไม่ให้ผู้ใช้คนเดียวใช้ทรัพยากรเกินควร

## Session 14: ปรับ font และ responsive typography

**Prompt:** ใช้ Noto Sans Thai สำหรับภาษาไทย, Roboto สำหรับภาษาอังกฤษ และปรับขนาด font ให้เหมาะกับ desktop, macbook, ipad, mobile โดยอ้างอิง Apple/ChatGPT

**AI Response:** ปรับ font loading, CSS font stacks, MUI theme typography และ responsive scale

**My Adjustment:** ผู้ใช้ตรวจซ้ำหลายครั้งเพราะภาษาไทยยังไม่เปลี่ยน จึงต้องแก้ให้ `lang` และ font stack ทำงานจริงในทั้ง MUI และ global CSS

## Session 15: ทำ Chroma local และ Docker Compose ให้รันได้จริง

**Prompt:** ทำให้ Chroma local ใช้งานได้, ทำต่อให้เสร็จ และถามว่า `docker compose up` เดียวได้ไหม

**AI Response:** เพิ่ม local Chroma startup script, แก้ docker-compose, image tag, Chroma URL, startup migration/seed และช่วย debug Docker Desktop metadata issue

**My Adjustment:** ผู้ใช้รันคำสั่งจริงและส่ง log error กลับมา ทำให้แก้จน `docker compose up --build` รัน Chroma + web + Prisma ได้ครบ

## Session 16: แก้ login ใน Docker local

**Prompt:** ระบบรันแล้วแต่ขึ้น “กรุณาเข้าสู่ระบบก่อนใช้งาน”

**AI Response:** ตรวจ login API แล้วพบว่า cookie ถูกตั้ง `Secure` เพราะ `NODE_ENV=production` แต่ local ใช้ HTTP จึงเพิ่ม `COOKIE_SECURE=false` ใน Docker Compose และให้ Dockerfile bind `HOSTNAME=0.0.0.0`

**My Adjustment:** ผู้ใช้ต้องการรู้สาเหตุว่าทำไมใช้งานไม่ได้ จึงอธิบายเรื่อง secure cookie กับ HTTP localhost และตรวจ healthcheck จน container healthy

## Session 17: แก้สรุปเอกสารไม่ครบทั้งไฟล์

**Prompt:** ตรวจการสรุปไฟล์เอกสารแล้ว การสรุปยังสรุปไม่ได้ทั้งเอกสาร ให้เช็คและแก้ไข

**AI Response:** ตรวจ root cause ว่า chat route ใช้ Chroma top-5 retrieval ทุกกรณี แม้ผู้ใช้ถาม “สรุปทั้งเอกสาร” จึงเพิ่ม intent detection และดึง chunks ทั้งเอกสารจาก SQLite ตามลำดับแทน

**My Adjustment:** ผู้ใช้ต้องการให้สรุปเอกสารได้ครบมากขึ้น จึงเพิ่ม integration test สำหรับเอกสารที่มีมากกว่า 5 chunks

## Session 18: Audit ระบบว่ายังไม่สุดตรงไหน

**Prompt:** ช่วยเช็คทั้งระบบของ Project นี้ว่าส่วนไหนที่ยังไปไม่สุดและอธิบายว่าทำไม

**AI Response:** รัน `npm test`, `npm run lint`, `npm run build`, ตรวจ Docker health และ diagnostics แล้วสรุปว่า core assignment ใช้งานได้ แต่ยังมี gap เช่น mock auth, in-memory rate limit, synchronous upload/indexing, map-reduce summarization สำหรับเอกสารใหญ่มาก และ production secret handling

**My Adjustment:** ผู้ใช้ต้องการเอกสารอธิบาย project จึงให้สร้าง README, AI_JOURNAL และ DECISIONS เป็นภาษาไทยทั้งหมด
