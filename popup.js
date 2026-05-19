const FULL_CIRCLE_LEN = 62.83; // 2 * π * r (r=10)
const PBKDF2_ITERATIONS = 310_000;
const BASE32_RE = /^[A-Z2-7]+=*$/;

let cryptoKey = null;
let accounts = [];
let rafId = null;

function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

function buf2b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b642buf(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encrypt(key, plaintext) {
  const iv = randomBytes(12);
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext),
  );
  return { iv: buf2b64(iv), ct: buf2b64(ct) };
}

async function decrypt(key, iv, ct) {
  const dec = new TextDecoder();
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b642buf(iv) },
    key,
    b642buf(ct),
  );
  return dec.decode(pt);
}

function storageGet(keys) {
  return new Promise((res) => chrome.storage.local.get(keys, res));
}

function storageSet(obj) {
  return new Promise((res) => chrome.storage.local.set(obj, res));
}

async function saveAccounts() {
  const json = JSON.stringify(accounts);
  const { iv, ct } = await encrypt(cryptoKey, json);
  await storageSet({ vault: { iv, ct } });
}

async function loadAccounts(key) {
  const { vault } = await storageGet({ vault: null });
  if (!vault) return [];
  try {
    const json = await decrypt(key, vault.iv, vault.ct);
    return JSON.parse(json);
  } catch {
    throw new Error("wrong_password");
  }
}

function isValidBase32(secret) {
  const s = secret.toUpperCase().replace(/\s/g, "");
  return s.length > 0 && BASE32_RE.test(s);
}

function showScreen(id) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

async function initSetup() {
  showScreen("screen-setup");

  const input1 = document.getElementById("setup-password");
  const input2 = document.getElementById("setup-password-confirm");
  const btn = document.getElementById("setup-btn");
  const errSpan = document.getElementById("setup-error");

  input1.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input2.focus();
  });
  input2.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btn.click();
  });
  input1.focus();

  btn.addEventListener("click", async () => {
    const pw = input1.value;
    const pw2 = input2.value;

    if (pw.length < 4) {
      showError(errSpan, "Password must be at least 4 characters");
      return;
    }
    if (pw !== pw2) {
      showError(errSpan, "Passwords do not match");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Creating...";

    const salt = randomBytes(16);
    cryptoKey = await deriveKey(pw, salt);
    accounts = [];

    await storageSet({ salt: buf2b64(salt), vault: null, initialized: true });
    await saveAccounts();

    chrome.runtime.sendMessage({ type: "SET_KEY", key: pw });

    initMain();
  });
}

async function initUnlock() {
  showScreen("screen-unlock");

  const input = document.getElementById("unlock-password");
  const btn = document.getElementById("unlock-btn");
  const errSpan = document.getElementById("unlock-error");

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btn.click();
  });
  input.focus();

  btn.addEventListener("click", async () => {
    const pw = input.value;
    if (!pw) return;

    btn.disabled = true;
    btn.textContent = "Checking...";
    errSpan.classList.add("hidden");

    try {
      const { salt } = await storageGet({ salt: null });
      const key = await deriveKey(pw, b642buf(salt));
      accounts = await loadAccounts(key);
      cryptoKey = key;

      chrome.runtime.sendMessage({ type: "SET_KEY", key: pw }, () => {
        initMain();
      });
    } catch (e) {
      showError(errSpan, "Invalid password");
      btn.disabled = false;
      btn.textContent = "Unlock";
      input.value = "";
      input.focus();
    }
  });
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3000);
}

function initMain() {
  showScreen("screen-main");
  renderList();
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);

  document.getElementById("lock-btn").addEventListener("click", lockApp);

  const toggleBtn = document.getElementById("toggle-add-btn");
  const addForm = document.getElementById("add-form");
  const saveBtn = document.getElementById("save-btn");
  const nameInput = document.getElementById("new-name");
  const secretInput = document.getElementById("new-secret");
  const secretErr = document.getElementById("secret-error");

  toggleBtn.addEventListener("click", () => {
    addForm.classList.toggle("hidden");
    toggleBtn.textContent = addForm.classList.contains("hidden") ? "+" : "×";
    if (!addForm.classList.contains("hidden")) nameInput.focus();
  });

  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") secretInput.focus();
  });
  secretInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveBtn.click();
  });

  saveBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const secret = secretInput.value.trim().toUpperCase().replace(/\s/g, "");

    if (!name || !secret) {
      showError(secretErr, "Fill in all fields");
      return;
    }
    if (!isValidBase32(secret)) {
      showError(secretErr, "Invalid Base32 key");
      return;
    }

    try {
      otplib.authenticator.generate(secret);
    } catch {
      showError(secretErr, "Key is not working — please check the format");
      return;
    }

    accounts.push({ name, secret });
    await saveAccounts();

    nameInput.value = "";
    secretInput.value = "";
    addForm.classList.add("hidden");
    toggleBtn.textContent = "+";
    renderList();
  });
}

function lockApp() {
  cryptoKey = null;
  accounts = [];
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  chrome.runtime.sendMessage({ type: "CLEAR_KEY" });

  document.getElementById("add-form").classList.add("hidden");
  document.getElementById("toggle-add-btn").textContent = "+";

  initUnlock();
}

function renderList() {
  const authList = document.getElementById("auth-list");
  authList.innerHTML = "";

  if (accounts.length === 0) {
    authList.innerHTML = '<div class="empty-state">No codes added</div>';
    return;
  }

  accounts.forEach((acc, index) => {
    const card = document.createElement("div");
    card.className = "auth-card";
    card.dataset.index = index;
    card.innerHTML = `
            <div class="auth-info" data-index="${index}" title="Click to copy">
                <span class="auth-name" id="name-container-${index}">${escapeHtml(acc.name)}</span>
                <span class="auth-code" id="code-${index}">--- ---</span>
            </div>
            <div class="auth-actions">
                <div class="action-icons-container">
                    <button class="icon-btn delete-btn" data-index="${index}" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                    <button class="icon-btn edit-btn" data-index="${index}" title="Rename">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                </div>

                <svg class="timer-svg">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="#313244" stroke-width="3"></circle>
                    <circle class="timer-progress" id="circle-${index}" cx="12" cy="12" r="10"
                            fill="none" stroke="#a6e3a1" stroke-width="3"
                            stroke-dasharray="${FULL_CIRCLE_LEN}" stroke-dashoffset="0"></circle>
                </svg>

                <button class="dots-btn" id="dots-${index}" data-index="${index}">⋮</button>
            </div>

            <div class="delete-confirm hidden" id="delete-confirm-${index}">
                <span>Delete «${escapeHtml(acc.name)}»?</span>
                <div class="delete-confirm-btns">
                    <button class="confirm-yes" data-index="${index}">Yes</button>
                    <button class="confirm-no"  data-index="${index}">No</button>
                </div>
            </div>
        `;
    authList.appendChild(card);
  });

  attachCardEvents();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function attachCardEvents() {
  document.querySelectorAll(".auth-info").forEach((zone) => {
    zone.addEventListener("click", (e) => {
      if (e.target.tagName === "INPUT") return;
      const idx = zone.getAttribute("data-index");
      const codeSpan = document.getElementById(`code-${idx}`);
      if (codeSpan.dataset.copying === "1") return;

      const cleanCode = codeSpan.textContent.replace(/\s/g, "");
      if (!cleanCode || cleanCode === "------") return;

      navigator.clipboard.writeText(cleanCode);

      codeSpan.dataset.copying = "1";
      const prev = codeSpan.textContent;
      codeSpan.textContent = "Copied!";
      codeSpan.style.color = "#a6e3a1";

      setTimeout(() => {
        codeSpan.style.color = "";
        codeSpan.textContent = prev;
        delete codeSpan.dataset.copying;
      }, 2000);
    });
  });

  document.querySelectorAll(".dots-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = btn.closest(".auth-card");
      const isOpen = card.classList.contains("show-actions");

      closeAllMenus();
      if (!isOpen) {
        card.classList.add("show-actions");
        btn.classList.add("active");
      }
    });
  });

  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute("data-index"));
      const nameContainer = document.getElementById(`name-container-${idx}`);
      if (nameContainer.querySelector("input")) return;

      const currentName = accounts[idx].name;
      const input = document.createElement("input");
      input.type = "text";
      input.className = "edit-name-input";
      input.value = currentName;

      nameContainer.innerHTML = "";
      nameContainer.appendChild(input);
      input.focus();
      input.select();

      const commit = async () => {
        const value = input.value.trim();
        if (value && value !== currentName) {
          accounts[idx].name = value;
          await saveAccounts();
          renderList();
        } else {
          nameContainer.textContent = currentName;
        }
      };

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
        if (e.key === "Escape") nameContainer.textContent = currentName;
      });
      input.addEventListener("blur", commit);
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute("data-index"));
      const confirm = document.getElementById(`delete-confirm-${idx}`);
      confirm.classList.remove("hidden");
      btn.closest(".auth-card").classList.add("show-confirm");
    });
  });

  document.querySelectorAll(".confirm-yes").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute("data-index"));
      accounts.splice(idx, 1);
      await saveAccounts();
      renderList();
    });
  });

  document.querySelectorAll(".confirm-no").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute("data-index"));
      const confirm = document.getElementById(`delete-confirm-${idx}`);
      confirm.classList.add("hidden");
      btn.closest(".auth-card").classList.remove("show-confirm");
    });
  });
}

function closeAllMenus() {
  document
    .querySelectorAll(".auth-card")
    .forEach((c) => c.classList.remove("show-actions"));
  document
    .querySelectorAll(".dots-btn")
    .forEach((b) => b.classList.remove("active"));
}

document.addEventListener("click", closeAllMenus);

let lastCode = {};
let lastSec = -1;

function tick() {
  if (!accounts.length) {
    rafId = requestAnimationFrame(tick);
    return;
  }

  const now = Date.now();
  const ms = now % 1000;
  const sec = Math.floor(now / 1000) % 60;
  const period = Math.floor(now / 1000) % 30;
  const passed = period + ms / 1000;
  const remaining = 30 - passed;

  const offset = (passed / 30) * FULL_CIRCLE_LEN;
  const color = remaining < 6 ? "#f38ba8" : "#a6e3a1";

  const needCodeUpdate = sec !== lastSec;
  if (needCodeUpdate) lastSec = sec;

  accounts.forEach((acc, index) => {
    const circle = document.getElementById(`circle-${index}`);
    if (circle) {
      circle.setAttribute("stroke-dashoffset", offset.toFixed(2));
      circle.setAttribute("stroke", color);
    }

    if (needCodeUpdate) {
      const codeSpan = document.getElementById(`code-${index}`);
      if (codeSpan && !codeSpan.dataset.copying) {
        try {
          const code = otplib.authenticator.generate(acc.secret);
          const fmt = code.slice(0, 3) + " " + code.slice(3);
          if (codeSpan.textContent !== fmt) codeSpan.textContent = fmt;
          lastCode[index] = fmt;
        } catch {
          codeSpan.textContent = "Error";
        }
      }
    }
  });

  rafId = requestAnimationFrame(tick);
}

(async () => {
  const { initialized } = await storageGet({ initialized: false });

  if (!initialized) {
    initSetup();
  } else {
    chrome.runtime.sendMessage({ type: "GET_KEY" }, async (response) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "Background script still hasn't woken up or has thrown an error:",
          chrome.runtime.lastError.message,
        );
        initUnlock();
        return;
      }

      if (response && response.key) {
        try {
          const { salt } = await storageGet({ salt: null });
          cryptoKey = await deriveKey(response.key, b642buf(salt));
          accounts = await loadAccounts(cryptoKey);

          initMain();
        } catch (e) {
          console.error("Error during auto-decryption:", e);
          initUnlock();
        }
      } else {
        initUnlock();
      }
    });
  }
})();
