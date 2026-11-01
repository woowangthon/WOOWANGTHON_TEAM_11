ASSUMPTION: The application is built as a single-page React application with Tailwind CSS and Lucide icons (client-side only with localStorage persistence).
ASSUMPTION: Monthly membership fee cycle (year/month) is the default unit for tracking payment status.
ASSUMPTION: "Sending notifications" includes generating personalized message templates, copying them to the clipboard, and triggering KakaoTalk/SMS deep links (e.g. `sms:` URI or clipboard copy for messenger).
ASSUMPTION: Standard club member fields are name, phone number, role, and joined date.

=== package.json ===
{
  "name": "club-fee-manager",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "lucide-react": "^0.344.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  }
}

=== public/index.html ===
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>동아리 회비 관리</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 font-sans antialiased">
  <div id="root"></div>
</body>
</html>

=== src/index.js ===
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

=== src/App.js ===
import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle2, XCircle, Send, Plus, 
  Trash2, DollarSign, Calendar, Search, Copy, Check 
} from 'lucide-react';

const INITIAL_MEMBERS = [
  { id: '1', name: '김민수', phone: '010-1234-5678', role: '회장' },
  { id: '2', name: '이영희', phone: '010-2345-6789', role: '총무' },
  { id: '3', name: '박철수', phone: '010-3456-7890', role: '회원' },
  { id: '4', name: '정지원', phone: '010-4567-8901', role: '회원' },
  { id: '5', name: '최동욱', phone: '010-5678-9012', role: '회원' },
];

export default function App() {
  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [feeAmount, setFeeAmount] = useState(() => {
    return Number(localStorage.getItem('club_fee_amount')) || 10000;
  });
  const [bankInfo, setBankInfo] = useState(() => {
    return localStorage.getItem('club_bank_info') || '카카오뱅크 3333-01-1234567 (홍길동)';
  });
  
  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem('club_members');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });

  // paymentRecords: { "YYYY-MM": { memberId: boolean } }
  const [paymentRecords, setPaymentRecords] = useState(() => {
    const saved = localStorage.getItem('club_payments');
    return saved ? JSON.parse(saved) : {
      [currentMonthStr]: { '1': true, '2': true, '3': false, '4': false, '5': false }
    };
  });

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, PAID, UNPAID
  const [copiedId, setCopiedId] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'ADD_MEMBER' | 'CONFIG' | null
  const [newMember, setNewMember] = useState({ name: '', phone: '', role: '회원' });

  // Persistence
  useEffect(() => {
    localStorage.setItem('club_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('club_payments', JSON.stringify(paymentRecords));
  }, [paymentRecords]);

  useEffect(() => {
    localStorage.setItem('club_fee_amount', feeAmount);
    localStorage.setItem('club_bank_info', bankInfo);
  }, [feeAmount, bankInfo]);

  const currentRecords = paymentRecords[selectedMonth] || {};

  const togglePayment = (memberId) => {
    setPaymentRecords((prev) => ({
      ...prev,
      [selectedMonth]: {
        ...(prev[selectedMonth] || {}),
        [memberId]: !prev[selectedMonth]?.[memberId],
      },
    }));
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newMember.name) return;
    const item = {
      id: Date.now().toString(),
      name: newMember.name,
      phone: newMember.phone || '010-0000-0000',
      role: newMember.role || '회원',
    };
    setMembers((prev) => [...prev, item]);
    setNewMember({ name: '', phone: '', role: '회원' });
    setActiveModal(null);
  };

  const handleDeleteMember = (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const getRemindMessage = (member) => {
    const [year, month] = selectedMonth.split('-');
    return `[동아리 회비 안내]\n안녕하세요 ${member.name}님! ${year}년 ${Number(month)}월 동아리 회비(${feeAmount.toLocaleString()}원)가 아직 미납 상태입니다.\n\n입금 계좌: ${bankInfo}\n확인 후 입금 부탁드립니다. 감사합니다!`;
  };

  const copyReminder = (member) => {
    const text = getRemindMessage(member);
    navigator.clipboard.writeText(text);
    setCopiedId(member.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendSMS = (member) => {
    const body = encodeURIComponent(getRemindMessage(member));
    window.location.href = `sms:${member.phone}?body=${body}`;
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.name.includes(search) || m.phone.includes(search);
    const isPaid = !!currentRecords[m.id];
    if (filter === 'PAID') return matchesSearch && isPaid;
    if (filter === 'UNPAID') return matchesSearch && !isPaid;
    return matchesSearch;
  });

  const totalMembers = members.length;
  const paidCount = members.filter((m) => !!currentRecords[m.id]).length;
  const unpaidCount = totalMembers - paidCount;
  const collectedAmount = paidCount * feeAmount;
  const totalTargetAmount = totalMembers * feeAmount;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" />
            동아리 회비 관리
          </h1>
          <p className="text-sm text-slate-500 mt-1">회비 납부 현황 확인 및 미납자 알림 전송</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => setActiveModal('CONFIG')}
            className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition"
          >
            설정
          </button>
          <button
            onClick={() => setActiveModal('ADD_MEMBER')}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
          >
            <Plus className="w-4 h-4" /> 회원 추가
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">총 인원</span>
          <p className="text-2xl font-bold text-slate-800 mt-1">{totalMembers}명</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
          <span className="text-xs text-emerald-600 font-medium">납부 완료</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{paidCount}명</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
          <span className="text-xs text-rose-600 font-medium">미납자</span>
          <p className="text-2xl font-bold text-rose-700 mt-1">{unpaidCount}명</p>
        </div>
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
          <span className="text-xs text-indigo-600 font-medium">수납 금액</span>
          <p className="text-xl font-bold text-indigo-700 mt-1">
            {collectedAmount.toLocaleString()}원
            <span className="text-xs font-normal text-indigo-400 block">/ {totalTargetAmount.toLocaleString()}원</span>
          </p>
        </div>
      </div>

      {/* Member Management & Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-2">
            {['ALL', 'UNPAID', 'PAID'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === type
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type === 'ALL' && `전체 (${members.length})`}
                {type === 'UNPAID' && `미납 (${unpaidCount})`}
                {type === 'PAID' && `납부 완료 (${paidCount})`}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="이름 또는 전화번호 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 border rounded-lg text-sm w-full sm:w-60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Member List */}
        <div className="divide-y divide-slate-100">
          {filteredMembers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              조건에 맞는 회원이 없습니다.
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isPaid = !!currentRecords[member.id];
              return (
                <div
                  key={member.id}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => togglePayment(member.id)}
                      className={`p-2 rounded-full transition ${
                        isPaid
                          ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-slate-300 bg-slate-100 hover:text-slate-400'
                      }`}
                      title={isPaid ? '납부 취소' : '납부 완료 처리'}
                    >
                      <CheckCircle2 className={`w-6 h-6 ${isPaid ? 'fill-emerald-100' : ''}`} />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{member.name}</span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                          {member.role}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isPaid ? '납부완료' : '미납'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{member.phone}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {!isPaid && (
                      <>
                        <button
                          onClick={() => copyReminder(member)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                          title="안내 메시지 복사"
                        >
                          {copiedId === member.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" /> 복사됨
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> 메시지 복사
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => sendSMS(member)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-rose-50 border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-100 transition"
                        >
                          <Send className="w-3.5 h-3.5" /> 문자 보내기
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteMember(member.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition"
                      title="회원 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Member Modal */}
      {activeModal === 'ADD_MEMBER' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-800">새 회원 추가</h2>
            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">이름</label>
                <input
                  required
                  type="text"
                  placeholder="예: 홍길동"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">전화번호</label>
                <input
                  type="text"
                  placeholder="010-0000-0000"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">역할/직책</label>
                <input
                  type="text"
                  placeholder="회원, 임원 등"
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
                >
                  등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {activeModal === 'CONFIG' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-800">회비 및 계좌 설정</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">월 회비 금액 (원)</label>
                <input
                  type="number"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">입금 계좌 안내 문구</label>
                <textarea
                  rows={2}
                  value={bankInfo}
                  onChange={(e) => setBankInfo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
