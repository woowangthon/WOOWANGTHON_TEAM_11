ASSUMPTION: SQLite via `better-sqlite3` is chosen as the server database since it requires no external setup and supports parameterized queries.
ASSUMPTION: The application is structured as a Node.js + Express server serving a pure responsive frontend and JSON REST API under the required folder layout (`src/core`, `src/services`, `src/ui`).
ASSUMPTION: The club fee month format follows `YYYY-MM` (defaulting to current year/month) with customizable dues amount and account info for notification generation.

=== package.json ===
{
  "name": "club-fee-manager",
  "version": "1.0.0",
  "description": "동아리 회비 관리 및 미납자 알림 웹 앱",
  "main": "src/server.js",
  "type": "module",
  "scripts": {
    "start": "node src/server.js"
  },
  "dependencies": {
    "better-sqlite3": "^11.8.1",
    "express": "^4.21.2"
  }
}

=== .env.example ===
PORT=3000
DATABASE_PATH=club_fees.db

=== .gitignore ===
node_modules/
*.db
.env

=== src/core/reminder.js ===
export function generateReminderMessage({ clubName, month, feeAmount, bankAccount, members }) {
  if (!members || members.length === 0) {
    return '미납 회원이 없습니다.';
  }
  const memberNames = members.map((m) => m.name).join(', ');
  const monthText = `${month}월`;
  const amountText = feeAmount ? `${Number(feeAmount).toLocaleString()}원` : '회비';
  const accountInfo = bankAccount ? `\n입금 계좌: ${bankAccount}` : '';

  return `[${clubName || '동아리'} ${monthText} 회비 납부 안내]
미납 대상자: ${memberNames}
납부 금액: ${amountText}${accountInfo}
원활한 동아리 운영을 위해 기한 내 납부 부탁드립니다! 감사합니다.`;
}

=== src/services/db.js ===
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'club_fees.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS fee_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    is_paid INTEGER NOT NULL DEFAULT 0,
    paid_at DATETIME,
    FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE,
    UNIQUE(member_id, month)
  );
`);

export const memberService = {
  getAll() {
    return db.prepare('SELECT * FROM members ORDER BY name ASC').all();
  },
  create(name, phone = '') {
    const stmt = db.prepare('INSERT INTO members (name, phone) VALUES (?, ?)');
    const info = stmt.run(name.trim(), phone.trim());
    return { id: info.lastInsertRowid, name: name.trim(), phone: phone.trim() };
  },
  delete(id) {
    return db.prepare('DELETE FROM members WHERE id = ?').run(id);
  }
};

export const feeService = {
  getStatusByMonth(month) {
    const stmt = db.prepare(`
      SELECT 
        m.id AS member_id,
        m.name,
        m.phone,
        COALESCE(f.is_paid, 0) AS is_paid,
        f.paid_at
      FROM members m
      LEFT JOIN fee_records f ON m.id = f.member_id AND f.month = ?
      ORDER BY m.name ASC
    `);
    return stmt.all(month);
  },
  toggleStatus(memberId, month, isPaid) {
    const paidAt = isPaid ? new Date().toISOString() : null;
    const stmt = db.prepare(`
      INSERT INTO fee_records (member_id, month, is_paid, paid_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(member_id, month) DO UPDATE SET
        is_paid = excluded.is_paid,
        paid_at = excluded.paid_at
    `);
    stmt.run(memberId, month, isPaid ? 1 : 0, paidAt);
    return { memberId, month, isPaid: !!isPaid, paidAt };
  }
};

=== src/server.js ===
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { memberService, feeService } from './services/db.js';
import { generateReminderMessage } from './core/reminder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'ui')));

// Input validation helpers
function isValidMonth(month) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

// 1. Members API
app.get('/api/members', (req, res) => {
  try {
    const members = memberService.getAll();
    res.json({ success: true, data: members });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/members', (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 50) {
      return res.status(400).json({ success: false, error: '회원 이름은 1~50자 사이여야 합니다.' });
    }
    const sanitizedPhone = (phone || '').toString().trim();
    if (sanitizedPhone && sanitizedPhone.length > 20) {
      return res.status(400).json({ success: false, error: '연락처 길이가 너무 깁니다.' });
    }
    const member = memberService.create(name, sanitizedPhone);
    res.status(201).json({ success: true, data: member });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/members/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: '유효한 회원 ID가 아닙니다.' });
    }
    memberService.delete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Fee status API
app.get('/api/fees', (req, res) => {
  try {
    const { month } = req.query;
    if (!month || !isValidMonth(month)) {
      return res.status(400).json({ success: false, error: '올바른 연월 형식(YYYY-MM)을 입력하세요.' });
    }
    const status = feeService.getStatusByMonth(month);
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/fees/toggle', (req, res) => {
  try {
    const { memberId, month, isPaid } = req.body;
    if (!memberId || !isValidMonth(month) || typeof isPaid !== 'boolean') {
      return res.status(400).json({ success: false, error: '요청 파라미터가 유효하지 않습니다.' });
    }
    const updated = feeService.toggleStatus(Number(memberId), month, isPaid);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Reminder text generation API
app.post('/api/reminder/text', (req, res) => {
  try {
    const { clubName, month, feeAmount, bankAccount, members } = req.body;
    if (!month || !isValidMonth(month)) {
      return res.status(400).json({ success: false, error: '올바른 연월 형식이 아닙니다.' });
    }
    const message = generateReminderMessage({ clubName, month, feeAmount, bankAccount, members: members || [] });
    res.json({ success: true, data: { message } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`동아리 회비 관리 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});

=== src/ui/index.html ===
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>동아리 회비 관리</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>동아리 회비 관리</h1>
      <p>납부 현황을 파악하고 미납자에게 빠르게 독촉 메시지를 보내세요.</p>
    </header>

    <div id="alertBox" class="alert hidden"></div>

    <section class="card config-bar">
      <div class="field-inline">
        <label for="monthPicker">조회 연월:</label>
        <input type="month" id="monthPicker">
      </div>
      <div class="field-inline">
        <label for="filterSelect">상태 필터:</label>
        <select id="filterSelect">
          <option value="all">전체 회원</option>
          <option value="unpaid">미납자만 보기</option>
          <option value="paid">완납자만 보기</option>
        </select>
      </div>
      <button id="reminderBtn" class="btn btn-warning">📢 미납 알림 작성</button>
    </section>

    <section class="grid-layout">
      <!-- Member management & List -->
      <main class="card main-table">
        <div class="table-header">
          <h2 id="tableTitle">회비 납부 현황</h2>
          <span id="summaryBadge" class="badge">총 0명 / 미납 0명</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>연락처</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody id="feeTableBody">
            <tr><td colspan="4" class="empty">데이터를 불러오는 중...</td></tr>
          </tbody>
        </table>
      </main>

      <!-- Sidebar: Add Member & Reminder modal -->
      <aside class="sidebar">
        <div class="card">
          <h3>회원 추가</h3>
          <form id="memberForm">
            <div class="form-group">
              <label for="newMemberName">이름 *</label>
              <input type="text" id="newMemberName" placeholder="예: 홍길동" required>
            </div>
            <div class="form-group">
              <label for="newMemberPhone">연락처</label>
              <input type="text" id="newMemberPhone" placeholder="예: 010-1234-5678">
            </div>
            <button type="submit" class="btn btn-primary full">회원 등록</button>
          </form>
        </div>

        <div class="card" id="reminderSection">
          <h3>알림 메시지 설정</h3>
          <div class="form-group">
            <label for="clubName">동아리명</label>
            <input type="text" id="clubName" value="코딩동아리">
          </div>
          <div class="form-group">
            <label for="feeAmount">회비 금액</label>
            <input type="number" id="feeAmount" value="10000" step="1000">
          </div>
          <div class="form-group">
            <label for="bankAccount">입금 계좌</label>
            <input type="text" id="bankAccount" placeholder="카카오 3333-xx-xxxx 홍길동">
          </div>
          <button id="copyMessageBtn" class="btn btn-secondary full">📋 독촉 메시지 복사</button>
        </div>
      </aside>
    </section>
  </div>
  <script type="module" src="app.js"></script>
</body>
</html>

=== src/ui/style.css ===
* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
body { background: #f4f6f8; color: #222; padding: 20px; }
.container { max-width: 1080px; margin: 0 auto; }
.header { margin-bottom: 20px; text-align: center; }
.header h1 { font-size: 28px; color: #1e293b; }
.header p { color: #64748b; font-size: 14px; margin-top: 5px; }

.card { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
.config-bar { display: flex; gap: 15px; align-items: center; flex-wrap: wrap; }
.field-inline { display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 14px; }
.grid-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
@media (max-width: 768px) { .grid-layout { grid-template-columns: 1fr; } }

.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; color: #475569; }
input, select { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; }
input[type="month"] { width: auto; }
.field-inline select { width: auto; }

.btn { border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; transition: background 0.15s; }
.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:hover { background: #1d4ed8; }
.btn-secondary { background: #0f172a; color: #fff; }
.btn-secondary:hover { background: #334155; }
.btn-warning { background: #f59e0b; color: #fff; margin-left: auto; }
.btn-warning:hover { background: #d97706; }
.btn.full { width: 100%; }

table { width: 100%; border-collapse: collapse; margin-top: 15px; }
th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
th { background: #f8fafc; color: #475569; }
.table-header { display: flex; justify-content: space-between; align-items: center; }
.badge { background: #e2e8f0; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.badge.danger { background: #fee2e2; color: #b91c1c; }

.status-btn { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer; border: none; }
.status-paid { background: #dcfce7; color: #15803d; }
.status-unpaid { background: #fee2e2; color: #b91c1c; }
.btn-delete { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 12px; margin-left: 8px; }
.btn-delete:hover { color: #ef4444; }

.alert { padding: 12px 16px; border-radius: 6px; margin-bottom: 15px; font-size: 14px; }
.alert.success { background: #dcfce7; color: #166534; }
.alert.error { background: #fee2e2; color: #991b1b; }
.hidden { display: none; }
.empty { text-align: center; color: #94a3b8; padding: 30px; }

=== src/ui/app.js ===
const state = {
  selectedMonth: new Date().toISOString().slice(0, 7),
  filter: 'all',
  records: []
};

const dom = {
  monthPicker: document.getElementById('monthPicker'),
  filterSelect: document.getElementById('filterSelect'),
  tableBody: document.getElementById('feeTableBody'),
  summaryBadge: document.getElementById('summaryBadge'),
  alertBox: document.getElementById('alertBox'),
  memberForm: document.getElementById('memberForm'),
  newMemberName: document.getElementById('newMemberName'),
  newMemberPhone: document.getElementById('newMemberPhone'),
  clubName: document.getElementById('clubName'),
  feeAmount: document.getElementById('feeAmount'),
  bankAccount: document.getElementById('bankAccount'),
  copyMessageBtn: document.getElementById('copyMessageBtn'),
  reminderBtn: document.getElementById('reminderBtn')
};

function showAlert(message, type = 'success') {
  dom.alertBox.textContent = message;
  dom.alertBox.className = `alert ${type}`;
  setTimeout(() => { dom.alertBox.className = 'alert hidden'; }, 3500);
}

async function fetchStatus() {
  try {
    const res = await fetch(`/api/fees?month=${state.selectedMonth}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    state.records = json.data;
    render();
  } catch (err) {
    showAlert(`데이터 로드 실패: ${err.message}`, 'error');
  }
}

async function handleToggle(memberId, currentPaid) {
  try {
    const res = await fetch('/api/fees/toggle', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId,
        month: state.selectedMonth,
        isPaid: !currentPaid
      })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await fetchStatus();
  } catch (err) {
    showAlert(`납부 상태 변경 실패: ${err.message}`, 'error');
  }
}

async function handleDeleteMember(memberId, name) {
  if (!confirm(`${name} 회원을 삭제하시겠습니까? 관련 납부 기록도 함께 삭제됩니다.`)) return;
  try {
    const res = await fetch(`/api/members/${memberId}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    showAlert(`${name} 회원이 삭제되었습니다.`);
    await fetchStatus();
  } catch (err) {
    showAlert(`회원 삭제 실패: ${err.message}`, 'error');
  }
}

async function handleAddMember(e) {
  e.preventDefault();
  const name = dom.newMemberName.value.trim();
  const phone = dom.newMemberPhone.value.trim();
  if (!name) return;

  try {
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    dom.newMemberName.value = '';
    dom.newMemberPhone.value = '';
    showAlert(`${name} 회원이 추가되었습니다.`);
    await fetchStatus();
  } catch (err) {
    showAlert(`회원 추가 실패: ${err.message}`, 'error');
  }
}

async function handleCopyReminder() {
  const unpaidMembers = state.records.filter((r) => !r.is_paid);
  if (unpaidMembers.length === 0) {
    return showAlert('현재 월에 미납 회원이 없습니다!', 'success');
  }

  try {
    const res = await fetch('/api/reminder/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clubName: dom.clubName.value,
        month: state.selectedMonth,
        feeAmount: dom.feeAmount.value,
        bankAccount: dom.bankAccount.value,
        members: unpaidMembers
      })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    await navigator.clipboard.writeText(json.data.message);
    showAlert('독촉 메시지가 클립보드에 복사되었습니다! 채팅방에 붙여넣으세요.');
  } catch (err) {
    showAlert(`메시지 복사 실패: ${err.message}`, 'error');
  }
}

function render() {
  const filtered = state.records.filter((r) => {
    if (state.filter === 'unpaid') return !r.is_paid;
    if (state.filter === 'paid') return !!r.is_paid;
    return true;
  });

  const unpaidCount = state.records.filter((r) => !r.is_paid).length;
  dom.summaryBadge.textContent = `총 ${state.records.length}명 / 미납 ${unpaidCount}명`;
  dom.summaryBadge.className = `badge ${unpaidCount > 0 ? 'danger' : ''}`;

  if (filtered.length === 0) {
    dom.tableBody.innerHTML = '<tr><td colspan="4" class="empty">등록된 회원이나 조건에 맞는 회원이 없습니다.</td></tr>';
    return;
  }

  dom.tableBody.innerHTML = '';
  filtered.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${r.name}</strong></td>
      <td>${r.phone || '-'}</td>
      <td>
        <button class="status-btn ${r.is_paid ? 'status-paid' : 'status-unpaid'}">
          ${r.is_paid ? '✓ 납부완료' : '✕ 미납'}
        </button>
      </td>
      <td>
        <button class="btn-delete" title="회원 삭제">삭제</button>
      </td>
    `;

    tr.querySelector('.status-btn').onclick = () => handleToggle(r.member_id, !!r.is_paid);
    tr.querySelector('.btn-delete').onclick = () => handleDeleteMember(r.member_id, r.name);
    dom.tableBody.appendChild(tr);
  });
}

// Event Listeners
dom.monthPicker.value = state.selectedMonth;
dom.monthPicker.addEventListener('change', (e) => {
  state.selectedMonth = e.target.value;
  fetchStatus();
});
dom.filterSelect.addEventListener('change', (e) => {
  state.filter = e.target.value;
  render();
});
dom.memberForm.addEventListener('submit', handleAddMember);
dom.copyMessageBtn.addEventListener('click', handleCopyReminder);
dom.reminderBtn.addEventListener('click', () => {
  state.filter = 'unpaid';
  dom.filterSelect.value = 'unpaid';
  render();
  handleCopyReminder();
});

fetchStatus();
