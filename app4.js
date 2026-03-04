// 🔥 IMPORT FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getFirestore,
  collection,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  doc,
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// 🔐 IMPORT AUTH (TAMBAHAN)
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// 🔧 CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyDzmRFkcpk54IJpK9fmhRJMJv20EkubNVA",
  authDomain: "osis-planner.firebaseapp.com",
  projectId: "osis-planner",
  storageBucket: "osis-planner.firebasestorage.app",
  messagingSenderId: "1064878789071",
  appId: "1:1064878789071:web:67c48e3bd45a3bf9e382ba"
};

// 🚀 INIT
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const db = getFirestore(app);
const taskCol = collection(db, "tasks");
const userCol = collection(db, "users"); // tambahan collection user
// 🔐 INIT AUTH (TAMBAHAN)
const auth = getAuth(app);

// ================= DOM =================
const taskContainer = document.getElementById("taskContainer");
const modal = document.getElementById("taskModal");

// 🔥 DELETE ALERT DOM
const deleteAlert = document.getElementById("deleteAlert");
const deleteConfirmBtn = document.getElementById("deleteConfirm");
const deleteCancelBtn = document.getElementById("deleteCancel");

let deleteTargetId = null;

const taskAuthor = document.getElementById("taskAuthor");
const taskName = document.getElementById("taskName");
const taskDesc = document.getElementById("taskDesc");
const taskDeadline = document.getElementById("taskDeadline");
const taskStatus = document.getElementById("taskStatus");
const taskCategory = document.getElementById("taskCategory");

const addBtn = document.getElementById("addBtn");
const saveBtn = document.getElementById("saveTask");
const cancelBtn = document.getElementById("cancelTask");
const downloadBtn = document.getElementById("downloadBtn");

const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const doneCount = document.getElementById("doneCount");
const lateCount = document.getElementById("lateCount");

const tabs = document.querySelectorAll(".tab");
const darkToggle = document.getElementById("darkToggle");
const searchInput = document.getElementById("searchInput");
// ================= AUTH DOM (TAMBAHAN) =================
const appContent = document.getElementById("appContent");
const authContainer = document.getElementById("authContainer");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authUsername = document.getElementById("authUsername");
const authPassword = document.getElementById("authPassword");
const authRole = document.getElementById("authRole"); // dropdown role tambahan


function makeEmail(username) {
  return username.trim().toLowerCase() + "@osis.local";
}

let editId = null;
let allTasks = [];
let activeTab = "Umum";
let currentUserRole = null;

// ================= MODAL =================
function openModal(edit = false, task = null) {
  modal.classList.add("show");

  if (edit && task) {
    editId = task.id;
    taskAuthor.value = task.author || "";
    taskName.value = task.name || "";
    taskDesc.value = task.desc || "";
    taskDeadline.value = task.deadline || "";
    taskStatus.value = task.status || "Belum mulai";
    taskCategory.value = task.kategori ?? "Umum";
  } else {
    editId = null;
    taskAuthor.value = "";
    taskName.value = "";
    taskDesc.value = "";
    taskDeadline.value = "";
    taskStatus.value = "Belum mulai";
    taskCategory.value = "Umum";
  }
}

function closeModal() {
  modal.classList.remove("show");
}

// ================= DATE LOGIC =================
function getUrgency(deadline) {
  const today = new Date();
  const d = new Date(deadline);
  today.setHours(0,0,0,0);
  d.setHours(0,0,0,0);

  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return "danger";
  if (diff === 0) return "today";
  if (diff <= 3) return "warning";
  return "normal";
}

function getHmin(deadline) {
  const today = new Date();
  const d = new Date(deadline);
  today.setHours(0,0,0,0);
  d.setHours(0,0,0,0);

  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

  if (diff > 0) return `⏳ H-${diff}`;
  if (diff === 0) return `🔥 H-0 (Hari ini)`;
  return `🚨 Terlambat ${Math.abs(diff)} hari`;
}

function getHminPDF(deadline) {
  const today = new Date();
  const d = new Date(deadline);
  today.setHours(0,0,0,0);
  d.setHours(0,0,0,0);

  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

  if (diff > 0) return `H-${diff}`;
  if (diff === 0) return `H-0 (Hari ini)`;
  return `Terlambat ${Math.abs(diff)} hari`;
}

function applyCategoryAccess() {

  const options = taskCategory.querySelectorAll("option");

  options.forEach(option => {

    const value = option.value;

    // default sembunyikan dulu
    option.style.display = "none";

    if (currentUserRole === "Trio") {
      option.style.display = "block";
    }

    else if (currentUserRole === "Inti") {
      if (
        value === "Umum" ||
        value === "Inti" ||
        value.startsWith("Sekbid")
      ) {
        option.style.display = "block";
      }
    }

    else if (currentUserRole.startsWith("Sekbid")) {
      if (value === "Umum" || value === currentUserRole) {
        option.style.display = "block";
      }
    }

  });

  // paksa value sesuai role kalau ilegal
  if (!canAccessCategory(taskCategory.value)) {
    taskCategory.value =
      currentUserRole.startsWith("Sekbid")
        ? currentUserRole
        : "Umum";
  }
}

// ================= FILTER & SORT =================
function filterByTab(tasks) {
  return tasks.filter(task => {
    const kategori = task.kategori ?? "Umum";

    return kategori === activeTab && canAccessCategory(kategori);
  });
}

function canAccessCategory(category) {

  if (!currentUserRole) return false;
  // ===== PEMBINA =====
  if (currentUserRole === "Pembina") {
  return true;
}

  // ===== TRIO =====
  if (currentUserRole === "Trio") {
    return true;
  }

  // ===== INTI =====
  if (currentUserRole === "Inti") {
    return (
      category === "Umum" ||
      category === "Inti" ||
      category.startsWith("Sekbid")
    );
  }

  // ===== SEKBI D =====
  if (currentUserRole.startsWith("Sekbid")) {
    return (
      category === "Umum" ||
      category === currentUserRole
    );
  }

  return false;
}

// ================= ROLE ACCESS =================
function applyRoleAccess() {

  tabs.forEach(tab => {
    const tabName = tab.dataset.tab;

    if (canAccessCategory(tabName)) {
      tab.style.display = "inline-block";
    } else {
      tab.style.display = "none";
    }
  });

  // paksa pindah ke umum kalau tab sekarang ilegal
  if (!canAccessCategory(activeTab)) {
    activeTab = "Umum";

    tabs.forEach(t => t.classList.remove("active"));
    document.querySelector('[data-tab="Umum"]').classList.add("active");
  }
}

function sortByDeadline(tasks) {
  return tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
}

function searchTasks(tasks) {
  if (!searchInput) return tasks;

  const keyword = searchInput.value.toLowerCase().trim();
  if (!keyword) return tasks;

  return tasks.filter(task =>
    task.name.toLowerCase().includes(keyword) ||
    task.author.toLowerCase().includes(keyword) ||
    (task.desc && task.desc.toLowerCase().includes(keyword))
  );
}

// ================= STATISTIK =================
function updateStats(tasks) {
  const today = new Date();
  today.setHours(0,0,0,0);

  let total = tasks.length;
  let pending = 0;
  let done = 0;
  let late = 0;

  tasks.forEach(task => {
    const deadline = new Date(task.deadline);
    deadline.setHours(0,0,0,0);

    if (task.status === "Selesai") {
      done++;
    } else {
      pending++;
      if (deadline < today) late++;
    }
  });

  totalCount.textContent = total;
  pendingCount.textContent = pending;
  doneCount.textContent = done;
  lateCount.textContent = late;
}

function cleanExpiredComments(task) {
  if (!task.comments) return task;

  const now = new Date();

  const validComments = task.comments.filter(comment => {

    let created;

    // kalau Timestamp Firestore
    if (comment.createdAt?.toDate) {
      created = comment.createdAt.toDate();
    } 
    // kalau sudah Date biasa
    else {
      created = new Date(comment.createdAt);
    }

    const diffHour = (now - created) / (1000 * 60 * 60);
    return diffHour <= 24;
  });

  return {
    ...task,
    comments: validComments
  };
}


// ================= RENDER =================
function renderTasks(tasks) {
  taskContainer.innerHTML = "";

  tasks.forEach(task => {
    const card = document.createElement("div");
    const urgency = getUrgency(task.deadline);
    const hminText = getHmin(task.deadline);

    card.className = `task-card ${urgency}`;

    // ================= COMMENT HTML =================
    let commentHTML = "";

    if (task.comments && task.comments.length > 0) {
      commentHTML = `
        <div class="comment-list">
          <strong>Komentar Pembina:</strong>
          ${task.comments.map((c, index) => {

            let created;
            if (c.createdAt?.toDate) {
              created = c.createdAt.toDate();
            } else {
              created = new Date(c.createdAt);
            }

            const diffHour = (new Date() - created) / (1000 * 60 * 60);
            const canDelete = diffHour <= 24 && currentUserRole === "Pembina";

            return `
              <div class="comment-item">
                💬 <strong>${c.sender || "Pembina"}:</strong> ${c.text}
                ${canDelete ? `<button class="delete-comment-btn" data-index="${index}">✖</button>` : ""}
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    // ================= MAIN CARD HTML =================
    card.innerHTML = `
      <div class="task-title">${task.name}</div>
      <div class="task-meta">👤 ${task.author}</div>
      <div class="task-meta">📂 ${task.kategori ?? "Umum"}</div>
      <div class="task-desc">${task.desc || ""}</div>
      <div class="task-meta">📅 ${task.deadline}</div>
      <div class="task-meta hmin-text">${hminText}</div>
      <div class="status">${task.status}</div>

      ${commentHTML}

      <div class="task-actions">
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Hapus tugas</button>
      </div>

      ${currentUserRole === "Pembina" ? `
        <div class="comment-section">
          <select class="comment-sender">
            <option value="">Pilih Pengirim</option>
            <option value="Bu Yusnita">Bu Yusnita</option>
            <option value="Pak Eko">Pak Eko</option>
          </select>

          <textarea class="comment-input" placeholder="Tulis komentar pembina..."></textarea>
          <button class="comment-btn">Kirim</button>
        </div>
      ` : ""}
    `;

    // ================= EDIT & DELETE TASK =================
const editBtn = card.querySelector(".edit-btn");
const deleteBtn = card.querySelector(".delete-btn");

const isUmum = (task.kategori ?? "Umum") === "Umum";
const isSekbid = currentUserRole && currentUserRole.startsWith("Sekbid");

// ================= EDIT =================
if (editBtn) {
  editBtn.onclick = () => {

    // 🔒 Blok Sekbid edit Umum
    if (isSekbid && isUmum) {
      showAlert("Sekbid tidak boleh edit task di tab Umum");
      return;
    }

    openModal(true, task);
  };
}

// ================= DELETE =================
if (deleteBtn) {
  deleteBtn.onclick = () => {

    // 🔒 Blok Sekbid hapus Umum
    if (isSekbid && isUmum) {
      showAlert("Sekbid tidak boleh hapus task di tab Umum");
      return;
    }

    deleteTask(task.id);
  };
}

    // ================= DELETE COMMENT LOGIC =================
    if (currentUserRole === "Pembina") {
      const deleteBtns = card.querySelectorAll(".delete-comment-btn");

      deleteBtns.forEach(btn => {
        btn.onclick = async () => {
          const index = parseInt(btn.dataset.index);
          const ref = doc(db, "tasks", task.id);

          let updatedComments = [...(task.comments || [])];
          updatedComments.splice(index, 1);

          await updateDoc(ref, {
            comments: updatedComments
          });

          showAlert("Komentar dihapus");
        };
      });
    }

    // ================= ADD COMMENT LOGIC =================
    if (currentUserRole === "Pembina") {
      const commentBtn = card.querySelector(".comment-btn");
      const commentInput = card.querySelector(".comment-input");
      const commentSender = card.querySelector(".comment-sender");

      if (commentBtn) {
        commentBtn.onclick = async () => {

          if (!commentSender.value) {
            showAlert("Pilih pengirim dulu");
            return;
          }

          if (!commentInput.value.trim()) {
            showAlert("Komentar tidak boleh kosong");
            return;
          }

          const ref = doc(db, "tasks", task.id);

          const newComment = {
            sender: commentSender.value,
            text: commentInput.value.trim(),
            createdAt: new Date()
          };

          const updatedComments = task.comments
            ? [...task.comments, newComment]
            : [newComment];

          await updateDoc(ref, {
            comments: updatedComments
          });

          commentInput.value = "";
          commentSender.value = "";
          showAlert("Komentar berhasil dikirim");
        };
      }
    }

    taskContainer.appendChild(card);
  });
}


// ================= AUTH STATE PROTECTION (FINAL FIX) =================
let unsubscribe = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {

    authContainer.style.display = "none";
    appContent.style.display = "block";

    try {
      // =====================
      // 1️⃣ Ambil role dulu
      // =====================
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        console.error("User role tidak ditemukan!");
        return;
      }

      currentUserRole = userDoc.data().role;
      console.log("Role user:", currentUserRole);

      applyRoleAccess();
      applyCategoryAccess();

      // =====================
      // 2️⃣ Baru pasang snapshot
      // =====================
      if (!unsubscribe) {
        unsubscribe = onSnapshot(taskCol, snapshot => {

          // Safety: jangan render kalau role belum ada
          if (!currentUserRole) return;

          allTasks = snapshot.docs.map(docSnap => {

            let taskData = {
              id: docSnap.id,
              ...docSnap.data()
            };

            const cleaned = cleanExpiredComments(taskData);

            const originalComments = taskData.comments || [];
            const cleanedComments = cleaned.comments || [];

            // 🔥 Update Firestore kalau ada komentar expired
            if (originalComments.length !== cleanedComments.length) {
              updateDoc(doc(db, "tasks", docSnap.id), {
                comments: cleanedComments
              });
            }

            return cleaned;
          });

          let filtered = filterByTab(allTasks);
          filtered = searchTasks(filtered);
          const sorted = sortByDeadline([...filtered]);

          renderTasks(sorted);
          updateStats(filtered);
        });
      }

    } catch (error) {
      console.error("Error saat load user:", error);
    }

  } else {

    // =====================
    // Logout state
    // =====================
    authContainer.style.display = "flex";
    appContent.style.display = "none";

    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    taskContainer.innerHTML = "";
    allTasks = [];
    currentUserRole = null;
  }
});

// ================= CRUD =================
async function addTask(task) {
  await addDoc(taskCol, task);
}

async function updateTask(id, task) {
  const ref = doc(db, "tasks", id);
  await updateDoc(ref, task);
}

async function deleteTask(id) {
  deleteTargetId = id;
  deleteAlert.classList.add("show");
}

// ================= DELETE ALERT =================
deleteCancelBtn.onclick = () => {
  deleteTargetId = null;
  deleteAlert.classList.remove("show");
};

deleteConfirmBtn.onclick = async () => {
  if (!deleteTargetId) return;

  // 🔍 Ambil data task dulu
  const taskRef = doc(db, "tasks", deleteTargetId);
  const taskSnap = await getDoc(taskRef);

  if (!taskSnap.exists()) {
    showAlert("Task tidak ditemukan");
    return;
  }

  const taskData = taskSnap.data();
  const kategori = taskData.kategori ?? "Umum";

  const isSekbid = currentUserRole && currentUserRole.startsWith("Sekbid");

  // 🔒 BLOCK SEKIBID HAPUS UMUM (FINAL SECURITY)
  if (isSekbid && kategori === "Umum") {
    showAlert("Sekbid tidak boleh hapus task di tab Umum");
    deleteTargetId = null;
    deleteAlert.classList.remove("show");
    return;
  }

  // ✅ Lolos validasi
  await deleteDoc(taskRef);

  deleteTargetId = null;
  deleteAlert.classList.remove("show");
};

// ================= CUSTOM ALERT FUNCTION =================
function showAlert(message) {
  const alertBox = document.getElementById("customAlert");

  if (!alertBox) {
    console.error("customAlert tidak ditemukan!");
    return;
  }

  // Reset dulu biar bisa trigger ulang
  alertBox.classList.remove("show");

  // Paksa reflow biar animasi bisa ulang
  void alertBox.offsetWidth;

  alertBox.textContent = message;
  alertBox.classList.add("show");

  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }

  setTimeout(() => {
    alertBox.classList.remove("show");
  }, 2000);
}

// ================= AUTH SYSTEM (TAMBAHAN) =================
// REGISTER
if (registerBtn) {
  registerBtn.onclick = async () => {
    if (!authUsername.value || !authPassword.value) {
      showAlert("Username & password wajib diisi");
      return;
    }

    if (authPassword.value.length < 6) {
      showAlert("Password minimal 6 karakter");
      return;
    }

    if (!authRole.value) {
      showAlert("Role wajib dipilih");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        makeEmail(authUsername.value),
        authPassword.value
      );
      // Simpan role ke Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
  username: authUsername.value.trim(),
  role: authRole.value
});
      showAlert("Akun berhasil dibuat!");
    } catch (err) {
      showAlert("Gagal daftar: " + err.message);
    }
  };
}

// LOGIN
if (loginBtn) {
  loginBtn.onclick = async () => {

    const username = authUsername.value.trim();
    const password = authPassword.value.trim();

    if (!username && !password) {
      showAlert("Username dan password wajib diisi");
      return;
    }

    if (!username) {
      showAlert("Username wajib diisi");
      return;
    }

    if (!password) {
      showAlert("Password wajib diisi");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        makeEmail(username),
        password
      );

      // Ambil role user dari Firestore
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
if (userDoc.exists()) {
  showAlert(`Login berhasil ✅, Role: ${userDoc.data().role}`);
} else {
  showAlert("Login berhasil ✅, tapi role tidak ditemukan");
}

    } catch (error) {

      if (error.code === "auth/user-not-found") {
        showAlert("Username tidak ditemukan");
      } 
      else if (error.code === "auth/wrong-password") {
        showAlert("Password salah");
      } 
      else if (error.code === "auth/invalid-credential") {
        showAlert("Username atau password salah");
      } 
      else {
        showAlert("Gagal login: " + error.message);
      }

    }
  };
}

if (logoutBtn) {
  logoutBtn.onclick = async () => {
    await signOut(auth);
  };
}

// ================= SAVE =================
saveBtn.onclick = async () => {
  if (!taskAuthor.value || !taskName.value || !taskDeadline.value) {
    if (!taskAuthor.value) {
      showAlert("Nama penulis wajib diisi!");
    } else if (!taskName.value) {
      showAlert("Nama tugas wajib diisi!");
    } else if (!taskDeadline.value) {
      showAlert("Deadline wajib diisi!");
    }
    return;
  }
  
  if (!canAccessCategory(taskCategory.value)) {
  showAlert("Kamu tidak punya akses ke kategori ini");
  return;
}

  const newTask = {
    author: taskAuthor.value,
    name: taskName.value,
    desc: taskDesc.value,
    deadline: taskDeadline.value,
    status: taskStatus.value,
    kategori: taskCategory.value || "Umum"
  };

  if (editId) {
    await updateTask(editId, newTask);
  } else {
    await addTask(newTask);
  }

  closeModal();
};

addBtn.onclick = () => openModal();
cancelBtn.onclick = () => closeModal();

// ================= TAB SYSTEM =================
tabs.forEach(tab => {
  tab.onclick = () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    activeTab = tab.dataset.tab;

    let filtered = filterByTab(allTasks);
    filtered = searchTasks(filtered);
    const sorted = sortByDeadline([...filtered]);

    renderTasks(sorted);
    updateStats(filtered);
  };
});

// ================= SEARCH REALTIME =================
if (searchInput) {
  searchInput.addEventListener("input", () => {
    let filtered = filterByTab(allTasks);
    filtered = searchTasks(filtered);
    const sorted = sortByDeadline([...filtered]);

    renderTasks(sorted);
    updateStats(filtered);
  });
}

// ================= DOWNLOAD PDF =================
downloadBtn.onclick = () => {
  if (allTasks.length === 0) {
    showAlert("Tidak ada data untuk di-download");
    return;
  }

  const allowedTasks = allTasks.filter(task =>
  canAccessCategory(task.kategori ?? "Umum")
);

const sorted = sortByDeadline([...allowedTasks]);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("OSIS SMPN 2 SUKARAJA", 14, 15);
  doc.text("Data To-Do-List Internal", 14, 22);
  doc.text("Dicetak: " + new Date().toLocaleDateString(), 14, 29);

  const tableData = sorted.map(task => [
    task.author,
    task.name,
    task.kategori ?? "Umum",
    task.desc || "-",
    task.deadline,
    getHminPDF(task.deadline),
    task.status
  ]);

  doc.autoTable({
    head: [["Penulis", "Tugas", "Kategori", "Deskripsi", "Deadline", "H-Min", "Status"]],
    body: tableData,
    startY: 40,
  });

  doc.save("OSIS-ToDo-List.pdf");
};

// ================= DARK MODE =================
function enableDarkMode() {
  document.body.classList.add("dark");
  localStorage.setItem("darkMode", "enabled");
  if (darkToggle) darkToggle.textContent = "☀️";
}

function disableDarkMode() {
  document.body.classList.remove("dark");
  localStorage.setItem("darkMode", "disabled");
  if (darkToggle) darkToggle.textContent = "🌙";
}

// Load preference saat pertama buka
if (localStorage.getItem("darkMode") === "enabled") {
  enableDarkMode();
} else {
  disableDarkMode();
}

// Toggle click
if (darkToggle) {
  darkToggle.addEventListener("click", () => {
    if (document.body.classList.contains("dark")) {
      disableDarkMode();
    } else {
      enableDarkMode();
    }
  });
}

// ================= PROFILE SCREEN AUTO SYSTEM =================


// ================= PROFILE SYSTEM =================

const profileBtn = document.getElementById("profileBtn");
const profileScreen = document.getElementById("profileScreen");
const backToDashboard = document.getElementById("backToDashboard");
const profileUsername = document.getElementById("profileUsername");
const profileRole = document.getElementById("profileRole");
const sekbidMembers = document.getElementById("sekbidMembers");

function showProfileScreen() {
  appContent.style.display = "none";
  profileScreen.style.display = "block";
}

function showDashboardScreen() {
  profileScreen.style.display = "none";
  appContent.style.display = "block";
}

async function loadProfileData() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) return;

    const userData = userDoc.data();

    profileUsername.textContent = userData.username || "-";
    profileRole.textContent = userData.role || "-";

    sekbidMembers.innerHTML = "";

    if (userData.role && userData.role.startsWith("Sekbid")) {

      const snapshot = await getDocs(userCol);

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.role === userData.role) {
          const li = document.createElement("li");
          li.textContent = data.username;
          sekbidMembers.appendChild(li);
        }
      });

    } else {
      const li = document.createElement("li");
      li.textContent = "Bukan anggota Sekbid";
      sekbidMembers.appendChild(li);
    }

  } catch (err) {
    console.error(err);
  }
}

if (profileBtn) {
  profileBtn.onclick = async () => {
    await loadProfileData();
    showProfileScreen();
  };
}

if (backToDashboard) {
  backToDashboard.onclick = () => {
    showDashboardScreen();
  };
}
async function setupFCM(userId) {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notif tidak diizinkan");
      return;
    }

    const token = await getToken(messaging, {
      vapidKey: "BDTpdmLrNwucETSmixmFVgyQax1jIWFeGT8B6tOfYe7apypvTaa3x1KnUXBVPMknJgYCMTa31GjwE4w6KsYJzX0"
    });

    if (!token) return;

    await updateDoc(doc(db, "users", userId), {
      fcmTokens: arrayUnion(token)
    });

    console.log("FCM token tersimpan:", token);

  } catch (err) {
    console.error("Error FCM:", err);
  }
  Notification.requestPermission().then(p => console.log("Permission:", p));
}
