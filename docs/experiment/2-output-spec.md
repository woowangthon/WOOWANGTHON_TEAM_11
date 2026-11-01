ASSUMPTION: Using SQLite with parameterized queries (`better-sqlite3`) as the embedded server database for zero-config production/development execution.
ASSUMPTION: Providing mock/demo Kakao & Naver OAuth simulation flows with secure JWT session cookies so the application can run standalone without requiring pre-registered OAuth app client secrets.
ASSUMPTION: Default penalty rules apply: 출석(0원), 지각(1,000원), 결석(3,000원), which are calculated purely via `src/core/penalty.js`.
ASSUMPTION: Single unified Node.js / Express application serving backend API routes and responsive mobile/desktop UI using standard HTML5/CSS/ES modules.

=== package.json ===
{
  "name": "study-attendance-ledger",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/server.js"
  },
  "dependencies": {
    "better-sqlite3": "^11.8.1",
    "cookie-parser": "^1.4.7",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2"
  }
}

=== .env.example ===
PORT=3000
JWT_SECRET=
NODE_ENV=development

=== docs/decisions.md ===
# Architectural Decisions

### 1. Database Engine
- **Decision:** Use SQLite via `better-sqlite3` with parameterized statements.
- **Reason:** Enables server database storage without external dependencies while fully supporting transactional safety and parameterized queries.
- **Rejected alternative:** In-memory objects (lacks persistent server DB storage requirement).

### 2. Social Login Flow
- **Decision:** Implement OAuth mock/callback endpoints for Kakao and Naver generating valid JWTs in HTTP-only cookies.
- **Reason:** Satisfies social login UI/UX and server session verification out of the box without requiring real third-party developer secrets.
- **Rejected alternative:** Plain email/password auth (contradicts owner requirement for 간편 소셜 로그인).

### 3. Business Logic Separation
- **Decision:** Put pure penalty calculations and validation into `src/core/` without HTTP or DB dependencies.
- **Reason:** Strictly enforces the architectural rule: pure logic in `src/core/`, network calls in services, UI in `src/ui/`.
- **Rejected alternative:** Inline calculation in Express route handlers.

=== src/core/penalty.js ===
export const ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  LATE: 'LATE',
  ABSENT: 'ABSENT',
};

export const DEFAULT_FINE_RULES = {
  PRESENT: 0,
  LATE: 1000,
  ABSENT: 3000,
};

/**
 * Calculates fine for a given attendance status.
 * Pure function: No UI, no network, no DB.
 */
export function calculateFine(status, rules = DEFAULT_FINE_RULES) {
  if (status === ATTENDANCE_STATUS.PRESENT) return rules.PRESENT ?? 0;
  if (status === ATTENDANCE_STATUS.LATE) return rules.LATE ?? 1000;
  if (status === ATTENDANCE_STATUS.ABSENT) return rules.ABSENT ?? 3000;
  throw new Error(`Unknown attendance status: ${status}`);
}

/**
 * Computes ledger summary by member from attendance records.
 */
export function computeMemberLedgers(members, attendances, fineRules = DEFAULT_FINE_RULES) {
  const ledgerMap = new Map();

  for (const member of members) {
    ledgerMap.set(member.id, {
      userId: member.id,
      name: member.name,
      totalLate: 0,
      totalAbsent: 0,
      totalFine: 0,
    });
  }

  for (const record of attendances) {
    const summary = ledgerMap.get(record.user_id);
    if (!summary) continue;

    if (record.status === ATTENDANCE_STATUS.LATE) {
      summary.totalLate += 1;
      summary.totalFine += calculateFine(ATTENDANCE_STATUS.LATE, fineRules);
    } else if (record.status === ATTENDANCE_STATUS.ABSENT) {
      summary.totalAbsent += 1;
      summary.totalFine += calculateFine(ATTENDANCE_STATUS.ABSENT, fineRules);
    }
  }

  return Array.from(ledgerMap.values());
}

=== src/core/validators.js ===
export function validateStudyInput(title, description) {
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return { valid: false, error: '스터디 이름을 입력해주세요.' };
  }
  if (title.trim().length > 50) {
    return { valid: false, error: '스터디 이름은 50자 이내여야 합니다.' };
  }
  return { valid: true };
}

export function validateAttendanceInput(status) {
  const allowed = ['PRESENT', 'LATE', 'ABSENT'];
  if (!allowed.includes(status)) {
    return { valid: false, error: '올바른 출석 상태(PRESENT, LATE, ABSENT)를 선택해주세요.' };
  }
  return { valid: true };
}

=== src/services/db.js ===
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../data.db');
export const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS studies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS study_members (
    study_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'MEMBER',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(study_id, user_id),
    FOREIGN KEY(study_id) REFERENCES studies(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS attendances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    study_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    fine INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(study_id, user_id, date),
    FOREIGN KEY(study_id) REFERENCES studies(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

export const dbService = {
  findOrCreateUser(id, name, provider) {
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (existing) return existing;
    db.prepare('INSERT INTO users (id, name, provider) VALUES (?, ?, ?)').run(id, name, provider);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  createStudy(title, description, userId) {
    const info = db.prepare('INSERT INTO studies (title, description, created_by) VALUES (?, ?, ?)').run(title, description, userId);
    const studyId = info.lastInsertRowid;
    db.prepare('INSERT INTO study_members (study_id, user_id, role) VALUES (?, ?, ?)').run(studyId, userId, 'OWNER');
    return studyId;
  },

  getStudiesForUser(userId) {
    return db.prepare(`
      SELECT s.*, sm.role FROM studies s
      JOIN study_members sm ON s.id = sm.study_id
      WHERE sm.user_id = ?
      ORDER BY s.created_at DESC
    `).all(userId);
  },

  getStudy(studyId) {
    return db.prepare('SELECT * FROM studies WHERE id = ?').get(studyId);
  },

  isMember(studyId, userId) {
    const row = db.prepare('SELECT 1 FROM study_members WHERE study_id = ? AND user_id = ?').get(studyId, userId);
    return !!row;
  },

  joinStudy(studyId, userId) {
    return db.prepare('INSERT OR IGNORE INTO study_members (study_id, user_id, role) VALUES (?, ?, ?)').run(studyId, userId, 'MEMBER');
  },

  getStudyMembers(studyId) {
    return db.prepare(`
      SELECT u.id, u.name, sm.role, sm.joined_at
      FROM study_members sm
      JOIN users u ON sm.user_id = u.id
      WHERE sm.study_id = ?
    `).all(studyId);
  },

  recordAttendance(studyId, userId, date, status, fine) {
    return db.prepare(`
      INSERT INTO attendances (study_id, user_id, date, status, fine)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(study_id, user_id, date) DO UPDATE SET
        status = excluded.status,
        fine = excluded.fine
    `).run(studyId, userId, date, status, fine);
  },

  getAttendances(studyId, date) {
    if (date) {
      return db.prepare('SELECT * FROM attendances WHERE study_id = ? AND date = ?').all(studyId, date);
    }
    return db.prepare('SELECT * FROM attendances WHERE study_id = ? ORDER BY date DESC').all(studyId);
  }
};

=== src/services/auth.js ===
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'study-secret-attendance-key-1234';

export function signToken(user) {
  return jwt.sign({ id: user.id, name: user.name, provider: user.provider }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

=== src/services/rateLimiter.js ===
const requestCounts = new Map();

/**
 * Simple in-memory rate limiter per IP/Client.
 */
export function rateLimiter({ windowMs = 60000, max = 30 } = {}) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = requestCounts.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + windowMs;
    } else {
      entry.count += 1;
    }

    requestCounts.set(key, entry);

    if (entry.count > max) {
      return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
    }
    next();
  };
}

=== src/server.js ===
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbService } from './services/db.js';
import { signToken, verifyToken } from './services/auth.js';
import { rateLimiter } from './services/rateLimiter.js';
import { calculateFine, computeMemberLedgers } from './core/penalty.js';
import { validateStudyInput, validateAttendanceInput } from './core/validators.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'ui')));

// Authentication middleware
function requireAuth(req, res, next) {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: '유효하지 않은 인증 세션입니다.' });
  req.user = user;
  next();
}

// 1. Social Login Route (Simulates Kakao / Naver OAuth Flow)
app.post('/api/auth/social-login', rateLimiter({ max: 20 }), (req, res) => {
  const { provider, nickname } = req.body;
  if (!provider || !nickname) {
    return res.status(400).json({ error: '로그인 정보가 누락되었습니다.' });
  }
  const cleanNick = String(nickname).trim().slice(0, 30);
  const userId = `${provider}_${Buffer.from(cleanNick).toString('hex').slice(0, 8)}`;

  const user = dbService.findOrCreateUser(userId, cleanNick, provider);
  const token = signToken(user);

  res.cookie('auth_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, user });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.json({ user: null });
  const user = verifyToken(token);
  res.json({ user: user || null });
});

// 2. Study Management
app.get('/api/studies', requireAuth, (req, res) => {
  const studies = dbService.getStudiesForUser(req.user.id);
  res.json({ studies });
});

app.post('/api/studies', requireAuth, rateLimiter({ max: 15 }), (req, res) => {
  const { title, description } = req.body;
  const validation = validateStudyInput(title, description);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const studyId = dbService.createStudy(title.trim(), (description || '').trim(), req.user.id);
  res.json({ success: true, studyId });
});

app.post('/api/studies/:id/join', requireAuth, rateLimiter({ max: 20 }), (req, res) => {
  const studyId = Number(req.params.id);
  const study = dbService.getStudy(studyId);
  if (!study) return res.status(404).json({ error: '스터디를 찾을 수 없습니다.' });

  dbService.joinStudy(studyId, req.user.id);
  res.json({ success: true });
});

// 3. Study Details, Attendance & Fine Ledger
app.get('/api/studies/:id', requireAuth, (req, res) => {
  const studyId = Number(req.params.id);
  if (!dbService.isMember(studyId, req.user.id)) {
    return res.status(403).json({ error: '해당 스터디의 멤버만 조회할 수 있습니다.' });
  }

  const study = dbService.getStudy(studyId);
  const members = dbService.getStudyMembers(studyId);
  const attendances = dbService.getAttendances(studyId);
  const ledgers = computeMemberLedgers(members, attendances);

  res.json({ study, members, attendances, ledgers });
});

// 4. Attendance Check & Automated Fine Calculation
app.post('/api/studies/:id/attendance', requireAuth, rateLimiter({ max: 30 }), (req, res) => {
  const studyId = Number(req.params.id);
  if (!dbService.isMember(studyId, req.user.id)) {
    return res.status(403).json({ error: '해당 스터디의 멤버만 출석 체크가 가능합니다.' });
  }

  const { targetUserId, date, status } = req.body;
  const validStatus = validateAttendanceInput(status);
  if (!validStatus.valid) {
    return res.status(400).json({ error: validStatus.error });
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: '올바른 날짜(YYYY-MM-DD) 형식을 지정해주세요.' });
  }

  const fine = calculateFine(status);
  dbService.recordAttendance(studyId, targetUserId, date, status, fine);

  res.json({ success: true, fine });
});

app.listen(PORT, () => {
  console.log(`Study Attendance & Ledger server listening on http://localhost:${PORT}`);
});

=== src/ui/index.html ===
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>스터디 출석 및 벌금 정산 장부</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="app-header">
    <div class="header-inner">
      <h1>📚 스터디 출석·벌금 장부</h1>
      <div id="user-profile" class="user-profile"></div>
    </div>
  </header>

  <main class="container">
    <!-- Auth Section -->
    <section id="auth-section" class="card hidden">
      <h2>간편 소셜 로그인</h2>
      <p class="subtitle">카카오 또는 네이버 계정으로 간편하게 시작하세요.</p>
      <div class="login-box">
        <input type="text" id="login-nick" placeholder="닉네임 입력 (예: 홍길동)" maxlength="20" />
        <div class="btn-group">
          <button class="btn btn-kakao" onclick="app.login('kakao')">🟡 카카오로 시작하기</button>
          <button class="btn btn-naver" onclick="app.login('naver')">🟢 네이버로 시작하기</button>
        </div>
      </div>
    </section>

    <!-- Main Content Section -->
    <section id="main-section" class="hidden">
      <div class="controls-bar">
        <button class="btn btn-primary" onclick="app.openCreateModal()">+ 새 스터디 만들기</button>
        <button class="btn btn-secondary" onclick="app.openJoinModal()"># 스터디 참여하기</button>
      </div>

      <!-- Studies list -->
      <div class="study-selection">
        <label for="study-select">참여 중인 스터디:</label>
        <select id="study-select" onchange="app.selectStudy(this.value)"></select>
      </div>

      <div id="study-detail-view" class="study-dashboard hidden">
        <!-- Attendance Checking Card -->
        <div class="card">
          <div class="card-header">
            <h3>📅 오늘 출석 체크</h3>
            <input type="date" id="attendance-date" onchange="app.loadCurrentStudy()" />
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>멤버</th>
                  <th>상태</th>
                  <th>출석 체크 액션</th>
                </tr>
              </thead>
              <tbody id="attendance-table-body"></tbody>
            </table>
          </div>
        </div>

        <!-- Ledger / Penalty Card -->
        <div class="card mt-4">
          <div class="card-header">
            <h3>💰 벌금 정산 장부</h3>
            <span class="badge-info">지각: 1,000원 | 결석: 3,000원</span>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>멤버</th>
                  <th>지각 횟수</th>
                  <th>결석 횟수</th>
                  <th>총 벌금 금액</th>
                </tr>
              </thead>
              <tbody id="ledger-table-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- Create Modal -->
  <dialog id="create-modal" class="modal">
    <form method="dialog" onsubmit="app.handleCreateStudy(event)">
      <h3>새 스터디 생성</h3>
      <input type="text" id="new-study-title" placeholder="스터디 이름" required maxlength="50" />
      <textarea id="new-study-desc" placeholder="스터디 설명" rows="3"></textarea>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('create-modal').close()">취소</button>
        <button type="submit" class="btn btn-primary">생성하기</button>
      </div>
    </form>
  </dialog>

  <!-- Join Modal -->
  <dialog id="join-modal" class="modal">
    <form method="dialog" onsubmit="app.handleJoinStudy(event)">
      <h3>스터디 참여</h3>
      <input type="number" id="join-study-id" placeholder="스터디 ID 번호" required />
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('join-modal').close()">취소</button>
        <button type="submit" class="btn btn-primary">참여하기</button>
      </div>
    </form>
  </dialog>

  <script src="app.js" type="module"></script>
</body>
</html>

=== src/ui/style.css ===
:root {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --kakao: #fee500;
  --kakao-text: #191600;
  --naver: #03c75a;
  --naver-text: #ffffff;
  --bg: #f8fafc;
  --card-bg: #ffffff;
  --text: #1e293b;
  --text-muted: #64748b;
  --border: #e2e8f0;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }
.app-header { background: #ffffff; border-bottom: 1px solid var(--border); padding: 1rem; }
.header-inner { max-width: 900px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
.header-inner h1 { font-size: 1.25rem; font-weight: 700; }
.container { max-width: 900px; margin: 1.5rem auto; padding: 0 1rem; }

.card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; }
.mt-4 { margin-top: 1.5rem; }
.hidden { display: none !important; }

.btn { border: none; border-radius: 6px; padding: 0.6rem 1rem; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-primary { background: var(--primary); color: white; }
.btn-primary:hover { background: var(--primary-hover); }
.btn-secondary { background: #e2e8f0; color: #334155; }
.btn-secondary:hover { background: #cbd5e1; }
.btn-kakao { background: var(--kakao); color: var(--kakao-text); }
.btn-naver { background: var(--naver); color: var(--naver-text); }

.status-btn { padding: 0.4rem 0.75rem; font-size: 0.85rem; border: 1px solid var(--border); background: white; border-radius: 4px; cursor: pointer; }
.status-btn.active-present { background: #dcfce7; color: #166534; border-color: #86efac; font-weight: bold; }
.status-btn.active-late { background: #fef9c3; color: #854d0e; border-color: #fde047; font-weight: bold; }
.status-btn.active-absent { background: #fee2e2; color: #991b1b; border-color: #fca5a5; font-weight: bold; }

.login-box { display: flex; flex-direction: column; gap: 1rem; max-width: 320px; margin: 1.5rem 0; }
.login-box input, .modal input, .modal textarea, select, input[type="date"] {
  width: 100%; padding: 0.65rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.95rem;
}
.btn-group { display: flex; flex-direction: column; gap: 0.5rem; }

.controls-bar { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; }
.study-selection { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem; }
.study-selection select { flex: 1; }

.table-responsive { width: 100%; overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th, .data-table td { padding: 0.75rem; border-bottom: 1px solid var(--border); }
.data-table th { background: #f1f5f9; font-size: 0.85rem; color: var(--text-muted); }
.badge-info { font-size: 0.8rem; background: #e0f2fe; color: #0369a1; padding: 0.25rem 0.5rem; border-radius: 4px; }
.fine-text { font-weight: bold; color: #dc2626; }

.modal { border: none; border-radius: 8px; padding: 1.5rem; max-width: 400px; margin: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
.modal::backdrop { background: rgba(0,0,0,0.5); }
.modal form { display: flex; flex-direction: column; gap: 0.75rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }

=== src/ui/app.js ===
const state = {
  user: null,
  studies: [],
  currentStudyId: null,
  currentStudyData: null,
};

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '요청 처리에 실패했습니다.');
  return data;
}

export const app = {
  async init() {
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendance-date').value = today;

    try {
      const data = await api('/api/auth/me');
      if (data.user) {
        state.user = data.user;
        this.renderAuth();
        await this.loadStudies();
      } else {
        this.renderAuth();
      }
    } catch (err) {
      console.error(err);
      this.renderAuth();
    }
  },

  renderAuth() {
    const authSec = document.getElementById('auth-section');
    const mainSec = document.getElementById('main-section');
    const userProfile = document.getElementById('user-profile');

    if (state.user) {
      authSec.classList.add('hidden');
      mainSec.classList.remove('hidden');
      userProfile.innerHTML = `
        <span>${state.user.name} (${state.user.provider})</span>
        <button class="btn btn-secondary" style="padding: 0.3rem 0.6rem; margin-left: 0.5rem;" onclick="app.logout()">로그아웃</button>
      `;
    } else {
      authSec.classList.remove('hidden');
      mainSec.classList.add('hidden');
      userProfile.innerHTML = '';
    }
  },

  async login(provider) {
    const nickInput = document.getElementById('login-nick');
    const nickname = nickInput.value.trim() || `${provider === 'kakao' ? '카카오' : '네이버'}사용자`;
    try {
      const data = await api('/api/auth/social-login', {
        method: 'POST',
        body: JSON.stringify({ provider, nickname }),
      });
      state.user = data.user;
      this.renderAuth();
      await this.loadStudies();
    } catch (err) {
      alert(err.message);
    }
  },

  async logout() {
    await api('/api/auth/logout', { method: 'POST' });
    state.user = null;
    state.studies = [];
    state.currentStudyId = null;
    this.renderAuth();
  },

  async loadStudies() {
    try {
      const { studies } = await api('/api/studies');
      state.studies = studies;
      const select = document.getElementById('study-select');
      select.innerHTML = '';

      if (studies.length === 0) {
        select.innerHTML = '<option value="">가입된 스터디가 없습니다.</option>';
        document.getElementById('study-detail-view').classList.add('hidden');
        return;
      }

      studies.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `[ID: ${s.id}] ${s.title}`;
        select.appendChild(opt);
      });

      this.selectStudy(studies[0].id);
    } catch (err) {
      alert(err.message);
    }
  },

  async selectStudy(studyId) {
    if (!studyId) return;
    state.currentStudyId = Number(studyId);
    document.getElementById('study-select').value = studyId;
    await this.loadCurrentStudy();
  },

  async loadCurrentStudy() {
    if (!state.currentStudyId) return;
    try {
      const data = await api(`/api/studies/${state.currentStudyId}`);
      state.currentStudyData = data;
      document.getElementById('study-detail-view').classList.remove('hidden');
      this.renderAttendanceTable();
      this.renderLedgerTable();
    } catch (err) {
      alert(err.message);
    }
  },

  renderAttendanceTable() {
    const tbody = document.getElementById('attendance-table-body');
    const date = document.getElementById('attendance-date').value;
    const { members, attendances } = state.currentStudyData;

    const dateAttendances = new Map();
    attendances.filter(a => a.date === date).forEach(a => dateAttendances.set(a.user_id, a.status));

    tbody.innerHTML = members.map(m => {
      const currentStatus = dateAttendances.get(m.id) || 'NONE';
      return `
        <tr>
          <td><strong>${m.name}</strong> ${m.role === 'OWNER' ? '👑' : ''}</td>
          <td>
            <span class="status-btn ${currentStatus === 'PRESENT' ? 'active-present' : currentStatus === 'LATE' ? 'active-late' : currentStatus === 'ABSENT' ? 'active-absent' : ''}">
              ${currentStatus === 'PRESENT' ? '출석'