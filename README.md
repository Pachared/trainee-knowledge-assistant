# Trainee Knowledge Assistant

Trainee Knowledge Assistant คือ web application สำหรับอัปโหลดเอกสาร PDF/TXT แล้วสนทนากับ AI โดยใช้ข้อมูลจากเอกสารเป็น context ผ่านแนวทาง RAG ระบบนี้สร้างด้วย Next.js เท่านั้น ใช้ API Routes ของ Next.js, Prisma, SQLite, Chroma และ OpenAI พร้อม Docker Compose เพื่อให้รันทั้ง web app และ vector database ได้ในคำสั่งเดียว

## Tech Stack

- Framework: Next.js 16 + TypeScript + React 19
- UI: MUI ทั้งระบบ พร้อม responsive layout สำหรับ desktop, tablet และ mobile
- API: Next.js API Routes / App Router route handlers
- Auth: mock user จาก env, bcrypt, JWT session cookie และ protected routes
- Database: SQLite ผ่าน Prisma ORM และ Prisma migrations
- Vector DB: Chroma สำหรับเก็บ embeddings และ retrieval
- AI: OpenAI Responses API และ Embeddings API
- File processing: PDF/TXT upload, path sanitization, PDF parser, text chunking
- Testing: Vitest integration tests และ Playwright e2e tests
- Deploy/runtime: Dockerfile + Docker Compose พร้อม web, worker, Chroma และ Redis

## Setup & Run

วิธีรันแบบที่ตั้งใจให้ใช้หลักคือ Docker Compose คำสั่งเดียว

```bash
docker compose up --build
```

เมื่อระบบพร้อมใช้งานแล้วเปิด:

```text
http://localhost:3000
```

ค่าเริ่มต้นสำหรับ login มาจาก env:

```env
MOCK_ADMIN_USERNAME=admin
MOCK_ADMIN_PASSWORD=admin123
SESSION_SECRET=development-session-secret-change-me-32
OPENAI_API_KEY=ใส่คีย์ OpenAI ของคุณ
CHROMA_URL=http://chroma:8000
DATABASE_URL=file:/app/data/db/dev.db
```

สำหรับ Docker Compose ระบบจะ start ตามลำดับนี้:

1. สร้าง image ของ Next.js app
2. start Chroma และรอให้ healthcheck ผ่าน
3. start Redis สำหรับ rate limit
4. start web container
5. รัน `prisma migrate deploy`
6. รัน `npm run db:seed` เพื่อสร้าง mock user
7. start Next.js standalone server ที่ port `3000`
8. start document worker สำหรับ parse/chunk/embed/index เอกสารแบบ background

## Local Development

ถ้าต้องการรันแบบ dev แยกส่วน สามารถใช้คำสั่งเหล่านี้:

```bash
npm install
npm run dev:chroma
npm run db:migrate:dev
npm run db:seed
npm run dev
```

คำสั่งที่ใช้ตรวจระบบ:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
npm run test:docker:rag
```

## Features Done

- [x] Login + Protected Routes
- [x] Mock user จาก env พร้อม bcrypt password hash
- [x] Session cookie ด้วย JWT และ `SESSION_SECRET`
- [x] Upload PDF/TXT
- [x] Validate file type, extension, size และ sanitize filename/path
- [x] Extract text จาก PDF/TXT
- [x] Chunk เอกสารพร้อม token estimate
- [x] Background document worker พร้อม job lock, retry/backoff และ stale lock recovery
- [x] Summary cache ต่อเอกสารด้วย `DocumentSummary`
- [x] Embedding ด้วย OpenAI หรือ deterministic fallback เมื่อไม่มี key
- [x] Index chunks เข้า Chroma
- [x] Chat with AI ด้วย OpenAI Responses API
- [x] Chat with uploaded document context
- [x] RAG retrieval จาก Chroma
- [x] SQLite fallback search แบบ ranking หลายคำ เมื่อ Chroma ใช้งานไม่ได้
- [x] สรุปทั้งเอกสารแบบละเอียดเมื่อผู้ใช้เลือกเอกสารและถามแนว “สรุปทั้งหมด”
- [x] ปุ่มสรุปเอกสารใน composer ที่บังคับเลือกเอกสารก่อน และส่ง `documentId` เข้า summary flow
- [x] Citation metadata จาก chunks ที่ใช้ตอบ
- [x] Markdown rendering ในคำตอบ AI
- [x] Streaming response ผ่าน Server-Sent Events
- [x] Token usage จาก OpenAI response จริงเมื่อมี API key
- [x] Conversation history save/load
- [x] Rename/delete chat
- [x] Delete document
- [x] Retry indexing และ re-index Chroma
- [x] Diagnostics API และหน้า Admin diagnostics
- [x] Rate limit ผ่าน Redis พร้อม SQLite fallback และ storage quota ต่อ user
- [x] Docker Compose + healthcheck สำหรับ web, worker, Chroma และ Redis
- [x] Integration tests และ e2e tests

## Architecture

ระบบแบ่งเป็นชั้นหลัก ๆ เพื่อให้อ่านและต่อยอดได้ง่าย

```text
Browser / MUI UI
  -> Next.js pages และ client components
  -> Next.js API Routes
  -> Service layer
  -> Prisma + SQLite
  -> Document worker
  -> Chroma
  -> Redis
  -> OpenAI
```

โฟลเดอร์สำคัญ:

- `src/app`: pages และ API route handlers
- `src/components`: UI components แยกตาม feature เช่น chat, upload, sidebar และ summary shortcut
- `src/lib/auth`: login, session, current user
- `src/lib/documents`: upload, file storage, PDF/TXT extraction, document lifecycle, job lock/retry
- `src/lib/rag`: chunk retrieval, fallback search, summary cache helpers, Chroma client, embeddings
- `src/lib/ai`: OpenAI client, prompt builder, streaming response, token usage
- `src/lib/security`: Redis/SQLite rate limit, quota, input sanitization
- `src/lib/admin`: diagnostics checks
- `src/lib/observability`: structured logging helpers
- `prisma`: schema, migrations, seed
- `tests`: Vitest integration/unit tests
- `e2e`: Playwright tests
- `scripts`: document worker, e2e web server, local Chroma และ cleanup test database

## Main Flow

### 1. Login

ผู้ใช้กรอก username/password ที่เก็บใน env ระบบ seed user ลง SQLite และตรวจ password ด้วย bcrypt เมื่อ login สำเร็จ API จะตั้ง session cookie ชื่อ `trainee_knowledge_session`

### 2. Upload Document

ผู้ใช้อัปโหลด PDF/TXT ผ่านหน้า upload ระบบจะ validate type/size, sanitize filename, save file ลง upload directory แล้วสร้าง record เอกสารใน SQLite ด้วยสถานะ `queued` เพื่อให้ request ตอบกลับเร็วขึ้น

### 3. Background Document Worker

worker จะ claim งานจากเอกสารสถานะ `queued` โดยใช้ lock metadata เช่น `lockedBy`, `lockedAt`, `nextAttemptAt` จากนั้น parse PDF/TXT, split เป็น chunks, สร้าง summary cache, สร้าง embeddings และ index เข้า Chroma ถ้า parse fail แบบถาวร เช่น PDF เสีย จะเป็น `failed` พร้อม `failedReason` ถ้า Chroma fail จะเป็น `ready_without_chroma` และ retry ตาม backoff

### 4. Index to Chroma

ระบบสร้าง embeddings ให้ chunks แล้วส่งเข้า Chroma พร้อม metadata เช่น `userId`, `documentId`, `chunkId`, `chunkIndex` ถ้า Chroma ใช้งานไม่ได้ ระบบยังคงมี chunks ใน SQLite และใช้ fallback search แบบ ranking หลายคำแทนการค้นแค่ keyword แรก

### 5. Chat

เมื่อผู้ใช้ถามคำถาม ระบบจะสร้างหรือใช้ chat session เดิม แล้วดึง context จาก Chroma จากนั้นส่ง prompt เข้า OpenAI และ stream คำตอบกลับมาที่ UI

### 6. Summarize Whole Document

ถ้าผู้ใช้เลือกเอกสารและถามแนวสรุปทั้งเอกสาร เช่น “ช่วยสรุปเอกสารนี้ทั้งหมด” ระบบจะใช้ summary cache ของเอกสารร่วมกับ chunks ตามลำดับ `chunkIndex` และมี context fitting เพื่อกัน context ใหญ่เกิน model

summary cache เวอร์ชันปัจจุบันจะสร้างจากทุก chunk ของเอกสาร ไม่สุ่มหรือดึงเฉพาะบางช่วงเหมือน RAG top-k ปกติ จากนั้น prompt จะเข้าสู่โหมดสรุปแบบละเอียด โดยกำชับให้ครอบคลุมภาพรวม, ประเด็นสำคัญทั้งหมด, รายละเอียดตามลำดับเอกสาร, ข้อสรุป และข้อจำกัดหรือสิ่งที่ยังไม่ชัดเจน พร้อม citation เมื่อใช้ข้อมูลจาก context

ปุ่ม “สรุปเอกสาร” ใน chat composer จะ disable จนกว่าผู้ใช้จะเลือกเอกสารจาก dropdown ก่อน เมื่อเลือกแล้วปุ่มจะส่ง prompt กลาง `ช่วยสรุปเอกสารนี้ทั้งหมดแบบละเอียด เป็นระบบ และอ่านเข้าใจง่าย` พร้อม `documentId` ของเอกสารที่เลือกเข้า `/api/chat` เพื่อให้ backend ใช้ `retrieveWholeDocumentContext` และ `summaryMode: comprehensive` แทน RAG top-k ปกติ

รูปแบบคำตอบของโหมดนี้ถูกกำหนดให้เป็น Markdown ที่อ่านง่าย ได้แก่ `ภาพรวม`, `ประเด็นสำคัญทั้งหมด`, `รายละเอียดตามลำดับเอกสาร`, `ข้อสรุป` และ `ข้อจำกัดหรือสิ่งที่ยังไม่ชัดเจน` เพื่อป้องกันคำตอบแบบย่อหน้ายาวหรือการ dump chunk ดิบกลับมาให้ผู้ใช้

### 7. Usage

หลัง AI ตอบเสร็จ ระบบบันทึก prompt tokens และ completion tokens ลง SQLite โดยใช้ usage จริงจาก OpenAI response เมื่อมี API key

## Environment Variables

ตัวแปรหลักที่ควรรู้:

```env
MOCK_ADMIN_USERNAME=admin
MOCK_ADMIN_PASSWORD=admin123
SESSION_SECRET=development-session-secret-change-me-32
OPENAI_API_KEY=
OPENAI_API_KEYS=
OPENAI_MODEL=gpt-5
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
DATABASE_URL=file:./dev.db
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION=trainee_knowledge_chunks
RATE_LIMIT_REDIS_URL=redis://localhost:6379
UPLOAD_DIR=data/uploads
MAX_UPLOAD_MB=10
MAX_DOCUMENTS_PER_USER=50
MAX_STORAGE_MB_PER_USER=100
MAX_DAILY_CHAT_MESSAGES_PER_USER=200
DOCUMENT_WORKER_BATCH_SIZE=3
DOCUMENT_WORKER_INTERVAL_MS=3000
DOCUMENT_WORKER_MAX_ATTEMPTS=3
DOCUMENT_WORKER_LOCK_TIMEOUT_MS=300000
COOKIE_SECURE=false
FULL_DOCUMENT_CONTEXT_MAX_CHUNKS=200
FULL_DOCUMENT_CONTEXT_MAX_TOKENS=120000
```

หมายเหตุ: production ควรใช้ Docker secrets หรือ secret manager แทนการเก็บ secret ตรงใน `.env` โดยมีตัวอย่างใน `docker-compose.prod.yml` และ `docs/production-secrets.md`

## Diagnostics

ระบบมี admin diagnostics สำหรับตรวจ:

- OpenAI API key และ live embedding check
- Chroma connection และ collection
- Redis rate limit connection
- Database migration status
- Upload directory writable
- Operational metrics เช่นจำนวนเอกสารตามสถานะ, stale processing jobs, token usage รวม

เข้าใช้งานผ่าน:

```text
http://localhost:3000/admin
```

หรือเรียก API:

```bash
curl http://localhost:3000/api/admin/diagnostics
```

## Known Issues

- Auth ยังเป็น mock user เดียว ยังไม่มีระบบ user management จริง
- Worker เป็น background polling worker พร้อม lock/retry แล้ว แต่ถ้าปริมาณงานสูงมากควรใช้ queue จริง เช่น BullMQ/Redis streams พร้อม dead-letter queue
- Rate limit ใช้ Redis เมื่อกำหนด `RATE_LIMIT_REDIS_URL` และ fallback เป็น SQLite แต่ production หลาย instance ควรบังคับ Redis ให้พร้อมใช้งานเสมอ
- การสรุปทั้งเอกสารครอบคลุมทุก chunk ผ่าน summary cache และ context fitting แล้ว แต่เอกสารใหญ่มากยังควรเพิ่ม map-reduce summarization แบบหลายชั้นเพื่อสรุประดับ section/chapter ให้ละเอียดขึ้นโดยไม่ชน context limit
- ปุ่มสรุปเอกสารผูกกับเอกสารที่เลือกแล้ว แต่ยังไม่ได้รัน Playwright browser e2e จริงล่าสุดเพราะ sandbox/approval limit ของเครื่องมือ ไม่ใช่ failure จากโค้ด
- SQLite เหมาะกับ assignment/local demo แต่ production ที่มีผู้ใช้พร้อมกันจำนวนมากควรพิจารณา PostgreSQL
- Chroma reconciliation ยังเป็น manual re-index/admin endpoint ยังไม่มี scheduled reconciliation อัตโนมัติ
- Observability มี diagnostics และ structured worker logs แล้ว แต่ยังไม่มี external metrics/alerting เช่น Prometheus หรือ OpenTelemetry
