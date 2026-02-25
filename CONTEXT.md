# AI Video Generation SaaS — Product Requirements Document
**Version 2.0** · Updated with architectural decisions from technical review

---

## 1. Overview

### Product Vision

A SaaS platform that enables users to generate automated, conversational-style AI videos using:

- Script input (manual or AI-generated)
- Prebuilt visual templates with defined character schemas
- Multiple output formats (9:16, 16:9, 1:1)
- AI-powered voice generation
- Automated video rendering via child processes
- Cloud-based delivery via Cloudinary CDN

The goal is to enable fast, scalable short-form video production.

---

## 2. Target Users

### Phase 1
- Solo content creators
- YouTube automation creators
- Instagram / Reels creators
- Technical educators

### Phase 2
- Agencies
- SaaS marketers
- Content teams

---

## 3. Core Features (MVP)

### 3.1 Template Engine

Select from predefined templates stored as JSON config files on disk (see Section 3.8 for schema). Templates define:

- Background video file path
- Character image paths and per-format positional coordinates
- Subtitle style (font size, color, position)
- Supported output formats

**Template validation is mandatory** before any render begins. If the script references a speaker not present in the template's character map, the job is rejected immediately with a structured error.

### 3.2 Multi-Format Rendering

Supported formats:

- **9:16** — 1080×1920 (Reels, Shorts, TikTok)
- **16:9** — 1920×1080 (YouTube)
- **1:1** — 1080×1080 (Instagram feed)

User selects format at generation time. Character positions are resolved per-format from the template config.

### 3.3 Script Input

#### Input Modes

**Mode A — Structured JSON (primary):**
```json
[
  { "speaker": "left",  "text": "Hello." },
  { "speaker": "right", "text": "Hi there." }
]
```

**Mode B — Plain text (UI convenience):**
```
Left: Hello.
Right: Hi there.
```

#### Normalization Rules

All input — regardless of mode — is normalized to the canonical internal format before any further processing:

```json
[
  { "speaker": "left",  "text": "Hello." },
  { "speaker": "right", "text": "Hi there." }
]
```

The parser applies these rules to plain text:
- Split input by newline
- Each line must match pattern `Speaker: Text`
- Extract speaker name (case-insensitive), map to `left` / `right`
- Validate each speaker exists in the selected template's character map
- If any line is malformed or speaker is invalid → reject the entire input with a clear error message before job creation

> **Why canonical format:** Cleaner timeline logic, less nesting, easier validation, and consistent FFmpeg overlay processing regardless of how the user submitted the script.

### 3.4 TTS Integration

The system will:

- Generate voice audio per dialogue line using Google Cloud TTS
- Measure each audio clip's duration
- Assemble a sequential timeline from durations
- Merge all per-line audio clips into a single combined audio track

**Voice provider:** Google Cloud TTS (initial)

All TTS output files are written to the job's isolated temp folder (`/tmp/jobs/{jobId}/`) and deleted after upload.

### 3.5 Subtitle Sync

The system will:

- Auto-generate an SRT file from line texts and measured audio durations
- Burn subtitles into the final video using FFmpeg's `subtitles` filter
- Ensure timing is derived from actual audio duration — never estimated

### 3.6 Video Rendering

#### Rendering Pipeline (per job)

1. Validate template and canonical script
2. Create isolated job temp folder: `/tmp/jobs/{jobId}/`
3. Generate per-line TTS audio files
4. Measure audio durations, build timeline
5. Merge audio into single track
6. Generate SRT from timeline
7. Compose final video via FFmpeg:
   - Background video loop
   - Character overlays timed per speaker turn
   - Combined audio track
   - Burned subtitle layer
   - Format scaling to selected resolution
8. Output final `output.mp4` inside job temp folder
9. Upload to Cloudinary
10. Delete entire job temp folder (`fs.rm` recursive)
11. Update job status and store CDN URL

**Rendering engine:** FFmpeg via Node.js `child_process.spawn`

#### FFmpeg Execution Rules

- **Always use `spawn`** — never `exec()` or inline execution
- `spawn` streams output, does not buffer in memory, and does not block the event loop
- FFmpeg runs in a **separate child process** — the Node.js event loop remains unblocked during renders
- All FFmpeg commands are constructed programmatically; all user-provided text is sanitized before being interpolated into FFmpeg arguments to prevent path injection

### 3.7 Temp File Management

#### Rule: Per-Job Isolated Temp Folder

Every job gets its own directory:

```
/tmp/jobs/{jobId}/
  ├── line_0.mp3
  ├── line_1.mp3
  ├── ...
  ├── combined_audio.mp3
  ├── subtitles.srt
  └── output.mp4
```

#### Rule: Always Use try/finally for Cleanup

```js
try {
  await render(jobId)
  await upload(jobId)
} finally {
  await fs.rm(`/tmp/jobs/${jobId}`, { recursive: true, force: true })
}
```

Cleanup runs even if render or upload throws. Deleting the entire folder (not individual files) is the required approach — simpler, safer, no partial-cleanup risk.

### 3.8 Template Schema (Required Before Backend Build)

All templates are stored as JSON files. This schema must be implemented before the rendering pipeline can be built — it is a hard dependency.

```json
{
  "id": "conversation-basic",
  "name": "Basic Conversation",
  "supportedFormats": ["9:16", "16:9", "1:1"],
  "background": "assets/backgrounds/bg1.mp4",
  "characters": {
    "left": {
      "image": "assets/characters/character_a.png",
      "positions": {
        "9:16": { "x": 100, "y": 1200 },
        "16:9": { "x": 200, "y": 700 },
        "1:1":  { "x": 100, "y": 700 }
      }
    },
    "right": {
      "image": "assets/characters/character_b.png",
      "positions": {
        "9:16": { "x": 600, "y": 1200 },
        "16:9": { "x": 1400, "y": 700 },
        "1:1":  { "x": 700, "y": 700 }
      }
    }
  },
  "subtitleStyle": {
    "fontSize": 48,
    "color": "white",
    "position": "bottom"
  }
}
```

**Backend validation at job creation time:**
```js
for (const line of canonicalScript) {
  if (!template.characters[line.speaker]) {
    throw new Error(`Speaker "${line.speaker}" not found in template "${template.id}"`)
  }
}
```

### 3.9 Cloudinary Storage

After rendering:

- Upload final `output.mp4` from job temp folder to Cloudinary
- Store the returned public CDN URL in the job record
- Provide public download link to the user
- Delete local temp folder immediately after successful upload
- No local file retention beyond the render + upload window

### 3.10 Job System

#### Storage: MongoDB (Phase 1 onward)

The in-memory job store from the original spec has been replaced with **MongoDB** as the persistent job store starting from Phase 1. Reasons:

- Render.com instances cold-start and restart — in-memory state is silently lost
- MongoDB Atlas free tier has zero infrastructure overhead
- The schema naturally extends to support users, billing, and API keys in Phase 2
- Flexible document schema accommodates future fields without migrations

**Job schema:**
```json
{
  "_id":        "ObjectId",
  "templateId": "string",
  "format":     "9:16 | 16:9 | 1:1",
  "script":     "[{ speaker, text }]",
  "status":     "queued | processing | completed | failed",
  "outputUrl":  "string | null",
  "error":      "string | null",
  "createdAt":  "Date",
  "updatedAt":  "Date"
}
```

#### Status Flow

```
queued → processing → completed
                   ↘ failed
```

#### Concurrency Limiter

```js
const MAX_CONCURRENT = 2
let activeRenders = 0

async function tryStartRender(jobId) {
  if (activeRenders >= MAX_CONCURRENT) {
    // Update job status to queued, return — polling will retry
    return
  }
  activeRenders++
  try {
    await processJob(jobId)
  } finally {
    activeRenders--
  }
}
```

- If `activeRenders >= MAX_CONCURRENT`, the job remains in `queued` state
- Frontend polls the status endpoint; when a slot opens, the next queued job begins
- For MVP, `MAX_CONCURRENT = 2` is the hard cap — no CPU/memory-based throttling required yet

#### Frontend Polling

- Frontend polls `GET /api/jobs/:jobId/status` every 3–5 seconds
- Response includes `status` and `outputUrl` when completed
- On `failed`, response includes `error` message for display

---

## 4. Non-Functional Requirements

### Performance
- Target render time: < 2× video duration
- Must not block the API request thread — all rendering is async via child processes
- Concurrency capped at 2 simultaneous renders to protect server resources

### Scalability (Phase 1)
- Single server instance (Render.com)
- MongoDB Atlas as persistent store — scales independently of the app server
- 2–3 simultaneous renders maximum

### Reliability
- If render fails → mark job as `failed`, store error message in job record
- Temp file cleanup runs in `finally` block — guaranteed even on failure
- Structured error responses for all failure cases

### Security
- Validate and normalize all script input before job creation
- Reject jobs with unknown speakers before any processing begins
- Sanitize all user-provided text before interpolating into FFmpeg arguments
- Limit maximum script length (line count and character count per line)
- No path traversal possible — all file paths derived from template config, not user input

---

## 5. Technical Stack

### Frontend
- Next.js
- Tailwind CSS + ShadCN (Zinc)
- Axios (polling)

### Backend
- Node.js
- `child_process.spawn` for FFmpeg
- Google Cloud TTS
- Cloudinary SDK
- MongoDB (Atlas free tier) + Mongoose

### Deployment
- Render.com (Node service)
- MongoDB Atlas (database)
- Vercel (if frontend is separated)

---

## 6. API Endpoints (MVP)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/templates` | List available templates |
| `POST` | `/api/jobs` | Submit a new render job |
| `GET` | `/api/jobs/:id` | Get job status and output URL |

### POST /api/jobs — Request Body

```json
{
  "templateId": "conversation-basic",
  "format": "9:16",
  "script": [
    { "speaker": "left",  "text": "Hello." },
    { "speaker": "right", "text": "Hi there." }
  ]
}
```

### POST /api/jobs — Response (job created)

```json
{
  "jobId": "abc123",
  "status": "queued"
}
```

### GET /api/jobs/:id — Response (completed)

```json
{
  "jobId": "abc123",
  "status": "completed",
  "outputUrl": "https://res.cloudinary.com/..."
}
```

### GET /api/jobs/:id — Response (failed)

```json
{
  "jobId": "abc123",
  "status": "failed",
  "error": "Speaker \"center\" not found in template \"conversation-basic\""
}
```

---

## 7. Job Lifecycle (Updated)

```
1. User submits POST /api/jobs
2. API validates input format and script length
3. Script is normalized to canonical format
4. Template is loaded and validated against canonical script speakers
5. Job document created in MongoDB with status = "queued"
6. If activeRenders < MAX_CONCURRENT → status = "processing", render begins in child process
7. Per-job temp folder created: /tmp/jobs/{jobId}/
8. TTS audio generated per line
9. Audio merged, SRT generated, FFmpeg render executed via spawn
10. Output uploaded to Cloudinary
11. Temp folder deleted (try/finally guaranteed)
12. Job document updated: status = "completed", outputUrl = CDN URL
13. Frontend polling receives completed status and presents download link
```

**On any failure between steps 7–11:** temp folder is deleted, job status set to `failed`, error stored in job document.

---

## 8. MVP Constraints

- No horizontal scaling
- No distributed queue (Redis deferred to Phase 3)
- No Stripe billing
- No user authentication
- Concurrency handled via in-process counter (not Redis)
- Focus = working render pipeline with persistent job state

---

## 9. Future Enhancements

### Phase 2
- User authentication (NextAuth or Clerk)
- Stripe billing + usage tracking
- API key system for external developers
- Job history UI per user
- Additional template library

### Phase 3
- Redis-backed job queue
- Distributed worker processes
- Horizontal scaling
- Auto-scaling worker instances
- Webhook delivery on job completion

---

## 10. Success Metrics

| Metric | Target |
|---|---|
| Render success rate | > 95% |
| Average render time | < 2× video duration |
| Temp disk cleanup | 100% — zero leaked files |
| Cloudinary upload stability | Stable |
| Subtitle sync accuracy | Derived from actual audio duration |
| Server stability under concurrent load | No crashes at 2 concurrent renders |
| Job persistence across restarts | 100% — MongoDB backed |