ASSUMPTION: The application is built using a modern Single Page Application architecture with HTML, Tailwind CSS, and vanilla JavaScript for immediate in-browser execution with mock backend/local storage persistence.
ASSUMPTION: Photo uploads are handled via file input converted to base64 data URLs stored locally.
ASSUMPTION: Real-time chat is simulated using localStorage cross-tab event listeners and automated counterparty replies so single users can test full trade flow.
ASSUMPTION: Default textbooks/sample listings in Korean are pre-seeded if local storage is empty.
ASSUMPTION: Standard textbook transaction statuses ("판매중", "예약중", "거래완료") and campus/department categories are included.

=== index.html ===
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>북마켓 - 대학 중고 교재 직거래</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <style>
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="bg-gray-100 text-gray-800 antialiased min-h-screen pb-16 md:pb-0">

  <!-- Top Navigation -->
  <header class="bg-white border-b sticky top-0 z-30">
    <div class="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
      <div class="flex items-center gap-2 cursor-pointer" onclick="showView('list')">
        <i class="fa-solid fa-book-bookmark text-emerald-600 text-xl"></i>
        <span class="font-bold text-lg text-emerald-700 tracking-tight">북마켓</span>
        <span class="text-xs text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded">대학 교재 직거래</span>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="openNewPostModal()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 shadow-sm transition">
          <i class="fa-solid fa-plus text-xs"></i><span>교재 등록</span>
        </button>
        <button onclick="showView('chatList')" class="relative p-2 text-gray-600 hover:text-emerald-600 transition" title="채팅 목록">
          <i class="fa-regular fa-comment-dots text-xl"></i>
          <span id="unreadBadge" class="hidden absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
        </button>
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <main class="max-w-4xl mx-auto p-4">

    <!-- View: Listing Feed -->
    <section id="listView">
      <!-- Search & Filters -->
      <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-col sm:flex-row gap-2">
        <div class="relative flex-1">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-gray-400 text-sm"></i>
          <input type="text" id="searchInput" oninput="renderPosts()" placeholder="도서명, 저자, 과목명 검색..." class="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div class="flex gap-2">
          <select id="statusFilter" onchange="renderPosts()" class="text-sm bg-gray-50 border rounded-lg px-2.5 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="all">전체 상태</option>
            <option value="판매중">판매중</option>
            <option value="예약중">예약중</option>
            <option value="거래완료">거래완료</option>
          </select>
          <select id="univFilter" onchange="renderPosts()" class="text-sm bg-gray-50 border rounded-lg px-2.5 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="all">전체 전공</option>
            <option value="공학계열">공학계열</option>
            <option value="상경계열">상경계열</option>
            <option value="인문/사회">인문/사회</option>
            <option value="자연과학">자연과학</option>
            <option value="교양/기타">교양/기타</option>
          </select>
        </div>
      </div>

      <!-- Feed Grid -->
      <div id="postGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"></div>
      <div id="emptyPostState" class="hidden text-center py-16 text-gray-400">
        <i class="fa-solid fa-book-open text-4xl mb-3 text-gray-300"></i>
        <p>등록된 교재가 없습니다.</p>
      </div>
    </section>

    <!-- View: Post Detail -->
    <section id="detailView" class="hidden">
      <button onclick="showView('list')" class="mb-4 inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900">
        <i class="fa-solid fa-arrow-left mr-1.5"></i>목록으로 돌아가기
      </button>
      <div id="postDetailCard" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"></div>
    </section>

    <!-- View: Chat Room List -->
    <section id="chatListView" class="hidden">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold">거래 채팅 목록</h2>
        <button onclick="showView('list')" class="text-xs text-gray-500 hover:text-gray-800">닫기</button>
      </div>
      <div id="chatRoomsContainer" class="bg-white rounded-xl shadow-sm border divide-y overflow-hidden"></div>
    </section>

    <!-- View: Active Chat Room -->
    <section id="chatRoomView" class="hidden flex flex-col bg-white rounded-2xl shadow border h-[78vh] overflow-hidden">
      <div class="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button onclick="showView('chatList')" class="text-gray-500 hover:text-black">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div>
            <div id="chatTargetName" class="font-bold text-sm text-gray-800">상대방</div>
            <div id="chatBookTitle" class="text-xs text-gray-500 truncate max-w-[200px]">교재명</div>
          </div>
        </div>
        <div id="chatPriceTag" class="text-emerald-600 font-bold text-sm"></div>
      </div>
      <div id="chatMessageList" class="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50"></div>
      <form id="chatForm" onsubmit="handleSendChat(event)" class="p-3 bg-white border-t flex gap-2">
        <input id="chatInput" type="text" placeholder="메시지를 입력하세요 (예: 직거래 가능한가요?)" class="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" autocomplete="off" />
        <button type="submit" class="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-emerald-700 transition">전송</button>
      </form>
    </section>

  </main>

  <!-- Modal: New Post -->
  <div id="newPostModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white w-full max-w-lg rounded-2xl p-6 overflow-y-auto max-h-[90vh]">
      <div class="flex justify-between items-center mb-4 border-b pb-3">
        <h3 class="text-lg font-bold">중고 교재 등록</h3>
        <button onclick="closeNewPostModal()" class="text-gray-400 hover:text-gray-700 text-lg">&times;</button>
      </div>
      <form onsubmit="handleCreatePost(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">교재 사진 (최대 1장)</label>
          <div class="flex items-center gap-3">
            <div id="imagePreviewBox" class="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 overflow-hidden bg-gray-50 relative">
              <i class="fa-solid fa-camera text-xl" id="cameraIcon"></i>
              <img id="imagePreview" class="w-full h-full object-cover hidden" alt="미리보기" />
            </div>
            <input type="file" id="bookImageInput" accept="image/*" onchange="previewImage(event)" class="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">교재명 *</label>
          <input type="text" id="postTitle" required placeholder="예: 토마스 미적분학 14판" class="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">분야/계열</label>
            <select id="postCategory" class="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="공학계열">공학계열</option>
              <option value="상경계열">상경계열</option>
              <option value="인문/사회">인문/사회</option>
              <option value="자연과학">자연과학</option>
              <option value="교양/기타">교양/기타</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">판매 가격 (원) *</label>
            <input type="number" id="postPrice" required min="0" step="500" placeholder="예: 18000" class="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">필기 및 상태</label>
            <select id="postCondition" class="w-full text-sm border rounded-lg px-3 py-2">
              <option value="새 책에 가까움">새 책에 가까움</option>
              <option value="필기 약간 있음">필기 약간 있음</option>
              <option value="밑줄/필기 많음">밑줄/필기 많음</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">직거래 희망 장소</label>
            <input type="text" id="postLocation" placeholder="예: 학생회관 앞, 정문" class="w-full text-sm border rounded-lg px-3 py-2" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">상세 설명</label>
          <textarea id="postDescription" rows="3" placeholder="출판 연도, 교수님 강의명, 네고 가능 여부 등을 적어주세요." class="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"></textarea>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t">
          <button type="button" onclick="closeNewPostModal()" class="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">취소</button>
          <button type="submit" class="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700">게시하기</button>
        </div>
      </form>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>

=== app.js ===
// Initial Seed Data
const DEFAULT_POSTS = [
  {
    id: "post_1",
    title: "스튜어트 미분적분학 9판 (한글판)",
    price: 24000,
    category: "공학계열",
    condition: "필기 약간 있음",
    location: "중앙도서관 앞 직거래",
    description: "앞 2개 챕터에만 연필 필기 있고 스프링 제본 되어있어 넘겨보기 편합니다. 에눌 조금 가능해요.",
    sellerId: "user_park",
    sellerName: "공대생박군",
    status: "판매중",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=60",
    createdAt: Date.now() - 1000 * 60 * 60 * 3
  },
  {
    id: "post_2",
    title: "맨큐의 경제학 8판",
    price: 20000,
    category: "상경계열",
    condition: "새 책에 가까움",
    location: "경영관 로비 또는 정문",
    description: "교양 수업 들을 때 샀다가 전공이 바뀌어서 거의 펴보지 않은 책입니다. 형광펜 자국도 없습니다.",
    sellerId: "user_lee",
    sellerName: "이코노미",
    status: "예약중",
    image: "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=500&auto=format&fit=crop&q=60",
    createdAt: Date.now() - 1000 * 60 * 60 * 12
  },
  {
    id: "post_3",
    title: "기초 컴퓨터구조론 개정 4판",
    price: 15000,
    category: "공학계열",
    condition: "밑줄/필기 많음",
    location: "IT공학관 GS25 앞",
    description: "중간고사 기말고사 족보 필기 깨알같이 적혀있습니다. A+ 받은 과목 정리노트 함께 복사해 드려요.",
    sellerId: "user_choi",
    sellerName: "코딩조아",
    status: "판매중",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&auto=format&fit=crop&q=60",
    createdAt: Date.now() - 1000 * 60 * 60 * 24
  }
];

const CURRENT_USER = {
  id: "my_user_id",
  name: "나 (구매희망)"
};

// LocalStorage helpers
function getPosts() {
  const data = localStorage.getItem("bookmarket_posts");
  if (!data) {
    localStorage.setItem("bookmarket_posts", JSON.stringify(DEFAULT_POSTS));
    return DEFAULT_POSTS;
  }
  return JSON.parse(data);
}

function savePosts(posts) {
  localStorage.setItem("bookmarket_posts", JSON.stringify(posts));
}

function getChats() {
  const data = localStorage.getItem("bookmarket_chats");
  return data ? JSON.parse(data) : [];
}

function saveChats(chats) {
  localStorage.setItem("bookmarket_chats", JSON.stringify(chats));
}

let activePostId = null;
let activeChatRoomId = null;
let uploadedImageBase64 = null;

// Routing between views
function showView(viewName) {
  const views = ["listView", "detailView", "chatListView", "chatRoomView"];
  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.classList.add("hidden");
  });

  if (viewName === "list") {
    document.getElementById("listView").classList.remove("hidden");
    renderPosts();
  } else if (viewName === "detail") {
    document.getElementById("detailView").classList.remove("hidden");
  } else if (viewName === "chatList") {
    document.getElementById("chatListView").classList.remove("hidden");
    renderChatList();
  } else if (viewName === "chatRoom") {
    document.getElementById("chatRoomView").classList.remove("hidden");
  }
}

// Render Listings
function renderPosts() {
  const posts = getPosts();
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const statusFilter = document.getElementById("statusFilter").value;
  const univFilter = document.getElementById("univFilter").value;

  const filtered = posts.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search) || (p.description && p.description.toLowerCase().includes(search));
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchUniv = univFilter === "all" || p.category === univFilter;
    return matchSearch && matchStatus && matchUniv;
  });

  const grid = document.getElementById("postGrid");
  const empty = document.getElementById("emptyPostState");

  if (filtered.length === 0) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  grid.innerHTML = filtered.map(post => {
    const statusColor = post.status === "판매중" ? "bg-emerald-100 text-emerald-800" : (post.status === "예약중" ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-700");
    return `
      <div onclick="openPostDetail('${post.id}')" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition flex flex-col">
        <div class="h-44 w-full bg-gray-100 relative overflow-hidden">
          <img src="${post.image}" alt="${post.title}" class="w-full h-full object-cover">
          <span class="absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}">${post.status}</span>
        </div>
        <div class="p-3.5 flex-1 flex flex-col justify-between">
          <div>
            <div class="text-xs text-gray-400 mb-0.5">${post.category} · ${post.sellerName}</div>
            <h3 class="font-bold text-gray-900 text-sm line-clamp-1">${escapeHtml(post.title)}</h3>
            <p class="text-xs text-gray-500 mt-1 line-clamp-2">${escapeHtml(post.description || "")}</p>
          </div>
          <div class="mt-3 flex items-center justify-between border-t pt-2">
            <span class="text-xs text-gray-500"><i class="fa-solid fa-location-dot text-xs text-emerald-600 mr-1"></i>${escapeHtml(post.location || "교내직거래")}</span>
            <span class="text-base font-extrabold text-emerald-700">${Number(post.price).toLocaleString()}원</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Detail View
function openPostDetail(postId) {
  activePostId = postId;
  const post = getPosts().find(p => p.id === postId);
  if (!post) return;

  const isSeller = post.sellerId === CURRENT_USER.id;
  const statusBadge = post.status === "판매중" ? "bg-emerald-100 text-emerald-800" : (post.status === "예약중" ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-700");

  const detailCard = document.getElementById("postDetailCard");
  detailCard.innerHTML = `
    <div class="md:flex">
      <div class="md:w-1/2 bg-gray-50 flex items-center justify-center max-h-[380px] overflow-hidden">
        <img src="${post.image}" class="w-full h-full object-cover max-h-[380px]" alt="${post.title}">
      </div>
      <div class="p-5 md:w-1/2 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold px-2 py-0.5 rounded-full ${statusBadge}">${post.status}</span>
            <span class="text-xs text-gray-400">${new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
          <h1 class="text-xl font-bold mt-2 text-gray-900">${escapeHtml(post.title)}</h1>
          <div class="text-2xl font-black text-emerald-700 mt-1">${Number(post.price).toLocaleString()}원</div>

          <div class="mt-4 bg-gray-50 rounded-lg p-3 text-xs space-y-1.5 text-gray-600">
            <div><strong class="text-gray-700">전공/계열:</strong> ${post.category}</div>
            <div><strong class="text-gray-700">도서 상태:</strong> ${post.condition}</div>
            <div><strong class="text-gray-700">거래 장소:</strong> ${escapeHtml(post.location || "미지정")}</div>
            <div><strong class="text-gray-700">판매자:</strong> ${post.sellerName}</div>
          </div>

          <p class="text-sm text-gray-700 mt-4 leading-relaxed whitespace-pre-wrap">${escapeHtml(post.description)}</p>
        </div>

        <div class="mt-6 pt-4 border-t flex gap-2">
          ${isSeller ? `
            <select onchange="updatePostStatus('${post.id}', this.value)" class="text-sm border rounded-lg px-3 py-2 bg-white flex-1 font-semibold">
              <option value="판매중" ${post.status === "판매중" ? "selected" : ""}>판매중으로 변경</option>
              <option value="예약중" ${post.status === "예약중" ? "selected" : ""}>예약중으로 변경</option>
              <option value="거래완료" ${post.status === "거래완료" ? "selected" : ""}>거래완료로 변경</option>
            </select>
            <button onclick="deletePost('${post.id}')" class="px-3 py-2 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50">삭제</button>
          ` : `
            <button onclick="startChatWithSeller('${post.id}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition">
              <i class="fa-regular fa-comment-dots"></i>
              <span>판매자와 1:1 거래 채팅하기</span>
            </button>
          `}
        </div>
      </div>
    </div>
  `;
  showView("detail");
}

function updatePostStatus(postId, newStatus) {
  const posts = getPosts();
  const idx = posts.findIndex(p => p.id === postId);
  if (idx !== -1) {
    posts[idx].status = newStatus;
    savePosts(posts);
    openPostDetail(postId);
  }
}

function deletePost(postId) {
  if (!confirm("교재 게시글을 삭제하시겠습니까?")) return;
  const posts = getPosts().filter(p => p.id !== postId);
  savePosts(posts);
  showView("list");
}

// Modal handling & Image Upload
function openNewPostModal() {
  document.getElementById("newPostModal").classList.remove("hidden");
  uploadedImageBase64 = null;
  document.getElementById("imagePreview").classList.add("hidden");
  document.getElementById("cameraIcon").classList.remove("hidden");
}

function closeNewPostModal() {
  document.getElementById("newPostModal").classList.add("hidden");
}

function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    uploadedImageBase64 = e.target.result;
    const imgEl = document.getElementById("imagePreview");
    imgEl.src = uploadedImageBase64;
    imgEl.classList.remove("hidden");
    document.getElementById("cameraIcon").classList.add("hidden");
  };
  reader.readAsDataURL(file);
}

function handleCreatePost(e) {
  e.preventDefault();
  const title = document.getElementById("postTitle").value.trim();
  const price = parseInt(document.getElementById("postPrice").value, 10);
  const category = document.getElementById("postCategory").value;
  const condition = document.getElementById("postCondition").value;
  const location = document.getElementById("postLocation").value.trim() || "교내 직거래";
  const description = document.getElementById("postDescription").value.trim();

  const newPost = {
    id: "post_" + Date.now(),
    title,
    price,
    category,
    condition,
    location,
    description,
    sellerId: CURRENT_USER.id,
    sellerName: CURRENT_USER.name,
    status: "판매중",
    image: uploadedImageBase64 || "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=500&auto=format&fit=crop&q=60",
    createdAt: Date.now()
  };

  const posts = getPosts();
  posts.unshift(newPost);
  savePosts(posts);

  closeNewPostModal();
  e.target.reset();
  showView("list");
}

// Chat Functionality
function startChatWithSeller(postId) {
  const post = getPosts().find(p => p.id === postId);
  if (!post) return;

  let chats = getChats();
  let room = chats.find(c => c.postId === postId && c.buyerId === CURRENT_USER.id);

  if (!room) {
    room = {
      roomId: "chat_" + Date.now(),
      postId: post.id,
      postTitle: post.title,
      postPrice: post.price,
      sellerId: post.sellerId,
      sellerName: post.sellerName,
      buyerId: CURRENT_USER.id,
      buyerName: CURRENT_USER.name,
      messages: [
        {
          senderId: "system",
          text: `[시스템] 안전한 거래를 위해 학교 내 공공장소(도서관 로비, 학생회관 등)에서 대면 직거래를 권장합니다.`,
          time: Date.now()
        }
      ]
    };
    chats.unshift(room);
    saveChats(chats);
  }

  openChatRoom(room.roomId);
}

function openChatRoom(roomId) {
  activeChatRoomId = roomId;
  const chats = getChats();
  const room = chats.find(c => c.roomId === roomId);
  if (!room) return;

  const targetName = room.sellerId === CURRENT_USER.id ? room.buyerName : room.sellerName;
  document.getElementById("chatTargetName").textContent = targetName;
  document.getElementById("chatBookTitle").textContent = room.postTitle;
  document.getElementById("chatPriceTag").textContent = `${Number(room.postPrice).toLocaleString()}원`;

  renderChatMessages(room);
  showView("chatRoom");
}

function renderChatMessages(room) {
  const msgContainer = document.getElementById("chatMessageList");
  msgContainer.innerHTML = room.messages.map(msg => {
    if (msg.senderId === "system") {
      return `<div class="text-center"><span class="bg-gray-200 text-gray-600 text-xs px-2.5 py-1 rounded-full">${escapeHtml(msg.text)}</span></div>`;
    }
    const isMine = msg.senderId === CURRENT_USER.id;
    return `
      <div class="flex flex-col ${isMine ? 'items-end' : 'items-start'}">
        <div class="max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${isMine ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white border text-gray-800 rounded-bl-none shadow-sm'}">
          ${escapeHtml(msg.text)}
        </div>
        <span class="text-[10px] text-gray-400 mt-1 px-1">${new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      </div>
    `;
  }).join("");
  msgContainer.scrollTop = msgContainer.scrollHeight;
}

function handleSendChat(e) {
  e.preventDefault();
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text || !activeChatRoomId) return;

  const chats = getChats();
  const room = chats.find(c => c.roomId === activeChatRoomId);
  if (!room) return;

  const newMsg = {
    senderId: CURRENT_USER.id,
    text,
    time: Date.now()
  };
  room.messages.push(newMsg);
  saveChats(chats);
  renderChatMessages(room);
  input.value = "";

  // Mock counterparty auto-reply if chatting with dummy users
  if (room.sellerId !== CURRENT_USER.id) {
    setTimeout(() => {
      const replies = [
        "안녕하세요! 네, 아직 판매 중입니다. 직거래 가능하신가요?",
        "네 직거래 가능합니다! 학생회관 앞이나 중도 1층 로비 어떠세요?",
        "수업 끝나는 3시 이후에 시간 괜찮습니다!",
        "좋습니다. 그 시간에 뵙겠습니다 :)"
      ];
      const botMsg = {
        senderId: room.sellerId,
        text: replies[Math.floor(Math.random() * replies.length)],
        time: Date.now()
      };
      room.messages.push(botMsg);
      saveChats(chats);
      if (activeChatRoomId === room.roomId) {
        renderChatMessages(room);
      }