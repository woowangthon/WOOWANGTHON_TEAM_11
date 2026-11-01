ASSUMPTION: SQLite (better-sqlite3) is used as the local server database to meet the server database requirement without external infrastructure.
ASSUMPTION: Since there is no user login, a persistent anonymous nickname or random sender token stored in the browser's localStorage is used to identify chat participants.
ASSUMPTION: Polling is used for the built-in 1:1 chat messages per post to avoid complex external real-time services.
ASSUMPTION: The web UI is served directly via static files from the Express backend, adhering strictly to the required `src/core/`, `src/services/`, and `src/ui/` folder architecture.

=== package.json ===
{
  "name": "used-book-market",
  "version": "1.0.0",
  "description": "중고 교재 거래 게시판 및 내부 채팅 시제품",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "better-sqlite3": "^11.8.1",
    "express": "^4.21.2",
    "multer": "^1.4.5-lts.1"
  }
}

=== .env.example ===
PORT=3000
UPLOAD_DIR=./uploads

=== .gitignore ===
node_modules/
uploads/
market.db
.env

=== server.js ===
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb, getDb } from './src/db.js';
import { validateBookInput, validateMessageInput } from './src/core/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_PATH = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

initDb();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_PATH, {
  setHeaders: (res) => {
    res.set('Content-Disposition', 'inline');
    res.set('X-Content-Type-Options', 'nosniff');
  }
}));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_PATH),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype;
    if (allowed.test(ext) && allowed.test(mime)) {
      return cb(null, true);
    }
    cb(new Error('허용되지 않는 파일 형식입니다. (이미지 파일만 가능)'));
  }
});

// APIs
app.get('/api/books', (_req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT id, title, price, image_url, created_at FROM books ORDER BY id DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/books', upload.single('image'), (req, res) => {
  try {
    const { title, price, description } = req.body;
    const validationError = validateBookInput({ title, price, description });
    if (validationError) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: validationError });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const db = getDb();
    const stmt = db.prepare('INSERT INTO books (title, price, description, image_url) VALUES (?, ?, ?, ?)');
    const result = stmt.run(title.trim(), parseInt(price, 10), description.trim(), imageUrl);

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/books/:id', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/books/:id', (req, res) => {
  try {
    const db = getDb();
    const book = db.prepare('SELECT image_url FROM books WHERE id = ?').get(req.params.id);
    if (!book) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }
    if (book.image_url) {
      const filePath = path.join(UPLOAD_PATH, path.basename(book.image_url));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    db.prepare('DELETE FROM messages WHERE book_id = ?').run(req.params.id);
    db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/books/:id/messages', (req, res) => {
  try {
    const db = getDb();
    const messages = db.prepare('SELECT * FROM messages WHERE book_id = ? ORDER BY id ASC').all(req.params.id);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/books/:id/messages', (req, res) => {
  try {
    const { sender, content } = req.body;
    const validationError = validateMessageInput({ sender, content });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    const db = getDb();
    const stmt = db.prepare('INSERT INTO messages (book_id, sender, content) VALUES (?, ?, ?)');
    stmt.run(req.params.id, sender.trim(), content.trim());
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.message || '서버 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

=== src/db.js ===
import Database from 'better-sqlite3';

let db;

export function getDb() {
  if (!db) {
    db = new Database('market.db');
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initDb() {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id)
    );
  `);
}

=== src/core/validation.js ===
export function validateBookInput({ title, price, description }) {
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return '교재명을 입력해주세요.';
  }
  if (title.length > 100) {
    return '교재명은 100자 이내여야 합니다.';
  }
  const parsedPrice = parseInt(price, 10);
  if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
    return '올바른 가격(0원 이상)을 입력해주세요.';
  }
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return '교재 설명을 입력해주세요.';
  }
  if (description.length > 2000) {
    return '교재 설명은 2000자 이내여야 합니다.';
  }
  return null;
}

export function validateMessageInput({ sender, content }) {
  if (!sender || typeof sender !== 'string' || sender.trim().length === 0) {
    return '닉네임을 입력해주세요.';
  }
  if (sender.length > 30) {
    return '닉네임은 30자 이내여야 합니다.';
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return '메시지 내용을 입력해주세요.';
  }
  if (content.length > 500) {
    return '메시지는 500자 이내여야 합니다.';
  }
  return null;
}

=== public/index.html ===
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>중고 교재 거래 게시판</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="header">
    <div class="container header-container">
      <h1 onclick="window.navigateToList()">📚 중고 교재 마켓</h1>
      <button id="nav-create-btn" class="btn primary">교재 등록</button>
    </div>
  </header>

  <main class="container main-content" id="app-root"></main>

  <script type="module" src="/src/ui/app.js"></script>
</body>
</html>

=== public/style.css ===
* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
body { background: #f5f6f8; color: #333; line-height: 1.5; }
.container { max-width: 720px; margin: 0 auto; padding: 0 16px; }
.header { background: #fff; border-bottom: 1px solid #e1e4e8; padding: 14px 0; position: sticky; top: 0; z-index: 10; }
.header-container { display: flex; justify-content: space-between; align-items: center; }
.header h1 { font-size: 1.25rem; cursor: pointer; color: #2b6cb0; }
.main-content { padding-top: 20px; padding-bottom: 40px; }
.btn { border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 600; }
.btn.primary { background: #3182ce; color: #fff; }
.btn.primary:hover { background: #2b6cb0; }
.btn.secondary { background: #edf2f7; color: #4a5568; }
.btn.danger { background: #e53e3e; color: #fff; }
.card { background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.book-list-item { display: flex; padding: 12px; gap: 16px; cursor: pointer; }
.book-list-item:hover { background-color: #f7fafc; }
.book-thumb { width: 90px; height: 90px; object-fit: cover; border-radius: 6px; background-color: #edf2f7; }
.book-meta { display: flex; flex-direction: column; justify-content: space-around; flex: 1; }
.book-title { font-size: 1.05rem; font-weight: bold; color: #2d3748; }
.book-price { font-size: 1rem; color: #2b6cb0; font-weight: bold; }
.book-date { font-size: 0.8rem; color: #a0aec0; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 0.9rem; }
.form-group input, .form-group textarea { width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 0.95rem; }
.detail-img { width: 100%; max-height: 360px; object-fit: contain; background: #2d3748; }
.detail-body { padding: 16px; }
.detail-price { font-size: 1.4rem; color: #2b6cb0; font-weight: bold; margin: 10px 0; }
.detail-desc { white-space: pre-wrap; margin: 16px 0; font-size: 0.95rem; color: #4a5568; }
.chat-section { margin-top: 24px; border-top: 2px solid #e2e8f0; padding-top: 16px; }
.chat-box { height: 260px; overflow-y: auto; background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 12px; }
.chat-bubble { margin-bottom: 10px; }
.chat-sender { font-size: 0.75rem; font-weight: bold; color: #4a5568; margin-bottom: 2px; }
.chat-msg { display: inline-block; background: #fff; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 12px; font-size: 0.9rem; }
.chat-form { display: flex; gap: 8px; }
.chat-form input[type="text"] { flex: 1; padding: 8px 12px; border: 1px solid #cbd5e0; border-radius: 6px; }

=== public/src/core/format.js ===
export function formatPrice(num) {
  return Number(num).toLocaleString() + '원';
}

export function formatDate(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

export function getUserIdentifier() {
  let user = localStorage.getItem('user_nickname');
  if (!user) {
    user = `구매자_${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem('user_nickname', user);
  }
  return user;
}

=== public/src/services/api.js ===
export async function fetchBooks() {
  const res = await fetch('/api/books');
  if (!res.ok) throw new Error((await res.json()).error || '교재 목록 로드 실패');
  return res.json();
}

export async function fetchBookDetail(id) {
  const res = await fetch(`/api/books/${id}`);
  if (!res.ok) throw new Error((await res.json()).error || '게시글 상세 로드 실패');
  return res.json();
}

export async function createBook(formData) {
  const res = await fetch('/api/books', { method: 'POST', body: formData });
  if (!res.ok) throw new Error((await res.json()).error || '게시글 등록 실패');
  return res.json();
}

export async function deleteBook(id) {
  const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error((await res.json()).error || '게시글 삭제 실패');
  return res.json();
}

export async function fetchMessages(bookId) {
  const res = await fetch(`/api/books/${bookId}/messages`);
  if (!res.ok) throw new Error((await res.json()).error || '채팅 로드 실패');
  return res.json();
}

export async function sendMessage(bookId, data) {
  const res = await fetch(`/api/books/${bookId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error((await res.json()).error || '메시지 전송 실패');
  return res.json();
}

=== public/src/ui/app.js ===
import { fetchBooks, fetchBookDetail, createBook, deleteBook, fetchMessages, sendMessage } from '../services/api.js';
import { formatPrice, formatDate, getUserIdentifier } from '../core/format.js';

const appRoot = document.getElementById('app-root');
const navCreateBtn = document.getElementById('nav-create-btn');

let chatTimer = null;

function clearChatPolling() {
  if (chatTimer) {
    clearInterval(chatTimer);
    chatTimer = null;
  }
}

export async function renderListView() {
  clearChatPolling();
  appRoot.innerHTML = '<div class="card" style="padding: 20px; text-align:center;">목록 불러오는 중...</div>';
  try {
    const books = await fetchBooks();
    if (books.length === 0) {
      appRoot.innerHTML = '<div class="card" style="padding: 30px; text-align:center;">등록된 교재가 없습니다.</div>';
      return;
    }
    const html = books.map(book => `
      <div class="card book-list-item" onclick="window.navigateToDetail(${book.id})">
        <img class="book-thumb" src="${book.image_url || '/placeholder.png'}" onerror="this.style.display='none'" />
        <div class="book-meta">
          <div class="book-title">${book.title}</div>
          <div class="book-price">${formatPrice(book.price)}</div>
          <div class="book-date">${formatDate(book.created_at)}</div>
        </div>
      </div>
    `).join('');
    appRoot.innerHTML = html;
  } catch (err) {
    appRoot.innerHTML = `<div class="card" style="padding: 20px; color: red;">${err.message}</div>`;
  }
}

export function renderCreateView() {
  clearChatPolling();
  appRoot.innerHTML = `
    <div class="card" style="padding: 20px;">
      <h2 style="margin-bottom: 16px;">새 교재 등록</h2>
      <form id="create-form">
        <div class="form-group">
          <label>교재명</label>
          <input type="text" name="title" required maxlength="100" placeholder="예: 대학 전공 미적분학 8판" />
        </div>
        <div class="form-group">
          <label>판매 가격 (원)</label>
          <input type="number" name="price" required min="0" placeholder="0" />
        </div>
        <div class="form-group">
          <label>상세 설명</label>
          <textarea name="description" rows="5" required placeholder="책 상태, 필기 유무 등을 자세히 적어주세요"></textarea>
        </div>
        <div class="form-group">
          <label>교재 사진</label>
          <input type="file" name="image" accept="image/*" />
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="submit" class="btn primary">등록하기</button>
          <button type="button" class="btn secondary" onclick="window.navigateToList()">취소</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('create-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await createBook(formData);
      renderListView();
    } catch (err) {
      alert(err.message);
    }
  });
}

export async function renderDetailView(id) {
  clearChatPolling();
  appRoot.innerHTML = '<div class="card" style="padding: 20px; text-align:center;">게시글 불러오는 중...</div>';
  try {
    const book = await fetchBookDetail(id);
    const currentUser = getUserIdentifier();

    appRoot.innerHTML = `
      <div class="card">
        ${book.image_url ? `<img class="detail-img" src="${book.image_url}" />` : ''}
        <div class="detail-body">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <h2>${book.title}</h2>
            <button class="btn danger" id="delete-btn">삭제</button>
          </div>
          <div class="detail-price">${formatPrice(book.price)}</div>
          <div class="book-date">등록일: ${formatDate(book.created_at)}</div>
          <div class="detail-desc">${book.description}</div>

          <div class="chat-section">
            <h3 style="margin-bottom: 10px;">실시간 거래 채팅</h3>
            <div class="chat-box" id="chat-messages">채팅 로딩 중...</div>
            <form id="chat-form" class="chat-form">
              <input type="text" id="chat-input" placeholder="대화를 입력하세요..." required maxlength="500" />
              <button type="submit" class="btn primary">보내기</button>
            </form>
          </div>
        </div>
      </div>
      <button class="btn secondary" style="margin-top: 10px;" onclick="window.navigateToList()">← 목록으로</button>
    `;

    document.getElementById('delete-btn').addEventListener('click', async () => {
      if (!confirm('이 게시글을 삭제하시겠습니까?')) return;
      try {
        await deleteBook(id);
        renderListView();
      } catch (err) {
        alert(err.message);
      }
    });

    const chatBox = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');

    async function updateChat() {
      try {
        const msgs = await fetchMessages(id);
        if (msgs.length === 0) {
          chatBox.innerHTML = '<div style="color: #a0aec0; text-align: center; margin-top: 30px;">메시지가 없습니다. 대화를 시작해보세요!</div>';
          return;
        }
        chatBox.innerHTML = msgs.map(m => `
          <div class="chat-bubble">
            <div class="chat-sender">${m.sender}</div>
            <div class="chat-msg">${m.content}</div>
          </div>
        `).join('');
        chatBox.scrollTop = chatBox.scrollHeight;
      } catch (err) {
        console.error('Chat update failed:', err);
      }
    }

    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = chatInput.value.trim();
      if (!content) return;
      try {
        await sendMessage(id, { sender: currentUser, content });
        chatInput.value = '';
        await updateChat();
      } catch (err) {
        alert(err.message);
      }
    });

    await updateChat();
    chatTimer = setInterval(updateChat, 3000);
  } catch (err) {
    appRoot.innerHTML = `<div class="card" style="padding: 20px; color: red;">${err.message}</div>`;
  }
}

window.navigateToList = renderListView;
window.navigateToDetail = renderDetailView;
navCreateBtn.addEventListener('click', renderCreateView);

renderListView();
