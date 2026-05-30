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
- Deploy/runtime: Dockerfile + Docker Compose

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
3. start web container
4. รัน `prisma migrate deploy`
5. รัน `npm run db:seed` เพื่อสร้าง mock user
6. start Next.js standalone server ที่ port `3000`

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
- [x] Embedding ด้วย OpenAI หรือ deterministic fallback เมื่อไม่มี key
- [x] Index chunks เข้า Chroma
- [x] Chat with AI ด้วย OpenAI Responses API
- [x] Chat with uploaded document context
- [x] RAG retrieval จาก Chroma
- [x] SQLite fallback search เมื่อ Chroma ใช้งานไม่ได้
- [x] สรุปทั้งเอกสารเมื่อผู้ใช้เลือกเอกสารและถามแนว “สรุปทั้งหมด”
- [x] Citation metadata จาก chunks ที่ใช้ตอบ
- [x] Markdown rendering ในคำตอบ AI
- [x] Streaming response ผ่าน Server-Sent Events
- [x] Token usage จาก OpenAI response จริงเมื่อมี API key
- [x] Conversation history save/load
- [x] Rename/delete chat
- [x] Delete document
- [x] Retry indexing และ re-index Chroma
- [x] Diagnostics API และหน้า Admin diagnostics
- [x] Rate limit และ storage quota ต่อ user
- [x] Docker Compose + healthcheck
- [x] Integration tests และ e2e tests

## Architecture

ระบบแบ่งเป็นชั้นหลัก ๆ เพื่อให้อ่านและต่อยอดได้ง่าย

```text
Browser / MUI UI
  -> Next.js pages และ client components
  -> Next.js API Routes
  -> Service layer
  -> Prisma + SQLite
  -> Chroma
  -> OpenAI
```

โฟลเดอร์สำคัญ:

- `src/app`: pages และ API route handlers
- `src/components`: UI components แยกตาม feature เช่น chat, upload, sidebar
- `src/lib/auth`: login, session, current user
- `src/lib/documents`: upload, file storage, PDF/TXT extraction, document lifecycle
- `src/lib/rag`: chunk retrieval, Chroma client, embeddings
- `src/lib/ai`: OpenAI client, prompt builder, streaming response, token usage
- `src/lib/security`: rate limit, quota, input sanitization
- `src/lib/admin`: diagnostics checks
- `prisma`: schema, migrations, seed
- `tests`: Vitest integration/unit tests
- `e2e`: Playwright tests
- `scripts`: helper scripts เช่น local Chroma และ cleanup test database

## Main Flow

### 1. Login

ผู้ใช้กรอก username/password ที่เก็บใน env ระบบ seed user ลง SQLite และตรวจ password ด้วย bcrypt เมื่อ login สำเร็จ API จะตั้ง session cookie ชื่อ `trainee_knowledge_session`

### 2. Upload Document

ผู้ใช้อัปโหลด PDF/TXT ผ่านหน้า upload ระบบจะ validate type/size, sanitize filename, save file ลง upload directory, extract text, split เป็น chunks แล้วบันทึก metadata ลง SQLite

### 3. Index to Chroma

ระบบสร้าง embeddings ให้ chunks แล้วส่งเข้า Chroma พร้อม metadata เช่น `userId`, `documentId`, `chunkId`, `chunkIndex` ถ้า Chroma ล้มเหลว เอกสารจะอยู่สถานะ `ready_without_chroma` และแสดง `failedReason`

### 4. Chat

เมื่อผู้ใช้ถามคำถาม ระบบจะสร้างหรือใช้ chat session เดิม แล้วดึง context จาก Chroma จากนั้นส่ง prompt เข้า OpenAI และ stream คำตอบกลับมาที่ UI

### 5. Summarize Whole Document

ถ้าผู้ใช้เลือกเอกสารและถามแนวสรุปทั้งเอกสาร เช่น “ช่วยสรุปเอกสารนี้ทั้งหมด” ระบบจะไม่ใช้ top-k retrieval แต่จะดึง chunks ของเอกสารนั้นจาก SQLite ตามลำดับ `chunkIndex` เพื่อให้ context ครอบคลุมทั้งเอกสารเท่าที่ limit อนุญาต

### 6. Usage

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
UPLOAD_DIR=data/uploads
MAX_UPLOAD_MB=10
MAX_DOCUMENTS_PER_USER=50
MAX_STORAGE_MB_PER_USER=100
MAX_DAILY_CHAT_MESSAGES_PER_USER=200
COOKIE_SECURE=false
FULL_DOCUMENT_CONTEXT_MAX_CHUNKS=200
FULL_DOCUMENT_CONTEXT_MAX_TOKENS=120000
```

หมายเหตุ: production ควรใช้ Docker secrets หรือ secret manager แทนการเก็บ secret ตรงใน `.env`

## Diagnostics

ระบบมี admin diagnostics สำหรับตรวจ:

- OpenAI API key และ live embedding check
- Chroma connection และ collection
- Database migration status
- Upload directory writable

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
- Rate limit ยังเป็น in-memory `Map` ถ้า restart container ข้อมูลจะหาย และถ้า scale หลาย instance จะนับแยกกัน
- Upload, PDF parsing, embedding และ Chroma indexing ยังทำใน request เดียว ถ้าเอกสารใหญ่มากอาจช้า ควรแยกเป็น background job
- การสรุปทั้งเอกสารมี limit เพื่อกัน context ใหญ่เกิน model ถ้าเอกสารใหญ่มากควรเพิ่ม map-reduce summarization
- SQLite เหมาะกับ assignment/local demo แต่ production ที่มีผู้ใช้พร้อมกันจำนวนมากควรพิจารณา PostgreSQL
- Chroma reconciliation ยังเป็น manual re-index ยังไม่มี scheduled job ตรวจ DB กับ Chroma ว่าตรงกันเสมอ
- OpenAI error handling ยังควรแยกข้อความให้ละเอียดขึ้น เช่น quota, invalid key, timeout, model unavailable
