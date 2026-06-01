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

**AI Response:** รัน `npm test`, `npm run lint`, `npm run build`, ตรวจ Docker health และ diagnostics แล้วสรุปว่า core assignment ใช้งานได้ แต่ ณ เวลานั้นยังมี gap เช่น mock auth, in-memory rate limit, synchronous upload/indexing, map-reduce summarization สำหรับเอกสารใหญ่มาก และ production secret handling

**My Adjustment:** ผู้ใช้ต้องการให้จัดลำดับ gap ที่ควรทำต่อและให้ระบบใช้งานได้สมบูรณ์ขึ้น จึงใช้ผล audit นี้เป็นรายการงานต่อเนื่อง เช่น แยก indexing เป็น background worker, เพิ่ม rate limit ที่แข็งแรงขึ้น, ปรับสรุปเอกสารใหญ่ และเพิ่ม production hardening

## Session 19: ทำระบบที่ยังไม่สมบูรณ์ให้ใช้งานได้มากขึ้น

**Prompt:** ให้ทำระบบต่อที่ยังไม่สมบูรณ์ โดยโฟกัส Chroma local, Docker Compose คำสั่งเดียว, สรุปเอกสารทั้งไฟล์, และตรวจว่าระบบยังมีส่วนไหนใช้งานไม่ได้

**AI Response:** แก้ Chroma local ให้ใช้งานกับ Docker Compose ได้จริง, เพิ่ม document worker แยกจาก request, เพิ่ม retry/re-index, ปรับ flow upload ให้เอกสารเข้า `queued` แล้ว worker เปลี่ยนเป็น `ready`, เพิ่ม full-document context handling และตรวจด้วย Docker, integration test, e2e test

**My Adjustment:** ผู้ใช้รัน `docker compose up` จริงและส่ง log กลับมา ทำให้ต้องแก้ Docker image tag, `.dockerignore`, startup migration/seed, cookie secure mode, และตรวจ flow จริงแบบ login -> upload -> ready -> chat citation

## Session 20: เพิ่มความแข็งแรงข้อ 2-8 หลัง audit

**Prompt:** ให้ทำตั้งแต่ข้อ 2-8 ที่แนะนำไว้ ได้แก่ worker/job queue, Redis rate limit, fallback search, summary strategy, production secrets, observability และ tests เพิ่มเติม พร้อมตรวจซ้ำว่าระบบใช้งานได้ปกติ

**AI Response:** เพิ่ม job lock/retry/backoff ให้ document worker, เพิ่ม fields `indexingAttempts`, `lockedBy`, `lockedAt`, `nextAttemptAt`, `lastIndexedAt`, เพิ่ม `DocumentSummary` สำหรับ summary cache, เพิ่ม Redis-backed rate limit พร้อม SQLite fallback, เพิ่ม Redis service ใน Docker Compose, เพิ่ม fallback search แบบ ranking หลายคำ, เพิ่ม diagnostics สำหรับ Redis และ operational metrics, เพิ่ม structured worker logs, เพิ่ม `docker-compose.prod.yml` และอัปเดต tests

**My Adjustment:** ผู้ใช้ต้องการให้เอกสารประกอบ project ตรงกับระบบล่าสุด จึงให้กลับมาเช็ค README, AI_JOURNAL และ DECISIONS ให้สะท้อนระบบจริง ไม่ใช่ข้อมูลเก่าก่อนเพิ่ม worker/Redis/summary cache

## Session 21: ตรวจและแก้เอกสารให้ตรงกับระบบล่าสุด

**Prompt:** ให้เข้าไปเช็ค `README.md`, `AI_JOURNAL.md`, `DECISIONS.md` และใส่ให้เหมือนกับระบบ

**AI Response:** ตรวจพบว่า README บางส่วนอัปเดตแล้ว แต่ Main Flow ยังอธิบาย upload/indexing แบบ synchronous และ DECISIONS ยังมี decision เก่าเรื่อง synchronous upload/indexing จึงต้องปรับเอกสารให้ตรงกับระบบล่าสุดที่มี worker, Redis, summary cache, fallback ranking, diagnostics และ production compose

**My Adjustment:** ผู้ใช้ต้องการเอกสารภาษาไทยที่อ่านต่อเนื่องและอธิบายเหตุผลเชิงสถาปัตยกรรมได้ตรงกับ implementation ปัจจุบัน

## Session 22: ปรับสรุปเอกสารให้ละเอียดและครอบคลุมกว่าเดิม

**Prompt:** ฉันอยากได้ให้มันสรุปแบบระเอียดที่ครอบคลุมทั้งหมดในข้อมูลที่เอกสารมี

**AI Response:** เพิ่ม test เพื่อยืนยันว่า summary cache ต้องครอบคลุมทุก chunk ไม่ใช่ sampling เฉพาะบางส่วน และเพิ่ม test ให้ prompt มีคำสั่งสรุปแบบละเอียด จากนั้นปรับ `buildExtractiveDocumentSummary` ให้เรียงทุก chunk ตามลำดับเอกสาร, เพิ่ม summary source version เพื่อบังคับ regenerate cache, และส่ง `summaryMode: "comprehensive"` เข้า assistant prompt เมื่อผู้ใช้ถามสรุปทั้งเอกสาร

**My Adjustment:** ผู้ใช้ต้องการให้ผลสรุปไม่ตกหล่นเนื้อหาสำคัญ จึงต้องเปลี่ยนพฤติกรรมจาก “ดึง context บางส่วนที่เกี่ยวข้อง” เป็น “ใช้ภาพรวมและทุกส่วนของเอกสารเท่าที่ token budget อนุญาต” พร้อมตรวจด้วย test, lint และ production build

## Session 23: ปรับคำตอบสรุปให้อ่านง่ายและเป็นระเบียบ

**Prompt:** AI ที่สรุปเอกสารให้สรุปแปลก ๆ ไม่เป็นระเบียบและอ่านไม่เข้าใจ ให้เช็คใหม่และแก้ไข

**AI Response:** ตรวจพบว่า prompt เดิมมีคำสั่งขัดกันเอง คือบอกให้ “กระชับ” แต่ผู้ใช้ต้องการสรุปละเอียด และยังไม่มี template บังคับรูปแบบคำตอบ จึงปรับ `buildAssistantPrompt` ให้ comprehensive summary mode ใช้คำสั่งเฉพาะสำหรับการสรุปละเอียด, ห้ามตอบเป็นย่อหน้ายาว, ห้าม dump chunk ดิบ และบังคับหัวข้อ Markdown เช่น ภาพรวม, ประเด็นสำคัญ, รายละเอียดตามลำดับเอกสาร, ข้อสรุป และข้อจำกัด

**My Adjustment:** ผู้ใช้ต้องการให้คำตอบใช้งานอ่านจริงได้ จึงเพิ่ม regression test ใน `tests/assistant-prompt.test.ts` เพื่อกันไม่ให้ prompt กลับไปใช้คำว่า “กระชับ” ในโหมดสรุปละเอียด และยืนยันว่ามี template คำตอบที่อ่านง่าย

## Session 24: แก้ปุ่มสรุปเอกสารให้ผูกกับเอกสารที่เลือก

**Prompt:** ปุ่ม “สรุปเอกสาร” ทำงานยังไง และให้แก้ส่วนที่ควรแก้พร้อมตรวจซ้ำ

**AI Response:** ตรวจพบว่าปุ่มเดิมส่ง quick prompt เฉย ๆ โดยไม่ส่ง `documentId` ทำให้ backend ไม่เข้าโหมด `retrieveWholeDocumentContext` และอาจกลายเป็น RAG top-k ปกติ จึงเพิ่ม `summary-action.ts`, เปลี่ยนปุ่มให้ disable จนกว่าจะเลือกเอกสาร, ส่ง prompt กลางแบบสรุปทั้งเอกสารพร้อม `documentId`, และเพิ่ม Playwright e2e test สำหรับ flow นี้

**My Adjustment:** ผู้ใช้ต้องการให้ปุ่มทำงานตรงกับความคาดหวัง ไม่ใช่แค่ข้อความลัด จึงตรวจด้วย unit test, lint และ build ส่วน e2e browser test ถูกเพิ่มไว้แล้วแต่การรันจริงล่าสุดติด sandbox/approval limit ของเครื่องมือ

## Session 25: ปรับ UX/UI ใหม่ทั้งระบบ

**Prompt:** ปรับแต่ง UX UI ใหม่ทั้งหมด โดยเอาคำอธิบายที่ไม่จำเป็นออก ทำข้อความภาษาไทยให้อ่านง่าย ทำ UI ที่เป็น placeholder ให้ใช้งานจริง เพิ่ม gap/spacing, เพิ่ม logo, ทำ chat auto-scroll และใช้ palette `#14B8A6`, `#F9FAFB`, `#FFFFFF`, `#1F2937`, `#84CC16`

**AI Response:** ปรับ MUI theme กลางให้ใช้ palette ใหม่, เพิ่ม `AppLogo` แล้วนำไปใช้ที่ login/sidebar/top bar, ปรับ copy หน้า login/chat/upload/usage/admin เป็นภาษาไทยที่สั้นและเข้าใจง่าย, เพิ่ม spacing ใน layout หลัก, ทำเมนู mobile “เพิ่มเติม” ให้เปิด MUI menu จริง, ปรับปุ่มอัปโหลดให้เลือกไฟล์เดิมซ้ำได้, เพิ่ม upload polling สำหรับเอกสารที่ยังประมวลผล, ปรับปุ่มสรุปเอกสารให้มี tooltip/สถานะ disabled ที่ชัดเจน และเพิ่ม auto-scroll ใน chat เมื่อมีข้อความใหม่หรือ AI กำลัง stream

**My Adjustment:** ผู้ใช้ต้องการ UX ที่ใช้งานง่ายที่สุดและลดส่วนที่เป็นแค่หน้าตา จึงตรวจทั้งระบบในมุมผู้ใช้จริงว่าเมนูไปหน้าได้, ปุ่มที่แสดงบน UI มี behavior, ข้อความไม่เทคนิคเกินไป และเอกสาร README/AI_JOURNAL/DECISIONS ต้องสะท้อนระบบ UX ล่าสุดก่อน push

## Session 26: ทำ UX/UI ที่ยังไปไม่สุดให้ครบ 8 จุด

**Prompt:** ทำทั้งหมดตั้งแต่ข้อ 1-8 ได้แก่สถานะเอกสารหลังอัปโหลด, แสดงว่า AI ใช้เอกสารไหน, error state ที่อ่านง่าย, empty state ที่พาไป action ต่อ, document picker ที่ใช้ง่าย, citation UX, mobile composer/menu QA และ admin diagnostics ที่มี next step พร้อมอัปเดต README, AI_JOURNAL, DECISIONS และ push

**AI Response:** เพิ่ม helper กลาง `document-status.ts` เพื่อแปลงสถานะเอกสารเป็น label, step, progress, helper text และ next step, เพิ่ม `status-feedback.ts` เพื่อแสดง error/status เป็นข้อความไทยที่บอกสาเหตุและสิ่งที่ต้องทำต่อ, ปรับ upload view ให้มี progress/step ต่อเอกสาร, เปลี่ยน document picker เป็น MUI Autocomplete ที่ค้นหาไฟล์ได้และแยกกลุ่มพร้อมใช้งาน/ยังไม่พร้อม, lift selected document state ไปที่ chat view เพื่อแสดง “กำลังถามจาก”, เพิ่ม citation metadata จาก backend และ citation dialog ที่เปิดดู excerpt ต้นทางได้, เพิ่ม empty state พร้อมปุ่ม action ใน upload/usage และเพิ่ม next step ใน admin diagnostics

**My Adjustment:** ผู้ใช้ต้องการให้ UX/UI ทุกส่วนที่จำเป็นใช้งานได้จริง ไม่ใช่เฉพาะหน้าตา จึงเพิ่ม/ปรับ Playwright e2e สำหรับ summary shortcut, selected document context, clickable citation และ mobile actions menu พร้อมรัน lint, test, build และ e2e ก่อน push

## Session 27: ปิด gap UX/UI production ที่เหลือ 4 จุด

**Prompt:** ทำทั้งหมดตั้งแต่ข้อ 1-4 ที่ยังไปไม่สุด ได้แก่ citation ระดับหน้า/preview, progress เอกสารที่ละเอียดกว่าเดิม, QA mobile composer/menu และ error recovery ที่มีปุ่ม action พร้อมอัปเดตเอกสารและ push

**AI Response:** เพิ่ม migration สำหรับ `Document.jobStage`, `Document.jobProgress` และ `DocumentChunk.pageNumber`, ปรับ PDF/TXT extraction ให้คืน page metadata, เพิ่ม `chunkTextPages` เพื่อให้ chunks รักษาเลขหน้า, ให้ worker อัปเดต stage/progress ระหว่าง extracting, chunking, saving chunks, summarizing, embedding/re-indexing และ ready/fallback/failed, เพิ่ม `/api/documents/[documentId]?chunkId=...` สำหรับ citation preview, ปรับ citation dialog ให้โหลดข้อความ chunk จริงพร้อมแสดงหน้าและจำนวน chunks, เพิ่ม recovery action ใน error/status alert เช่นเปิด Diagnostics หรือไปหน้าอัปโหลด และเพิ่ม mobile e2e สำหรับ composer controls

**My Adjustment:** ผู้ใช้ต้องการปิด UX/UI ที่จำเป็นจริง ๆ ให้ครบ จึงตรวจด้วย lint, unit/integration tests, production build และจะรัน Playwright e2e/Docker/Browser ก่อน push เพื่อยืนยันว่า UX ใช้งานได้ปกติทั้ง desktop และ mobile

## Session 28: ทำ UX/Logic ข้อ 2-8 ให้ไปไกลขึ้น

**Prompt:** ทำข้อที่ 2-8 จาก audit ได้แก่ PDF citation viewer, progress ต่อ chunk, admin job monitor, fallback search ที่ดีกว่า, hierarchical summary, mobile regression, recovery action จาก admin และอัปเดต README/AI_JOURNAL/DECISIONS พร้อม push

**AI Response:** เพิ่ม `totalChunks`, `processedChunks`, `embeddedChunks` ใน schema และ migration เพื่อให้ worker บอกความคืบหน้าต่อ chunk ได้จริงขึ้น, เปลี่ยน Chroma indexing เป็น batch พร้อม callback อัปเดต progress, เพิ่ม protected file endpoint `/api/documents/[documentId]/file`, ปรับ citation dialog ให้เปิดไฟล์ต้นฉบับและฝัง PDF preview ไปยังหน้าที่อ้างอิง, เพิ่ม `/api/admin/jobs` และ Job Monitor ในหน้า admin สำหรับดูคิวงาน retry/cancel/reconcile, ปรับ fallback search เป็น BM25-lite ที่รองรับภาษาไทยแบบ character n-gram และปรับ summary cache ให้จัดกลุ่มเอกสารยาวเป็น hierarchical sections พร้อมช่วงหน้า

**My Adjustment:** ผู้ใช้ต้องการให้ระบบใช้งานจริงและตรวจซ้ำ จึงเพิ่ม test ก่อนแก้ code สำหรับ summary, fallback search, admin jobs, file preview และ progress fields จากนั้นรัน unit/integration, lint, build และเตรียมรัน Playwright/Docker ก่อน commit/push

## Session 29: Cleanup ไฟล์และโครงสร้างที่ไม่ได้ใช้งาน

**Prompt:** clean project และอัปเดต README, AI_JOURNAL, DECISIONS ให้ตรงกับระบบแล้ว push

**AI Response:** ตรวจ inventory ของ project ด้วย `git status`, `rg --files`, `find`, และ search import references พบว่า `src/components/ui` กับ `src/components/layout` เป็นโฟลเดอร์ว่างที่ไม่ได้อยู่ใน git, build/test outputs เช่น `.next`, `.next-stale-typography-build-cache`, `playwright-report`, `test-results` ลบได้ และ dependency `lucide-react` ไม่ถูก import เพราะระบบใช้ MUI icons แล้ว จึงลบ dependency ออกจาก `package.json`/`package-lock.json`

**My Adjustment:** ผู้ใช้ต้องการ cleanup แบบปลอดภัย จึงไม่ลบ runtime data ใน `data/`, ไม่ลบ migrations, scripts, Docker compose variants หรือเอกสาร assignment และจะตรวจ lint/test/build ก่อน push เพื่อยืนยันว่า dependency cleanup ไม่ทำให้ระบบพัง
