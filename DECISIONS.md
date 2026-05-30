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

โจทย์ต้องการให้รันด้วย Docker Compose และควรรันได้ด้วยคำสั่งเดียว ระบบมีอย่างน้อย 2 service คือ web app และ Chroma รวมถึงต้องมี SQLite volume และ uploads volume เพื่อเก็บข้อมูลข้าม restart

### Alternatives Considered

ทางเลือกอื่นคือรันทุกอย่าง local ด้วย npm scripts หรือ deploy แยกบน cloud services Local scripts ง่ายตอน dev แต่ผู้ตรวจต้อง setup เองหลายขั้นตอน Cloud deployment ดีสำหรับ production แต่เกินขอบเขต assignment และต้องจัดการ secrets/domain เพิ่ม

### Why Docker Compose

เลือก Docker Compose เพราะทำให้ environment repeatable มากขึ้น web container build จาก Dockerfile, Chroma ใช้ pinned image digest, SQLite และ uploads ใช้ named volumes, startup รัน migration/seed อัตโนมัติ และ healthcheck ตรวจทั้ง web กับ Chroma

### Trade-offs

Docker Compose local ยังขึ้นกับ Docker Desktop state และ image store ของเครื่องผู้ใช้ เคยเจอ metadata issue เช่น `No such container` ซึ่งไม่ใช่ bug ของ app โดยตรง Production จริงควรมี compose/prod หรือ orchestration แยก และใช้ Docker secrets แทน `.env`

## Decision 7: ใช้ synchronous upload/indexing ก่อน แล้วค่อยระบุเป็น known limitation

### Context

เมื่อ upload เอกสาร ระบบต้อง save file, extract text, chunk, embed และ index เข้า Chroma ขั้นตอนนี้ทำใน request เดียวเพื่อให้ flow เข้าใจง่ายและ user ได้ผลลัพธ์ทันทีว่าเอกสาร ready หรือ ready_without_chroma

### Alternatives Considered

ทางเลือกที่ robust กว่าคือ queue + background worker เช่น BullMQ/Redis, database jobs หรือ workflow engine วิธีนั้นเหมาะกับไฟล์ใหญ่และ production แต่ต้องเพิ่ม service, job state, retry policy และ progress UI

### Why synchronous first

เลือก synchronous ก่อนเพราะ assignment ต้องการระบบที่ setup ง่ายและเห็นครบ flow ใน project เดียว การทำใน request เดียวทำให้ integration test เขียนง่าย และทำให้สถานะเอกสารเปลี่ยนชัดเจนทันทีหลัง upload

### Trade-offs

ข้อเสียคือไฟล์ใหญ่หรือ OpenAI/Chroma ช้าอาจทำให้ request นานหรือ timeout ในอนาคตควรแยก worker, เพิ่ม queue, retry backoff, progress status และหน้า admin สำหรับดู job failed/retry

## Decision 8: แก้สรุปทั้งเอกสารด้วย ordered SQLite chunks แทน Chroma top-k

### Context

หลังใช้งานจริงพบว่าการสรุปเอกสารยังสรุปไม่ครบ เพราะ chat route ใช้ RAG retrieval แบบ top-5 ทุกกรณี แม้ผู้ใช้เลือกเอกสารและถามว่า “สรุปเอกสารนี้ทั้งหมด” ทำให้ OpenAI ได้ context แค่บาง chunks

### Alternatives Considered

ทางเลือกแรกคือเพิ่ม top-k จาก 5 เป็นจำนวนมากขึ้น แต่ยังไม่รับประกันว่าครบทั้งเอกสารและอาจเรียงลำดับผิด อีกทางเลือกคือใช้ Chroma query แบบกว้างมาก แต่ vector search ไม่เหมาะกับคำสั่งสรุปทั้งไฟล์ วิธีที่ตรงกว่า คือดึง chunks ทั้งเอกสารจาก SQLite ตาม `chunkIndex`

### Why ordered SQLite chunks

เลือก ordered SQLite chunks เพราะ document chunks ถูกบันทึกครบอยู่แล้วและมีลำดับแน่นอน เมื่อ intent เป็นการสรุปทั้งเอกสาร ระบบจึงไม่ควรถาม Chroma ว่า chunk ไหนคล้ายคำถาม แต่ควรส่งเนื้อหาตามลำดับเอกสารให้ model สรุป

### Trade-offs

วิธีนี้ดีสำหรับเอกสารขนาดเล็กถึงกลาง แต่ถ้าเอกสารใหญ่มากยังชน context limit ได้ จึงมี config `FULL_DOCUMENT_CONTEXT_MAX_CHUNKS` และ `FULL_DOCUMENT_CONTEXT_MAX_TOKENS` ในอนาคตควรเพิ่ม map-reduce summarization เพื่อสรุปเอกสารใหญ่มากอย่างเป็นระบบ
