ASSUMPTION: The application uses browser `localStorage` for state persistence so that no external backend setup is required while allowing full real-time interaction.
ASSUMPTION: Attendance statuses are: Present (출석 - 0원), Late (지각 - 기본 1,000원), and Absent (결석 - 기본 3,000원). Fine amounts are configurable.
ASSUMPTION: The UI is presented in Korean with clean responsive styling using Tailwind CSS via CDN.
ASSUMPTION: Features include managing study members, creating study sessions (dates), batch marking attendance per session, calculating and filtering fines, and toggling fine settlement (입금 완료/미납).

=== index.html ===
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>스터디 출석체크 & 벌금 정산기</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <link rel="stylesheet" href="style.css" />
</head>
<body class="bg-slate-100 text-slate-800 font-sans min-h-screen">
  <header class="bg-indigo-600 text-white shadow-md">
    <div class="max-w-6xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-3">
      <div class="flex items-center space-x-3">
        <i class="fa-solid fa-graduation-cap text-2xl"></i>
        <h1 class="text-xl font-bold">스터디 매니저 <span class="text-xs font-normal bg-indigo-500 px-2 py-0.5 rounded-full">출석 & 벌금</span></h1>
      </div>
      <div class="flex space-x-2">
        <button id="tabBtnCheck" class="tab-btn px-4 py-2 rounded-lg text-sm font-medium bg-white text-indigo-700 shadow">출석 체크</button>
        <button id="tabBtnFine" class="tab-btn px-4 py-2 rounded-lg text-sm font-medium text-indigo-100 hover:bg-indigo-500">벌금 정산 현황</button>
        <button id="tabBtnSettings" class="tab-btn px-4 py-2 rounded-lg text-sm font-medium text-indigo-100 hover:bg-indigo-500">스터디 설정</button>
      </div>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-4 py-6">
    <!-- Quick Stats Top Bar -->
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500">스터디원 수</p>
          <p id="statMemberCount" class="text-2xl font-bold text-slate-800">0명</p>
        </div>
        <i class="fa-solid fa-users text-indigo-400 text-2xl"></i>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500">총 진행 세션</p>
          <p id="statSessionCount" class="text-2xl font-bold text-slate-800">0회</p>
        </div>
        <i class="fa-regular fa-calendar-check text-emerald-400 text-2xl"></i>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500">총 누적 벌금</p>
          <p id="statTotalFine" class="text-2xl font-bold text-red-500">0원</p>
        </div>
        <i class="fa-solid fa-won-sign text-amber-500 text-2xl"></i>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500">미납 벌금 잔여</p>
          <p id="statUnpaidFine" class="text-2xl font-bold text-rose-600">0원</p>
        </div>
        <i class="fa-solid fa-hand-holding-dollar text-rose-400 text-2xl"></i>
      </div>
    </div>

    <!-- TAB 1: ATTENDANCE CHECK -->
    <section id="tabCheck" class="tab-content block space-y-6">
      <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 justify-between items-center">
        <div class="flex items-center space-x-3">
          <label class="text-sm font-semibold text-slate-600">모임 일차 선택:</label>
          <select id="sessionSelect" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"></select>
          <button id="btnNewSessionModal" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
            <i class="fa-solid fa-plus text-xs"></i> 세션 추가
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button id="btnDeleteSession" class="text-sm text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 hover:border-red-400 rounded-lg">현재 회차 삭제</button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 id="currentSessionTitle" class="font-bold text-slate-800 text-lg">출석부</h2>
            <p id="currentSessionDate" class="text-xs text-slate-500"></p>
          </div>
          <span class="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">자동 저장됨</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-100 text-slate-600 border-b border-slate-200">
              <tr>
                <th class="p-3 w-16 text-center">번호</th>
                <th class="p-3">이름</th>
                <th class="p-3">출결 상태</th>
                <th class="p-3">발생 벌금</th>
                <th class="p-3">메모</th>
              </tr>
            </thead>
            <tbody id="attendanceTbody" class="divide-y divide-slate-100">
              <!-- Dynamically rendered -->
            </tbody>
          </table>
        </div>
        <div id="emptyAttendanceNotice" class="hidden p-8 text-center text-slate-400">
          스터디원 또는 세션이 등록되지 않았습니다.
        </div>
      </div>
    </section>

    <!-- TAB 2: FINE SETTLEMENT -->
    <section id="tabFine" class="tab-content hidden space-y-6">
      <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 class="font-bold text-slate-800 text-lg">스터디원별 누적 정산표</h2>
          <p class="text-xs text-slate-500">미납 금액을 누르면 납부 완료 상태로 토글할 수 있습니다.</p>
        </div>
        <div class="flex gap-2">
          <button id="btnCopyReport" class="border border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 text-sm rounded-lg font-medium flex items-center gap-1.5">
            <i class="fa-regular fa-clipboard"></i> 단톡방 공유 텍스트 복사
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="memberFineCards">
        <!-- Dynamically rendered fine summary cards per member -->
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700">전체 벌금 세부 내역</div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-100 text-slate-600">
              <tr>
                <th class="p-3 text-left">일자/세션</th>
                <th class="p-3 text-left">멤버</th>
                <th class="p-3 text-left">상태</th>
                <th class="p-3 text-left">금액</th>
                <th class="p-3 text-left">정산 상태</th>
                <th class="p-3 text-center">동작</th>
              </tr>
            </thead>
            <tbody id="fineDetailTbody" class="divide-y divide-slate-100">
              <!-- Render fine row list -->
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB 3: SETTINGS -->
    <section id="tabSettings" class="tab-content hidden space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Members Management -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h3 class="font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
            <i class="fa-solid fa-user-plus text-indigo-600"></i> 스터디원 관리
          </h3>
          <form id="addMemberForm" class="flex gap-2">
            <input type="text" id="newMemberName" required placeholder="스터디원 이름 입력" class="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shrink-0">추가</button>
          </form>
          <ul id="memberList" class="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            <!-- Render member list with delete -->
          </ul>
        </div>

        <!-- Fine Rule Settings -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h3 class="font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
            <i class="fa-solid fa-coins text-amber-500"></i> 벌금 규칙 설정
          </h3>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">지각 벌금 (원)</label>
              <input type="number" id="lateFineInput" step="500" min="0" class="w-full border border-slate-300 rounded-lg p-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">결석 벌금 (원)</label>
              <input type="number" id="absentFineInput" step="500" min="0" class="w-full border border-slate-300 rounded-lg p-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">카카오페이 / 계좌번호 안내 문구 (공유용)</label>
              <input type="text" id="accountInfoInput" placeholder="예: 카카오뱅크 3333-xx-xxxx 홍길동" class="w-full border border-slate-300 rounded-lg p-2 text-sm" />
            </div>
            <button id="btnSaveRules" class="w-full bg-slate-800 text-white py-2 rounded-lg text-sm font-semibold hover:bg-slate-900 transition">규칙 저장하기</button>
          </div>
          <div class="pt-4 border-t border-slate-100">
            <button id="btnResetAll" class="text-xs text-rose-500 hover:underline">전체 데이터 초기화(주의)</button>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- Modal: Add Session -->
  <div id="sessionModal" class="modal fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
      <h3 class="font-bold text-slate-800 text-lg">새 모임 세션 추가</h3>
      <div>
        <label class="block text-xs text-slate-600 mb-1">세션 제목/회차</label>
        <input type="text" id="modalSessionTitle" placeholder="예: 4회차 정기모임" class="w-full border rounded-lg p-2 text-sm outline-none border-slate-300 focus:border-indigo-500" />
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">날짜</label>
        <input type="date" id="modalSessionDate" class="w-full border rounded-lg p-2 text-sm outline-none border-slate-300 focus:border-indigo-500" />
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button id="modalCloseBtn" class="px-3 py-1.5 text-sm rounded-lg border border-slate-300 hover:bg-slate-100">취소</button>
        <button id="modalSaveSessionBtn" class="px-4 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">추가하기</button>
      </div>
    </div>
  </div>

  <div id="toast" class="fixed bottom-5 right-5 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm shadow-xl transition-all transform translate-y-16 opacity-0 duration-300 pointer-events-none">
    알림 내용
  </div>

  <script src="app.js"></script>
</body>
</html>

=== style.css ===
/* Tab styling helper */
.tab-btn.active {
  background-color: white !important;
  color: #4f46e5 !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease-in-out;
}

.status-present {
  background-color: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.status-late {
  background-color: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
}

.status-absent {
  background-color: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

=== app.js ===
// Default Initial Data
const STORAGE_KEY = 'study_manager_data_v1';

const defaultState = {
  rules: {
    lateFine: 1000,
    absentFine: 3000,
    accountInfo: '카카오뱅크 3333-01-1234567 홍길동'
  },
  members: [
    { id: 'm1', name: '김철수' },
    { id: 'm2', name: '이영희' },
    { id: 'm3', name: '박민수' },
    { id: 'm4', name: '정수진' }
  ],
  sessions: [
    {
      id: 's1',
      title: '1회차 알고리즘 스터디',
      date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    },
    {
      id: 's2',
      title: '2회차 프로젝트 기획',
      date: new Date().toISOString().split('T')[0]
    }
  ],
  // records: { sessionId: { memberId: { status: 'present'|'late'|'absent', fine: number, paid: boolean, note: string } } }
  records: {
    's1': {
      'm1': { status: 'present', fine: 0, paid: true, note: '' },
      'm2': { status: 'late', fine: 1000, paid: true, note: '10분 늦음' },
      'm3': { status: 'absent', fine: 3000, paid: false, note: '출장' },
      'm4': { status: 'present', fine: 0, paid: true, note: '' }
    },
    's2': {
      'm1': { status: 'present', fine: 0, paid: true, note: '' },
      'm2': { status: 'present', fine: 0, paid: true, note: '' },
      'm3': { status: 'late', fine: 1000, paid: false, note: '차량 정체' },
      'm4': { status: 'absent', fine: 3000, paid: false, note: '개인사정' }
    }
  }
};

let state = loadState();
let currentSessionId = state.sessions.length > 0 ? state.sessions[state.sessions.length - 1].id : null;

// Storage
function loadState() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return defaultState;
  try {
    return JSON.parse(data);
  } catch (e) {
    return defaultState;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderStats();
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('opacity-0', 'translate-y-16');
  toast.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-16');
  }, 2200);
}

// Navigation
function initTabs() {
  const tabs = [
    { btn: 'tabBtnCheck', section: 'tabCheck' },
    { btn: 'tabBtnFine', section: 'tabFine' },
    { btn: 'tabBtnSettings', section: 'tabSettings' }
  ];

  tabs.forEach(t => {
    document.getElementById(t.btn).addEventListener('click', () => {
      tabs.forEach(o => {
        document.getElementById(o.btn).classList.remove('active', 'bg-white', 'text-indigo-700', 'shadow');
        document.getElementById(o.btn).classList.add('text-indigo-100');
        document.getElementById(o.section).classList.add('hidden');
      });
      document.getElementById(t.btn).classList.add('active', 'bg-white', 'text-indigo-700', 'shadow');
      document.getElementById(t.btn).classList.remove('text-indigo-100');
      document.getElementById(t.section).classList.remove('hidden');

      if (t.section === 'tabFine') renderFineDashboard();
      if (t.section === 'tabSettings') renderSettingsTab();
    });
  });
}

// Stats Top Bar
function renderStats() {
  const membersCount = state.members.length;
  const sessionCount = state.sessions.length;

  let totalFine = 0;
  let unpaidFine = 0;

  Object.values(state.records).forEach(sessionRec => {
    Object.values(sessionRec).forEach(rec => {
      if (rec && rec.fine > 0) {
        totalFine += rec.fine;
        if (!rec.paid) unpaidFine += rec.fine;
      }
    });
  });

  document.getElementById('statMemberCount').textContent = `${membersCount}명`;
  document.getElementById('statSessionCount').textContent = `${sessionCount}회`;
  document.getElementById('statTotalFine').textContent = `${totalFine.toLocaleString()}원`;
  document.getElementById('statUnpaidFine').textContent = `${unpaidFine.toLocaleString()}원`;
}

// Attendance Logic
function ensureSessionRecords(sessionId) {
  if (!state.records[sessionId]) {
    state.records[sessionId] = {};
  }
  state.members.forEach(m => {
    if (!state.records[sessionId][m.id]) {
      state.records[sessionId][m.id] = {
        status: 'present',
        fine: 0,
        paid: true,
        note: ''
      };
    }
  });
}

function updateSessionSelect() {
  const select = document.getElementById('sessionSelect');
  select.innerHTML = '';
  if (state.sessions.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '등록된 세션 없음';
    select.appendChild(opt);
    currentSessionId = null;
    return;
  }

  state.sessions.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.title} (${s.date})`;
    if (s.id === currentSessionId) opt.selected = true;
    select.appendChild(opt);
  });
}

function renderAttendanceTable() {
  const tbody = document.getElementById('attendanceTbody');
  const emptyNotice = document.getElementById('emptyAttendanceNotice');
  tbody.innerHTML = '';

  if (!currentSessionId || state.sessions.length === 0 || state.members.length === 0) {
    emptyNotice.classList.remove('hidden');
    document.getElementById('currentSessionTitle').textContent = '세션 또는 멤버 없음';
    document.getElementById('currentSessionDate').textContent = '';
    return;
  }
  emptyNotice.classList.add('hidden');

  const session = state.sessions.find(s => s.id === currentSessionId);
  if (session) {
    document.getElementById('currentSessionTitle').textContent = session.title;
    document.getElementById('currentSessionDate').textContent = `일시: ${session.date}`;
  }

  ensureSessionRecords(currentSessionId);
  const sessionRecords = state.records[currentSessionId];

  state.members.forEach((member, idx) => {
    const record = sessionRecords[member.id] || { status: 'present', fine: 0, paid: true, note: '' };

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';

    tr.innerHTML = `
      <td class="p-3 text-center text-slate-400 font-mono text-xs">${idx + 1}</td>
      <td class="p-3 font-semibold text-slate-800">${escapeHtml(member.name)}</td>
      <td class="p-3">
        <div class="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs">
          <button class="status-btn px-2.5 py-1 rounded ${record.status === 'present' ? 'bg-emerald-500 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}" data-member="${member.id}" data-status="present">출석</button>
          <button class="status-btn px-2.5 py-1 rounded ${record.status === 'late' ? 'bg-amber-500 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}" data-member="${member.id}" data-status="late">지각</button>
          <button class="status-btn px-2.5 py-1 rounded ${record.status === 'absent' ? 'bg-red-500 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}" data-member="${member.id}" data-status="absent">결석</button>
        </div>
      </td>
      <td class="p-3">
        <span class="font-bold ${record.fine > 0 ? (record.paid ? 'text-emerald-600 line-through' : 'text-rose-600') : 'text-slate-400'}">
          ${record.fine.toLocaleString()}원
        </span>
        ${record.fine > 0 ? `<button class="pay-toggle ml-2 text-xs px-2 py-0.5 rounded border ${record.paid ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-rose-50 border-rose-200 text-rose-600'}" data-member="${member.id}">${record.paid ? '납부완료' : '미납'}</button>` : ''}
      </td>
      <td class="p-3">
        <input type="text" class="note-input w-full max-w-xs border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-2 py-1 text-xs outline-none bg-slate-50 focus:bg-white" data-member="${member.id}" placeholder="비고 입력" value="${escapeHtml(record.note || '')}" />
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach status change events
  tbody.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const memId = btn.dataset.member;
      const newStatus = btn.dataset.status;
      let fine = 0;
      if (newStatus === 'late') fine = state.rules.lateFine;
      else if (newStatus === 'absent') fine = state.rules.absentFine;

      const prev = sessionRecords[memId];
      sessionRecords[memId] = {
        ...prev,
        status: newStatus,
        fine: fine,
        paid: fine === 0 ? true : (prev.status === newStatus ? prev.paid : false)
      };
      saveState();
      renderAttendanceTable();
    });
  });

  // Attach fine toggle events
  tbody.querySelectorAll('.pay-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const memId = btn.dataset.member;
      sessionRecords[memId].paid = !sessionRecords[memId].paid;
      saveState();
      renderAttendanceTable();
    });
  });

  // Note updates
  tbody.querySelectorAll('.note-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const memId = e.target.dataset.member;
      sessionRecords[memId].note = e.target.value;
      saveState();
    });
  });
}

// Fine Tab Render
function renderFineDashboard() {
  const container = document.getElementById('memberFineCards');
  container.innerHTML = '';

  const memberStats = {};
  state.members.forEach(m => {
    memberStats[m.id] = { name: m.name, lateCount: 0, absentCount: 0, totalFine: 0, unpaidFine: 0 };
  });

  const detailRows = [];

  state.sessions.forEach(sess => {
    const sRecords = state.records[sess.id] || {};
    state.members.forEach(m => {
      const rec = sRecords[m.id];
      if (rec) {
        if (rec.status === 'late') memberStats[m.id].lateCount++;
        if (rec.status === 'absent') memberStats[m.id].absentCount++;
        if (rec.fine > 0) {
          memberStats[m.id].totalFine += rec.fine;
          if (!rec.paid) memberStats[m.id].unpaidFine += rec.fine;

          detailRows.push({
            sessionId: sess.id,
            sessionTitle: sess.title,
            sessionDate: sess.date,
            memberId: m.id,
            memberName: m.name,
            status: rec.status,
            fine: rec.fine,
            paid: rec.paid,
            note: rec.note
          });
        }
      }
    });
  });

  // Cards
  state.members.forEach(m => {
    const stat = memberStats[m.id];
    const card = document.createElement('div');
    card.className = 'bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between';
    card.innerHTML = `
      <div>
        <div class="flex justify-between items-center mb-2">
          <h4 class="font-bold text-slate-800 text-base">${escapeHtml(stat.name)}</h4>
          <span class="text-xs px-2 py-0.5 rounded ${stat.unpaidFine > 0 ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-emerald-100 text-emerald-700'}">
            ${stat.unpaidFine > 0 ? `미납 ${stat.unpaidFine.toLocaleString()}원` : '전액 납부완료'}
          </span>
        </div>
        <div class="text-xs text-slate-500 space-y-1 mb-3">
          <div>지각: <span class="font-semibold text-slate-700">${stat.lateCount}회</span> / 결석: <span class="font-semibold text-slate-700">${stat.absentCount}회</span></div>
          <div>누적 발생 벌금: <span class="font-semibold text-slate-700">${stat.totalFine.toLocaleString()}원</span></div>
        </div>
      </div>
      <div class="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
        <span class="text-slate-400">납부 대상 잔액</span>
        <span class="text-base font-bold ${stat.unpaidFine > 0 ? 'text-rose-600' : 'text-slate-400'}">${stat.unpaidFine.toLocaleString()}원</span>
      </div>
    `;
    container.appendChild(card);
  });

  // Detail Table
  const detailTbody = document.getElementById('fineDetailTbody');
  detailTbody.innerHTML = '';
  if (detailRows.length === 0) {
    detailTbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">발생한 벌금 내역이 없습니다.</td></tr>`;
    return;
  }

  detailRows.forEach(row => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';
    tr.innerHTML = `
      <td class="p-3 text-slate-