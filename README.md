# FixIt AI — Gemma 4 Intelligent Worker Assignment System

FixIt AI is a smart campus maintenance management platform enhanced with **Gemma 4**, an open-weight AI model family by Google. FixIt automates the end-to-end lifecycle of campus maintenance: from natural language complaint comprehension and safety risk triage to real-time workload-aware worker dispatch, live worker task management, and cross-dashboard synchronization.

---

## 🌟 Key Features

1. **Gemma 4 Intelligent Complaint Triage**:
   - Understands natural language complaints submitted by students and staff.
   - Automatically categorizes issues into specialized domains: **Electrical**, **Plumbing**, **Carpentry / Furniture**, **IT / Network**, **Cleaning**, and **General Maintenance**.
   - Extracts specific location details (building, block, floor, room) and generates concise 1-sentence summaries.
   - Returns structured JSON validated against strict schemas before processing.

2. **Proactive Safety Hazard Escalation**:
   - Identifies potentially hazardous conditions (e.g., exposed sparking wires, gas odor, burning smells, severe water leakage near electrical switchboards, structural hazards).
   - Immediately escalates hazardous tickets to **Critical Priority** and broadcasts immediate safety alerts to administrators without waiting on standard SLA timelines.

3. **Deterministic, Concurrency-Safe Automatic Worker Assignment**:
   - Evaluates real-time worker availability, specialization compatibility, and current active workloads.
   - Enforces configurable maximum capacity limits (`maxAssignments`) per worker.
   - Employs atomic concurrency-safe reservation to prevent race conditions and over-assignment when multiple complaints arrive simultaneously.
   - If no eligible worker is available, safely queues the ticket as **Pending**, logs assignment failure diagnostics, and alerts administrators.

4. **Dedicated Worker Task Dashboard & Real-Time Notifications**:
   - Zero-friction interface designed specifically for maintenance staff.
   - Displays Ticket ID, title, description, category, location, priority, and timestamps.
   - One-click actions: **Start Work** (moves ticket to `In Progress`) and **Mark as Work Done** (moves ticket to `Work Done`, records completion timestamp, and automatically decrements active workload).
   - In-app notification bell with real-time push via Server-Sent Events (SSE).

5. **Cross-Dashboard Real-Time Synchronization**:
   - **Admin Dashboard**: Full campus metrics, live worker workload gauges (`active / max`), pending unassigned queue with 1-click **Auto-Assign**, and safety alerts.
   - **Worker Dashboard**: Direct view of assigned tasks with Start Work and Mark as Work Done controls.
   - **Student & Staff Portals**: Students and staff securely see their own complaints, assigned worker details, live progress, and timestamps.

---

## 🧠 Gemma 4 Integration Architecture

FixIt AI connects to Gemma 4 via a local inference runtime such as [Ollama](https://ollama.com).

```
                   +------------------------------+
                   | Student / Staff Complaint    |
                   | "Fan stopped in Room 204"    |
                   +--------------+---------------+
                                  |
                                  v
                   +------------------------------+
                   |       FixIt AI Backend       |
                   +--------------+---------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
+-----------------------+                   +-----------------------+
|  Gemma 4 Local Engine |                   | Deterministic Heuristic|
|  (Ollama Runtime)     |                   | Fallback Classifier   |
|  Strict JSON Schema   |                   | (Zero Submission Loss)|
+-----------+-----------+                   +-----------+-----------+
            |                                           |
            +---------------------+---------------------+
                                  |
                                  v
                +-----------------------------------+
                | Validated AI Classification:      |
                | - Category: Electrical            |
                | - Urgency: Normal                 |
                | - Summary: Fan stopped in Room 204|
                | - Safety Hazard: False            |
                +-----------------+-----------------+
                                  |
                                  v
                +-----------------------------------+
                | Automatic Worker Assignment:      |
                | - Query available electricians    |
                | - Exclude busy/offline workers    |
                | - Atomic capacity acquisition     |
                | - Dispatch Arun Kumar (1/4 load)  |
                +-----------------+-----------------+
                                  |
             +--------------------+--------------------+
             |                    |                    |
             v                    v                    v
      [Admin Dashboard]   [Worker Dashboard]   [Student Dashboard]
```

### Safety and Offline Fallback Guarantee
If the local Gemma 4 runtime is offline, unreachable, or times out, FixIt automatically activates its **deterministic rule-based fallback classifier**. The complaint is accurately categorized and assigned based on keyword heuristics without dropping the ticket or failing submission.

---

## ⚙️ Configuration & Environment Variables

Configure the following variables in `backend/.env`:

```env
# Server Configuration
PORT=5000
JWT_SECRET=supersecret123

# Database Connection
MONGO_URI=mongodb://127.0.0.1:27017/fixit_db

# Gemma 4 Local Inference Configuration
GEMMA_API_URL=http://127.0.0.1:11434/api/generate
GEMMA_MODEL=gemma4
GEMMA_TIMEOUT_MS=6000
```

### Running Gemma 4 Locally via Ollama

1. Install [Ollama](https://ollama.com/download) on your system.
2. Pull and start your selected Gemma model variant:
   ```bash
   # Run Gemma 4 (or gemma2)
   ollama run gemma4
   ```
3. Test that the Ollama HTTP API is responding:
   ```bash
   curl http://localhost:11434/api/tags
   ```

---

## 🚀 Installation & Setup

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Seed demo maintenance workers with specializations
npm run seed:workers

# Start backend server
npm start
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

---

## 🧪 Automated Test Suite (10 Required Scenarios)

FixIt AI includes an automated test suite verifying all 10 core assignment and reliability scenarios:

```bash
cd backend
npm test
```

### Scenarios Covered:
1. **Fan complaint** -> Automatically classified and assigned to an eligible electrician.
2. **Leaking tap complaint** -> Automatically classified and assigned to an eligible plumber.
3. **Overloaded worker exclusion** -> Technicians at maximum capacity (`activeAssignmentsCount >= maxAssignments`) are strictly excluded.
4. **Unavailable worker exclusion** -> Workers marked "Unavailable" or "On Leave" are not assigned.
5. **No eligible worker handling** -> Results in an unassigned ticket (`status: Pending`, `assignmentStatus: failed_no_worker`) and an immediate administrator alert.
6. **Worker complaint details** -> Assigned worker receives ticket ID, category, location, and issue title.
7. **Work Done synchronization** -> Worker action transitions status to `Work Done`, sets `completedAt`, and decrements worker workload.
8. **Simultaneous complaints race-condition prevention** -> Concurrency-safe atomic updates prevent over-assignment beyond worker capacity.
9. **Role-based security isolation** -> Students and unauthorized users cannot view or modify other users' private tickets.
10. **AI runtime failure resilience** -> Offline Ollama runtime safely triggers deterministic classification without breaking complaint creation.

---

## 📋 Ticket Lifecycle Workflow

The ticket status workflow strictly enforces the following state transitions:

```
[Pending] ──────(Auto-Assign Algorithm)──────> [Assigned]
                                                   │
                                            (Start Work)
                                                   │
                                                   v
[Work Done] <────────(Mark Done)───────── [In Progress]
     │
 (Reopen)
     v
[Reopened]
```

- **Pending**: Complaint submitted by student/staff, awaiting worker assignment.
- **Assigned**: Compatible worker matched and assigned; worker notified.
- **In Progress**: Worker clicked "Start Work"; reporter notified work has begun.
- **Work Done**: Worker clicked "Mark as Work Done"; completion timestamp recorded; worker active load decremented.
- **Reopened**: Complaint reopened by reporter or admin if issue requires additional attention.

---

## 📜 Open-Source Licenses

- **FixIt Application**: Licensed under the [MIT License](LICENSE) / ISC License.
- **Gemma 4 Model Family**: Provided by Google under the [Gemma Terms of Use](https://ai.google.dev/gemma/terms) and open-weights licensing, permitting open research, commercial deployment, and modification.
