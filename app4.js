// 🔥 IMPORT FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot
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
const db = getFirestore(app);
const taskCol = collection(db, "tasks");
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

function makeEmail(username) {
  return username.trim().toLowerCase() + "@osis.local";
}

let editId = null;
let allTasks = [];
let activeTab = "Umum";

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

// ================= FILTER & SORT =================
function filterByTab(tasks) {
  return tasks.filter(task => {
    const kategori = task.kategori ?? "Umum";
    return kategori === activeTab;
  });
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

// ================= RENDER =================
function renderTasks(tasks) {
  taskContainer.innerHTML = "";

  tasks.forEach(task => {
    const card = document.createElement("div");
    const urgency = getUrgency(task.deadline);
    const hminText = getHmin(task.deadline);

    card.className = `task-card ${urgency}`;

    card.innerHTML = `
      <div class="task-title">${task.name}</div>
      <div class="task-meta">👤 ${task.author}</div>
      <div class="task-meta">📂 ${task.kategori ?? "Umum"}</div>
      <div class="task-desc">${task.desc || ""}</div>
      <div class="task-meta">📅 ${task.deadline}</div>
      <div class="task-meta hmin-text">${hminText}</div>
      <div class="status">${task.status}</div>
      <div class="task-actions">
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </div>
    `;

    card.querySelector(".edit-btn").onclick = () => openModal(true, task);
    card.querySelector(".delete-btn").onclick = () => deleteTask(task.id);

    taskContainer.appendChild(card);
  });
}
// ================= AUTH STATE PROTECTION (FIX) =================
let unsubscribe = null;
onAuthStateChanged(auth, (user) => {
  if (user) {
    authContainer.style.display = "none";
    appContent.style.display = "block";

    // 🔥 Pasang realtime listener setelah login
    if (!unsubscribe) {
      unsubscribe = onSnapshot(taskCol, snapshot => {
        allTasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        let filtered = filterByTab(allTasks);
        filtered = searchTasks(filtered);
        const sorted = sortByDeadline([...filtered]);

        renderTasks(sorted);
        updateStats(filtered);
      });
    }

  } else {
    authContainer.style.display = "flex";
    appContent.style.display = "none";

    // 🔥 Matikan listener saat logout
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    taskContainer.innerHTML = "";
    allTasks = [];
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
  const ref = doc(db, "tasks", deleteTargetId);
  await deleteDoc(ref);
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

    try {
      await createUserWithEmailAndPassword(
        auth,
        makeEmail(authUsername.value),
        authPassword.value
      );
      showAlert("Akun berhasil dibuat!");
    } catch (err) {
      showAlert("Gagal daftar: " + err.message);
    }
  };
}

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
      await signInWithEmailAndPassword(
        auth,
        makeEmail(username),
        password
      );

      showAlert("Login berhasil ✅");

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

  const sorted = sortByDeadline([...allTasks]);

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
