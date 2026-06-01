# Architecture Decisions

เอกสารนี้สรุป decision สำคัญของ Project Trainee Knowledge Assistant โดยแต่ละหัวข้ออธิบายสถานการณ์ ตัวเลือก เหตุผล และ trade-offs เพื่อให้คนอ่านเข้าใจว่าทำไมระบบจึงถูกออกแบบแบบนี้

## Decision 1: เลือก Next.js only + API Routes แทนการแยก backend

### Context

โจทย์ต้องการ web application ที่มีทั้งหน้า login, chat, upload, usage และ API สำหรับคุยกับ AI โดยเน้นให้ setup ง่ายและสามารถ deploy/run ด้วย Docker Compose ได้ในคำสั่งเดียว การแยก backend ออกเป็นอีก service จะเพิ่มโครงสร้าง, port, deployment และ config ที่ต้องดูแลมากขึ้น ซึ่งไม่จำเป็นสำหรับ assignment นี้

### Alternatives Considered

ทางเลือกแรกคือแยก backend เป็น Express/NestJS/Fastify แล้วให้ Next.js เป็น frontend อย่างเดียว ข้อดีคือเหมาะกับระบบใหญ่และแยก scaling ได้ชัดเจน อีกทางเลือกคือใช้ Next.js App Router พร้อม API Routes ทั้งหมดใน project เดียว ซึ่งลดความซับซ้อนและทำให้ code อยู่ใน repo เดียว

### Why Next.js only

เลือก Next.js only เพราะโจทย์ระบุไว้ชัดเจน และเหมาะกับขอบเขตงานที่ต้องการให้เห็น end-to-end flow เราสามารถทำ protected routes, API endpoints, streaming SSE, upload file, Prisma และ OpenAI integration ได้ครบในตัวเดียว ทำให้ `docker compose up --build` สามารถ start ระบบหลักได้ง่าย

### Trade-offs

ข้อเสียคือถ้าระบบโตมาก ๆ API Routes อาจไม่เหมาะกับงาน background หนัก เช่น parse PDF ใหญ่มากหรือ indexing จำนวนมาก ในอนาคตควรแยก worker หรือ backend service เฉพาะทาง แต่สำหรับ assignment นี้ Next.js only ทำให้ architecture อ่านง่ายและลด setup cost

## Decision 2: เลือก Prisma + SQLite สำหรับ database หลัก

### Context

ระบบต้องเก็บ user, chat sessions, messages, documents, chunks และ token usage ข้อมูลเหล่านี้เป็น relational data ชัดเจนและต้อง query ตาม user/session/document การใช้ Prisma ช่วยให้ schema, migration และ type-safe query ชัดเจน ส่วน SQLite ทำให้ setup ง่ายและใช้ volume ใน Docker ได้ทันที

### Alternatives Considered

ตัวเลือกอื่นคือ PostgreSQL, MongoDB หรือ JSON file PostgreSQL แข็งแรงกว่าใน production และรองรับ concurrent writes ดีกว่า MongoDB เหมาะกับ document model แต่ความสัมพันธ์ระหว่าง chat/document/usage ในงานนี้เหมาะกับ relational มากกว่า JSON file ง่ายแต่ไม่เหมาะกับ migration และ query จริง

### Why SQLite

เลือก SQLite เพราะโจทย์ระบุ database เป็น SQLite และต้องการรันง่ายใน local/Docker Compose โดยไม่ต้องเพิ่ม database container อีกตัว Prisma ช่วยจัด migration และ seed user ได้ ทำให้ container startup flow ชัดเจนคือ migrate ก่อน seed แล้วค่อย start app

### Trade-offs

SQLite ไม่เหมาะกับ production ที่มีผู้ใช้พร้อมกันเยอะหรือ write สูง ถ้า project ขยายควร migrate ไป PostgreSQL โดย Prisma ช่วยให้ย้าย schema ได้ง่ายขึ้น แต่ต้องปรับ connection, deployment, backup และ migration strategy เพิ่ม

## Decision 3: เลือก Chroma เป็น Vector DB สำหรับ RAG

### Context

โจทย์ต้องการ RAG และระบุ Chroma เป็น vector database ระบบต้องเก็บ embeddings ของ document chunks และ retrieve context ตามคำถามผู้ใช้ Chroma เหมาะกับ local development เพราะรันเป็น container ได้ง่ายและมี client library สำหรับ Node.js

### Alternatives Considered

ตัวเลือกอื่นคือ Pinecone, Qdrant, Weaviate หรือ PostgreSQL + pgvector Pinecone เป็น managed service ใช้ง่ายแต่ต้องใช้ cloud account Qdrant แข็งแรงและ production-ready แต่เพิ่มรายละเอียด setup pgvector รวม relational กับ vector ได้ดี แต่โจทย์ระบุ SQLite เป็น database หลัก จึงไม่เข้ากันใน project นี้

### Why Chroma

เลือก Chroma เพราะตรงโจทย์และเหมาะกับ Docker Compose ระบบสามารถ start Chroma พร้อม web app และใช้ collection เดียวเก็บ metadata เช่น `userId`, `documentId`, `chunkId`, `chunkIndex` ได้ เมื่อ chat ระบบ query Chroma แล้วกลับไปดึง chunk จริงจาก SQLite เพื่อควบคุม permission ตาม user

### Trade-offs

Chroma local เหมาะกับ assignment และ demo แต่ production ต้องคิดเรื่อง persistence, backup, version upgrade และ reconciliation ระหว่าง SQLite กับ Chroma เพิ่ม ปัจจุบันมีปุ่ม re-index แล้ว แต่ยังไม่มี scheduled consistency check อัตโนมัติ

## Decision 4: ใช้ OpenAI Responses API และ Embeddings API

### Context

ระบบต้อง chat กับ AI และทำ embeddings สำหรับ RAG เมื่อมี `OPENAI_API_KEY` ควรใช้ API จริงเพื่อได้คุณภาพคำตอบและ token usage จริง แต่ project ต้องยัง demo ได้แม้ยังไม่ได้ตั้ง key ในบางช่วงของการพัฒนา

### Alternatives Considered

ตัวเลือกอื่นคือ Claude API, local LLM หรือ mock response ตลอดเวลา Claude ใช้ตอบได้ดีแต่โจทย์ล่าสุดเลือก OpenAI Local LLM ลดค่าใช้จ่ายแต่เพิ่มภาระ model runtime และ embedding compatibility ส่วน mock response อย่างเดียวไม่ตอบโจทย์การใช้งานจริง

### Why OpenAI

เลือก OpenAI เพราะมีทั้ง chat model และ embedding model ใน provider เดียว ระบบใช้ `text-embedding-3-small` สำหรับ embedding และใช้ model จาก env เช่น `gpt-5` สำหรับ response เมื่อ OpenAI ส่ง usage กลับมา ระบบบันทึก token usage จริงแทน estimate ทำให้หน้า usage มีความหมายมากขึ้น

### Trade-offs

ข้อจำกัดคือขึ้นกับ API key, quota, network และ model availability ถ้า key ใช้ไม่ได้ diagnostics จะแสดง error แต่ chat UX ยังควรแยก error ให้ละเอียดขึ้นในอนาคต อีกจุดคือเอกสารใหญ่มากอาจชน context limit จึงต้องมี strategy แบบ map-reduce summary เพิ่ม

## Decision 5: ใช้ MUI เป็น UI system หลัก

### Context

ผู้ใช้ต้องการเปลี่ยนการตกแต่งเป็น MUI ทั้งระบบ แต่ยังคงหน้าตาใกล้ ChatGPT และธีมสีขาว modern ระบบมีหลายหน้าจอ เช่น chat, upload, usage, admin diagnostics และ mobile drawer จึงควรใช้ component library เดียวเพื่อความสม่ำเสมอ

### Alternatives Considered

ตัวเลือกอื่นคือ CSS custom, Tailwind, shadcn/ui หรือ Headless UI CSS custom ยืดหยุ่นแต่ maintain ยาก Tailwind เร็วแต่โจทย์ขอ MUI shadcn/ui ดูดีแต่ไม่ใช่ MUI และจะเพิ่ม design system ซ้อนกัน

### Why MUI

เลือก MUI เพราะมี component ครบ เช่น Drawer, Dialog, Button, Paper, Typography, Chip และ theme system ช่วยควบคุม typography, spacing, color และ responsive behavior ในที่เดียว ทำให้สร้าง sidebar, mobile drawer, confirmation dialog และ diagnostics cards ได้เร็ว

### Trade-offs

MUI มี bundle และ styling abstraction ที่ต้องเข้าใจ ถ้า custom มากเกินไปอาจซับซ้อน แต่สำหรับ project นี้ช่วยให้ UI สม่ำเสมอและ test ได้ง่ายกว่าใช้ CSS ล้วน โดยยังคงใช้ global CSS เฉพาะส่วนจำเป็น เช่น font stack และ markdown body

## Decision 6: ใช้ Docker Compose เป็น runtime หลัก

### Context

โจทย์ต้องการให้รันด้วย Docker Compose และควรรันได้ด้วยคำสั่งเดียว ระบบมี service หลักคือ web app, document worker, Chroma และ Redis รวมถึงมี SQLite volume และ uploads volume เพื่อเก็บข้อมูลข้าม restart

### Alternatives Considered

ทางเลือกอื่นคือรันทุกอย่าง local ด้วย npm scripts หรือ deploy แยกบน cloud services Local scripts ง่ายตอน dev แต่ผู้ตรวจต้อง setup เองหลายขั้นตอน Cloud deployment ดีสำหรับ production แต่เกินขอบเขต assignment และต้องจัดการ secrets/domain เพิ่ม

### Why Docker Compose

เลือก Docker Compose เพราะทำให้ environment repeatable มากขึ้น web container build จาก Dockerfile, Chroma และ Redis ใช้ pinned image digest, SQLite และ uploads ใช้ named volumes, startup รัน migration/seed อัตโนมัติ และ healthcheck ตรวจ web, Chroma และ Redis ก่อนเริ่ม worker

### Trade-offs

Docker Compose local ยังขึ้นกับ Docker Desktop state และ image store ของเครื่องผู้ใช้ เคยเจอ metadata issue เช่น `No such container` ซึ่งไม่ใช่ bug ของ app โดยตรง Production จริงควรมี compose/prod หรือ orchestration แยก และใช้ Docker secrets แทน `.env`

## Decision 7: แยก document indexing เป็น background worker พร้อม lock/retry

### Context

เมื่อ upload เอกสาร ระบบต้อง save file, extract text, chunk, embed และ index เข้า Chroma ขั้นตอนเหล่านี้อาจช้า โดยเฉพาะ PDF ใหญ่, OpenAI embedding ช้า หรือ Chroma มีปัญหา ถ้าทำทั้งหมดใน request เดียว ผู้ใช้จะรอนานและเสี่ยง timeout จึงปรับให้ upload สร้างเอกสารสถานะ `queued` แล้วให้ worker ทำงานต่อ

### Alternatives Considered

ทางเลือกแรกคือทำ synchronous ต่อไปเพราะเรียบง่าย แต่มีปัญหาเรื่อง timeout และ UX ทางเลือกที่สองคือใช้ queue เต็มรูปแบบ เช่น BullMQ/Redis Streams พร้อม dead-letter queue ซึ่ง production-ready กว่าแต่เพิ่ม dependency และความซับซ้อน ทางเลือกที่สามคือใช้ SQLite document table เป็น job state ก่อน โดยเพิ่ม lock/retry metadata

### Why DB-backed worker first

เลือก DB-backed worker เพราะเข้ากับ stack เดิมที่ใช้ Prisma + SQLite และยังรันด้วย Docker Compose ได้ง่าย worker ใช้ fields เช่น `indexingAttempts`, `lockedBy`, `lockedAt`, `nextAttemptAt`, `lastIndexedAt` เพื่อ claim งาน, recover stale processing jobs, retry ด้วย backoff และเก็บ `failedReason` เมื่อเกิดปัญหา ถ้า PDF เสียจะ fail ทันที แต่ถ้า Chroma ล้มจะเป็น `ready_without_chroma` และยังใช้ SQLite fallback ได้

### Trade-offs

ข้อดีคือ UX ดีขึ้นและลด timeout โดยไม่ต้องเพิ่ม queue service หนัก ๆ แต่ trade-off คือ polling worker ยังไม่แข็งเท่า queue จริง ถ้างานเยอะมากหรือมีหลาย instance ควรย้ายไป BullMQ/Redis Streams และเพิ่ม dead-letter queue, job dashboard และ retry policy ที่ละเอียดกว่า

## Decision 8: แก้สรุปทั้งเอกสารด้วย comprehensive summary cache + ordered SQLite chunks

### Context

หลังใช้งานจริงพบว่าการสรุปเอกสารยังสรุปไม่ครบ เพราะ chat route ใช้ RAG retrieval แบบ top-5 ทุกกรณี แม้ผู้ใช้เลือกเอกสารและถามว่า “สรุปเอกสารนี้ทั้งหมด” ทำให้ OpenAI ได้ context แค่บาง chunks

### Alternatives Considered

ทางเลือกแรกคือเพิ่ม top-k จาก 5 เป็นจำนวนมากขึ้น แต่ยังไม่รับประกันว่าครบทั้งเอกสารและอาจเรียงลำดับผิด อีกทางเลือกคือใช้ Chroma query แบบกว้างมาก แต่ vector search ไม่เหมาะกับคำสั่งสรุปทั้งไฟล์ วิธีที่ตรงกว่า คือสร้าง summary cache ตอน worker index เอกสาร และดึง chunks ทั้งเอกสารจาก SQLite ตาม `chunkIndex`

### Why summary cache + ordered chunks

เลือก summary cache + ordered chunks เพราะ document chunks ถูกบันทึกครบอยู่แล้วและมีลำดับแน่นอน ส่วน summary cache ช่วยให้เอกสารใหญ่มีภาพรวมก่อนส่ง chunks เข้า prompt เมื่อ intent เป็นการสรุปทั้งเอกสาร ระบบจึงไม่ควรถาม Chroma ว่า chunk ไหนคล้ายคำถาม แต่ควรใช้ภาพรวมเอกสารและเนื้อหาตามลำดับเท่าที่ token budget อนุญาต

หลังผู้ใช้ต้องการสรุปแบบละเอียดขึ้น จึงปรับ summary cache ให้ครอบคลุมทุก chunk ตามลำดับ ไม่ sampling เฉพาะบางช่วง และเพิ่ม comprehensive summary mode ใน prompt เพื่อกำชับให้ตอบเป็นหัวข้อภาพรวม, ประเด็นสำคัญทั้งหมด, รายละเอียดตามลำดับเอกสาร, ข้อสรุป และข้อจำกัดหรือข้อมูลที่ยังไม่ชัดเจน

เมื่อพบว่าคำตอบยังอ่านยาก จึงเพิ่ม response template ที่ชัดเจนกว่าเดิมและแยก prompt ของโหมดสรุปละเอียดออกจากคำสั่งทั่วไปที่เคยบอกให้ “กระชับ” เพื่อไม่ให้ model สับสนระหว่าง “สรุปสั้น” กับ “สรุปละเอียดและเป็นระบบ”

### Trade-offs

วิธีนี้ดีสำหรับเอกสารขนาดเล็กถึงกลางและลดโอกาสสรุปหลุดบริบท แต่ summary cache ปัจจุบันยังเป็น extractive summary ที่ compact เนื้อหาแต่ละ chunk ไม่ใช่ LLM-generated map-reduce summary ถ้าเอกสารใหญ่มากยังควรเพิ่ม hierarchical/map-reduce summarization แบบ background job และเก็บ summary หลายระดับ

## Decision 11: บังคับปุ่มสรุปเอกสารให้เลือก document ก่อนส่ง chat

### Context

ปุ่ม “สรุปเอกสาร” ใน composer เดิมเป็นเพียง quick prompt ที่ส่งข้อความ “สรุปเอกสารที่อัปโหลดล่าสุด...” เข้า chat โดยไม่แนบ `documentId` แม้ UI จะมี dropdown เลือกเอกสารอยู่แล้ว ผลคือ backend ไม่สามารถรู้ได้ว่าต้องสรุปเอกสารไหนแบบ full-document context และอาจตกไปใช้ RAG retrieval แบบ top-k เหมือนคำถามทั่วไป ทำให้สรุปไม่ครบหรือไม่ตรงกับไฟล์ที่ผู้ใช้ตั้งใจ

### Alternatives Considered

ทางเลือกแรกคือปล่อยให้ปุ่มใช้เอกสารทั้งหมดและให้ backend เลือกเอง แต่เสี่ยงสรุปผิดไฟล์เมื่อมีหลายเอกสาร ทางเลือกที่สองคือเลือกเอกสารล่าสุดอัตโนมัติ แต่ชื่อ “ล่าสุด” อาจไม่ตรงกับสิ่งที่ผู้ใช้ต้องการหลังมีการ upload/delete/re-index หลายครั้ง ทางเลือกที่ชัดกว่า คือบังคับให้ผู้ใช้เลือกเอกสารใน dropdown ก่อน แล้วส่ง `documentId` ไปกับ prompt

### Why selected document only

เลือกให้ปุ่มสรุปเอกสารทำงานเฉพาะเมื่อมี `documentId` เพราะทำให้ intent ชัดเจนทั้งฝั่ง UI และ API ปุ่มจึง disable เมื่อยังไม่เลือกเอกสารและแสดงข้อความ “เลือกเอกสารก่อนสรุป” เมื่อเลือกแล้วจะส่ง prompt กลาง `ช่วยสรุปเอกสารนี้ทั้งหมดแบบละเอียด เป็นระบบ และอ่านเข้าใจง่าย` พร้อม `documentId` ทำให้ `/api/chat` เข้า `summaryMode: comprehensive` และใช้ `retrieveWholeDocumentContext`

### Trade-offs

ข้อดีคือสรุปตรงเอกสารที่ผู้ใช้เลือกและลดความกำกวม ข้อเสียคือผู้ใช้ต้องเลือกเอกสารก่อนหนึ่งขั้น ถ้าต้องการ UX ที่เร็วขึ้นในอนาคตสามารถเพิ่ม default selection เป็นเอกสาร ready ล่าสุดได้ แต่ควรแสดงให้ชัดว่าระบบเลือกไฟล์ไหนเพื่อไม่ให้เกิดการสรุปผิดเอกสาร

## Decision 12: ใช้ MUI theme กลาง + palette ใหม่ + logo เพื่อให้ UX สม่ำเสมอ

### Context

หลังระบบ backend และ RAG ใช้งานได้มากขึ้น ผู้ใช้พบว่า UI ยังมีบางจุดที่เป็นแค่หน้าตา, ข้อความบางส่วนยังเทคนิคเกินไป, spacing บางจุดชิดกัน และระบบยังไม่มี logo ทำให้ประสบการณ์ใช้งานไม่รู้สึกเป็น product เดียวกัน นอกจากนี้ยังต้องใช้ palette ใหม่ที่กำหนดชัดเจนคือ primary teal, background เทาอ่อน, surface ขาว, text เทาเข้ม และ accent เขียว

### Alternatives Considered

ทางเลือกแรกคือแก้ CSS เฉพาะจุดในแต่ละ component ซึ่งเร็วแต่จะทำให้สี ระยะห่าง และ typography กระจายอยู่หลายไฟล์ อีกทางเลือกคือทำ design system แยกเต็มรูปแบบ ซึ่งใหญ่เกิน project นี้ ทางเลือกที่เหมาะกว่าคือใช้ MUI theme กลางเป็น source of truth แล้วใช้ CSS เฉพาะส่วนที่ MUI theme คุมไม่ได้ เช่น global body, markdown content และ scrollbar

### Why MUI theme + focused CSS

เลือกปรับผ่าน MUI theme เพราะ project ใช้ MUI ทั้งระบบอยู่แล้ว จึงควบคุม palette, typography, button, paper, card, chip และ input ได้จากที่เดียว สีหลักถูกตั้งเป็น `#14B8A6`, background เป็น `#F9FAFB`, surface เป็น `#FFFFFF`, text เป็น `#1F2937` และ accent เป็น `#84CC16` ส่วน logo ถูกทำเป็น component เดียวแล้ว reuse ใน login, sidebar และ top bar เพื่อให้ identity ของระบบชัดเจน

ในเชิง UX จึงปรับเมนู mobile ให้เป็น action จริง, ลดคำอธิบายที่ไม่จำเป็น, เปลี่ยนข้อความเป็นภาษาไทยที่ผู้ใช้เข้าใจง่าย, เพิ่ม spacing ระหว่างส่วนสำคัญ, ทำ chat auto-scroll และปรับ upload/composer ให้แสดงสถานะเอกสารพร้อมใช้งานชัดเจนกว่าเดิม

### Trade-offs

ข้อดีคือ UI สม่ำเสมอและต่อยอดง่ายขึ้น เพราะ component ใหม่สามารถใช้ theme เดิมได้ทันที ข้อเสียคือ MUI theme ยังไม่ครอบทุก edge case เช่น markdown จาก AI และ layout เฉพาะจุด จึงยังต้องมี global CSS บางส่วน อีกจุดคือ logo ปัจจุบันเป็น CSS-based mark ไม่ใช่ไฟล์ brand asset ถ้าระบบใช้จริงในองค์กรควรออกแบบ brand guideline และ export logo เป็น SVG/PNG อย่างเป็นทางการ

## Decision 9: ใช้ Redis rate limit พร้อม SQLite fallback

### Context

ระบบเดิมมี rate limit จาก memory และต่อมาใช้ SQLite bucket ซึ่งดีกว่า memory แต่ถ้ารันหลาย instance หรือ restart container บ่อย ๆ การนับ request ยังไม่เหมาะกับ production หลาย instance ผู้ใช้ต้องการ rate limit/storage quota ที่จริงจังขึ้น จึงเพิ่ม Redis เป็น shared counter

### Alternatives Considered

ทางเลือกแรกคือใช้ in-memory ต่อไป ซึ่งง่ายแต่ไม่แชร์ข้าม process ทางเลือกที่สองคือใช้ SQLite ต่อไป ซึ่ง persistent แต่ไม่เหมาะกับ write concurrency สูง ทางเลือกที่สามคือใช้ Redis/Upstash เป็น rate limit backend ซึ่งเหมาะกับ counter ที่ต้องหมดอายุตามเวลาและแชร์ข้าม service

### Why Redis with fallback

เลือก Redis เป็น backend หลักเมื่อมี `RATE_LIMIT_REDIS_URL` เพราะรองรับ atomic increment และ TTL ได้ตรงกับ rate limit window ส่วน SQLite fallback ยังถูกเก็บไว้เพื่อให้ local/dev หรือกรณี Redis ชั่วคราวมีปัญหา ระบบยังใช้งานต่อได้ Docker Compose จึงเพิ่ม Redis service และ pin image ด้วย digest

### Trade-offs

ข้อดีคือ production-ready กว่า SQLite สำหรับ rate limit และ scale หลาย instance ได้ง่ายขึ้น ข้อเสียคือเพิ่ม service ที่ต้องดูแลอีกตัว และถ้า production ต้องการ strict enforcement จริง ๆ ควรตั้ง Redis ให้ highly available และอาจไม่ควร fallback แบบเงียบในบาง deployment

## Decision 10: เพิ่ม Admin diagnostics และ structured worker logs แทน observability เต็มรูปแบบ

### Context

หลังระบบมี OpenAI, Chroma, Redis, SQLite และ worker แล้ว การ debug ด้วยการดูหน้า chat อย่างเดียวไม่พอ ต้องรู้ว่า service ไหนล่ม, migration ใช้ครบไหม, upload directory เขียนได้ไหม, worker มี stale job หรือไม่ และ token usage รวมเป็นอย่างไร

### Alternatives Considered

ทางเลือกที่ production-ready คือ OpenTelemetry, Prometheus, Grafana, log drain และ alerting แต่อาจใหญ่เกิน assignment อีกทางเลือกคือทำ diagnostics API/page ในแอปเองและ structured logs จาก worker ซึ่งเพียงพอสำหรับ local/Docker Compose และตรวจจาก browser ได้

### Why diagnostics first

เลือก diagnostics page เพราะผู้ใช้สามารถเข้า `/admin` แล้วเห็นสถานะ OpenAI, Chroma, Redis, Database, upload directory และ operational metrics ได้ทันที Worker log ถูกเปลี่ยนเป็น JSON event เช่น `document_worker_started` และ `document_worker_processed` เพื่อให้อ่านและส่งต่อเข้า log system ได้ง่ายขึ้นในอนาคต

### Trade-offs

diagnostics page ช่วย debug ได้เร็ว แต่ยังไม่ใช่ monitoring เต็มรูปแบบ ไม่มี alert, dashboard ระยะยาว หรือ distributed tracing ถ้าระบบถูกใช้จริงใน production ควรเพิ่ม external metrics/alerting และ request id ต่อทุก API call
