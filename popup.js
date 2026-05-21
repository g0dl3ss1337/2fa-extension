const FULL_CIRCLE_LEN = 62.83; // 2 * π * r (r=10)
const PBKDF2_ITERATIONS = 310_000;
const BASE32_RE = /^[A-Z2-7]+=*$/;

let cryptoKey = null;
let accounts  = [];
let rafId     = null;

function buf2b64(buf) {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b642buf(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

async function exportKeyBytes(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return Array.from(new Uint8Array(raw));
}

async function importKeyBytes(bytes) {
  return crypto.subtle.importKey(
    'raw', new Uint8Array(bytes),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encrypt(key, plaintext) {
  const iv  = randomBytes(12);
  const enc = new TextEncoder();
  const ct  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  return { iv: buf2b64(iv), ct: buf2b64(ct) };
}

async function decrypt(key, iv, ct) {
  const dec = new TextDecoder();
  const pt  = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b642buf(iv) }, key, b642buf(ct),
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
    throw new Error('wrong_password');
  }
}

function sessionSetKey(key) {
  return new Promise(async (res) => {
    const bytes = await exportKeyBytes(key);
    chrome.runtime.sendMessage({ type: 'SET_KEY_BYTES', bytes }, res);
  });
}

function sessionGetKey() {
  return new Promise((res) => {
    chrome.runtime.sendMessage({ type: 'GET_KEY_BYTES' }, res);
  });
}

function sessionClearKey() {
  chrome.runtime.sendMessage({ type: 'CLEAR_KEY' });
}

function isValidBase32(secret) {
  const s = secret.toUpperCase().replace(/\s/g, '');
  return s.length > 0 && BASE32_RE.test(s);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function evalStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: 'Weak',   color: '#f38ba8' };
  if (score <= 2) return { score: 2, label: 'Fair',   color: '#fab387' };
  if (score <= 3) return { score: 3, label: 'Good',   color: '#f9e2af' };
  if (score <= 4) return { score: 4, label: 'Strong', color: '#a6e3a1' };
  return               { score: 5, label: 'Very Strong', color: '#89dceb' };
}

function initStrengthMeter() {
  const input = document.getElementById('setup-password');
  const bar   = document.getElementById('strength-bar');
  const label = document.getElementById('strength-label');
  if (!input) return;

  input.addEventListener('input', () => {
    const { score, label: lbl, color } = evalStrength(input.value);
    bar.style.width           = `${score * 20}%`;
    bar.style.backgroundColor = color;
    label.textContent         = lbl;
    label.style.color         = color;
  });
}

const THEME_KEY = 'theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'original' ? '' : theme);
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

function loadTheme() {
  chrome.storage.local.get({ [THEME_KEY]: 'original' }, (r) => applyTheme(r[THEME_KEY]));
}

function saveTheme(theme) {
  chrome.storage.local.set({ [THEME_KEY]: theme });
  applyTheme(theme);
}

async function initSetup() {
  showScreen('screen-setup');
  initStrengthMeter();

  const input1   = document.getElementById('setup-password');
  const input2   = document.getElementById('setup-password-confirm');
  const btn      = document.getElementById('setup-btn');
  const errSpan  = document.getElementById('setup-error');

  input1.addEventListener('keydown', (e) => { if (e.key === 'Enter') input2.focus(); });
  input2.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
  input1.focus();

  btn.addEventListener('click', async () => {
    const pw  = input1.value;
    const pw2 = input2.value;

    if (pw.length < 4) { showError(errSpan, 'Password must be at least 4 characters'); return; }
    if (pw !== pw2)    { showError(errSpan, 'Passwords do not match'); return; }

    btn.disabled    = true;
    btn.textContent = 'Creating…';

    const salt = randomBytes(16);
    cryptoKey  = await deriveKey(pw, salt);
    accounts   = [];

    await storageSet({ salt: buf2b64(salt), vault: null, initialized: true });
    await saveAccounts();
    await sessionSetKey(cryptoKey);

    initMain();
  });
}

async function initUnlock() {
  showScreen('screen-unlock');

  const input   = document.getElementById('unlock-password');
  const btn     = document.getElementById('unlock-btn');
  const errSpan = document.getElementById('unlock-error');

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
  input.focus();

  btn.addEventListener('click', async () => {
    const pw = input.value;
    if (!pw) return;

    btn.disabled    = true;
    btn.textContent = 'Checking…';
    errSpan.classList.add('hidden');

    try {
      const { salt } = await storageGet({ salt: null });
      const key      = await deriveKey(pw, b642buf(salt));
      accounts       = await loadAccounts(key);
      cryptoKey      = key;

      await sessionSetKey(cryptoKey);
      initMain();
    } catch {
      showError(errSpan, 'Invalid password');
      btn.disabled    = false;
      btn.textContent = 'Unlock';
      input.value     = '';
      input.focus();
    }
  });
}

function lockApp() {
  cryptoKey = null;
  accounts  = [];
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

  sessionClearKey();

  document.getElementById('add-form').classList.remove('visible');
  document.getElementById('toggle-add-btn').textContent = '+';

  closeSearch();
  closeSettings();

  initUnlock();
}

let searchQuery = '';

function openSearch() {
  const bar = document.getElementById('search-bar');
  bar.classList.remove('hidden');
  requestAnimationFrame(() => {
    bar.classList.add('visible');
    updateListHeight();
  });
  document.getElementById('search-btn').classList.add('active');
  setTimeout(() => document.getElementById('search-input').focus(), 50);
}

function closeSearch() {
  const bar = document.getElementById('search-bar');
  bar.classList.remove('visible');
  document.getElementById('search-btn').classList.remove('active');
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').classList.add('hidden');
  searchQuery = '';
  filterCards('');
  setTimeout(() => bar.classList.add('hidden'), 300);
  updateListHeight();
}

function filterCards(query) {
  searchQuery = query.toLowerCase().trim();
  document.querySelectorAll('.auth-card').forEach((card) => {
    const name = (card.dataset.name || '').toLowerCase();
    const match = !searchQuery || name.includes(searchQuery);
    card.classList.toggle('search-hidden', !match);
  });
  // "no results" state
  const list = document.getElementById('auth-list');
  const visible = [...list.querySelectorAll('.auth-card:not(.search-hidden)')];
  let noRes = list.querySelector('.no-results');
  if (searchQuery && visible.length === 0) {
    if (!noRes) {
      noRes = document.createElement('div');
      noRes.className = 'empty-state no-results';
      noRes.textContent = 'No results';
      list.appendChild(noRes);
    }
  } else if (noRes) {
    noRes.remove();
  }
}

function openSettings() {
  const panel = document.getElementById('settings-panel');
  panel.classList.remove('hidden');
  requestAnimationFrame(() => {
    panel.classList.add('visible');
    updateListHeight();
  });
  document.getElementById('settings-btn').classList.add('active');
}

function closeSettings() {
  const panel = document.getElementById('settings-panel');
  panel.classList.remove('visible');
  document.getElementById('settings-btn').classList.remove('active');
  updateListHeight();
}

async function exportVault() {
  const { salt } = await storageGet({ salt: null });
  const json = JSON.stringify(accounts, null, 2);
  const { iv, ct } = await encrypt(cryptoKey, json);
  const check = await encrypt(cryptoKey, 'OK');
  const payload = JSON.stringify({
    encrypted: true, iv, ct,
    salt,
    checkIv: check.iv, checkCt: check.ct,
    version: 2,
  });
  const blob = new Blob([payload], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `2fa-vault-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function mergeImported(imported) {
  if (!Array.isArray(imported)) throw new Error('Bad data');
  const existing = new Set(accounts.map((a) => a.secret));
  let added = 0;
  for (const acc of imported) {
    if (acc.name && acc.secret && !existing.has(acc.secret)) {
      accounts.push(acc);
      existing.add(acc.secret);
      added++;
    }
  }
  await saveAccounts();
  renderList();
  return added;
}

async function importVault(file) {
  const msg = document.getElementById('settings-msg');
  const showMsg = (text, ok = false) => {
    msg.style.color = ok ? 'var(--accent-color)' : 'var(--danger-color)';
    msg.textContent = text;
    msg.classList.remove('hidden');
    if (ok) setTimeout(() => msg.classList.add('hidden'), 3000);
  };

  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    showMsg('Import failed: invalid JSON');
    return;
  }

  if (Array.isArray(payload)) {
    try {
      const added = await mergeImported(payload);
      showMsg(`Imported ${added} account(s)`, true);
    } catch (e) { showMsg(`Import failed: ${e.message}`); }
    return;
  }

  if (!payload.encrypted || !payload.iv || !payload.ct) {
    showMsg('Import failed: unknown format');
    return;
  }

  // V2: file contains its own salt
  if (payload.version === 2 && payload.salt) {
    const fileSalt = payload.salt;
    const { salt: currentSalt } = await storageGet({ salt: null });

    // Same salt = same key, try directly
    if (fileSalt === currentSalt) {
      try {
        const json = await decrypt(cryptoKey, payload.iv, payload.ct);
        const added = await mergeImported(JSON.parse(json));
        showMsg(`Imported ${added} account(s)`, true);
      } catch {
        showMsg('Import failed: decryption error');
      }
      return;
    }

    // Different salt = different password -> ask user for the old password 
    showImportPasswordDialog(payload, showMsg);
    return;
  }

  // V1 (no salt in file): try current key/salt first
  try {
    const json = await decrypt(cryptoKey, payload.iv, payload.ct);
    const added = await mergeImported(JSON.parse(json));
    showMsg(`Imported ${added} account(s)`, true);
    return;
  } catch { /* wrong key, ask for password */ }

  showImportPasswordDialog(payload, showMsg);
}

function showImportPasswordDialog(payload, showMsg) {
  const old = document.getElementById('import-pw-dialog');
  if (old) old.remove();

  const dialog = document.createElement('div');
  dialog.id = 'import-pw-dialog';
  dialog.className = 'import-pw-dialog';
  dialog.innerHTML = `
    <p class="import-pw-label">This vault was encrypted with a different password.<br>Enter the original password to import:</p>
    <div class="import-pw-row">
      <input type="password" id="import-pw-input" placeholder="Original password" autocomplete="off">
      <button id="import-pw-btn">Unlock</button>
    </div>
    <span id="import-pw-err" class="form-error hidden"></span>
  `;

  const importBtn = document.getElementById('import-btn');
  importBtn.after(dialog);
  updateListHeight();
  document.getElementById('import-pw-input').focus();

  const doUnlock = async () => {
    const pw = document.getElementById('import-pw-input').value;
    if (!pw) return;
    const errEl = document.getElementById('import-pw-err');
    const btn   = document.getElementById('import-pw-btn');
    btn.disabled = true;
    btn.textContent = '…';
    errEl.classList.add('hidden');

    try {
      // Find key using the salt from the file (v2) or current salt (v1)
      const saltB64 = payload.salt || (await storageGet({ salt: null })).salt;
      const key = await deriveKey(pw, b642buf(saltB64));

      // If file has a verifier, check it first
      if (payload.checkIv && payload.checkCt) {
        const check = await decrypt(key, payload.checkIv, payload.checkCt);
        if (check !== 'OK') throw new Error('bad password');
      }

      const json  = await decrypt(key, payload.iv, payload.ct);
      const added = await mergeImported(JSON.parse(json));
      dialog.remove();
      updateListHeight();
      showMsg(`Imported ${added} account(s)`, true);
    } catch {
      errEl.textContent = 'Wrong password';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Unlock';
      document.getElementById('import-pw-input').value = '';
      document.getElementById('import-pw-input').focus();
    }
  };

  document.getElementById('import-pw-btn').addEventListener('click', doUnlock);
  document.getElementById('import-pw-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doUnlock();
  });
}


function updateListHeight() {
  const BASE = 390;
  let taken = 0;

  const settings = document.getElementById('settings-panel');
  if (settings && settings.classList.contains('visible')) {
    taken += settings.scrollHeight + 12;
  }

  const addForm = document.getElementById('add-form');
  if (addForm && addForm.classList.contains('visible')) {
    taken += addForm.scrollHeight + 12;
  }

  const searchBar = document.getElementById('search-bar');
  if (searchBar && searchBar.classList.contains('visible')) {
    taken += 44;
  }

  const val = Math.max(64, BASE - taken);
  document.getElementById('auth-list').style.maxHeight = val + 'px';
}

function initMain() {
  showScreen('screen-main');
  renderList();
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);

  document.getElementById('lock-btn').addEventListener('click', lockApp);

  const searchBtn   = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  searchBtn.addEventListener('click', () => {
    const bar = document.getElementById('search-bar');
    if (bar.classList.contains('visible')) closeSearch();
    else openSearch();
  });

  searchInput.addEventListener('input', () => {
    const q = searchInput.value;
    searchClear.classList.toggle('hidden', !q);
    filterCards(q);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.add('hidden');
    filterCards('');
    searchInput.focus();
  });

  const settingsBtn = document.getElementById('settings-btn');
  settingsBtn.addEventListener('click', () => {
    const panel = document.getElementById('settings-panel');
    if (panel.classList.contains('visible')) closeSettings();
    else openSettings();
  });

  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      saveTheme(btn.dataset.theme);
    });
  });

  document.getElementById('export-btn').addEventListener('click', exportVault);

  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', (e) => {
    if (e.target.files[0]) importVault(e.target.files[0]);
    e.target.value = '';
  });

  const toggleBtn  = document.getElementById('toggle-add-btn');
  const addForm    = document.getElementById('add-form');
  const saveBtn    = document.getElementById('save-btn');
  const nameInput  = document.getElementById('new-name');
  const secretInput = document.getElementById('new-secret');
  const secretErr  = document.getElementById('secret-error');
  const advToggle  = document.getElementById('advanced-toggle');
  const advFields  = document.getElementById('advanced-fields');

  toggleBtn.addEventListener('click', () => {
    const isOpen = addForm.classList.contains('visible');
    if (isOpen) {
      addForm.classList.remove('visible');
      toggleBtn.textContent = '+';
      updateListHeight();
    } else {
      addForm.classList.remove('hidden');
      requestAnimationFrame(() => {
        addForm.classList.add('visible');
        nameInput.focus();
        updateListHeight();
      });
      toggleBtn.textContent = '×';
    }
  });

  advToggle.addEventListener('click', () => {
    advFields.classList.toggle('hidden');
    advToggle.classList.toggle('open', !advFields.classList.contains('hidden'));
    setTimeout(updateListHeight, 320);
  });

  nameInput.addEventListener('keydown',   (e) => { if (e.key === 'Enter') secretInput.focus(); });
  secretInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveBtn.click(); });

  saveBtn.addEventListener('click', async () => {
    const name      = nameInput.value.trim();
    const secret    = secretInput.value.trim().toUpperCase().replace(/\s/g, '');
    const period    = parseInt(document.getElementById('new-period').value);
    const algorithm = document.getElementById('new-algorithm').value;
    const digits    = parseInt(document.getElementById('new-digits').value);

    if (!name || !secret) { showError(secretErr, 'Fill in all fields'); return; }
    if (!isValidBase32(secret)) { showError(secretErr, 'Invalid Base32 key'); return; }

    try {
      otplib.authenticator.generate(secret);
    } catch {
      showError(secretErr, 'Key is not working — please check the format');
      return;
    }

    accounts.push({ name, secret, period, algorithm, digits });
    await saveAccounts();

    nameInput.value   = '';
    secretInput.value = '';
    advFields.classList.add('hidden');
    advToggle.classList.remove('open');
    addForm.classList.remove('visible');
    toggleBtn.textContent = '+';
    renderList();
  });
}

function renderList() {
  const authList = document.getElementById('auth-list');
  authList.innerHTML = '';

  if (accounts.length === 0) {
    authList.innerHTML = '<div class="empty-state">No codes added yet</div>';
    return;
  }

  accounts.forEach((acc, index) => {
    const card = document.createElement('div');
    card.className     = 'auth-card';
    card.dataset.index = index;
    card.dataset.name  = acc.name;

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
          <circle cx="12" cy="12" r="10" fill="none" stroke="var(--border-color)" stroke-width="3"></circle>
          <circle class="timer-progress" id="circle-${index}" cx="12" cy="12" r="10"
                  fill="none" stroke="var(--accent-color)" stroke-width="3"
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

  if (searchQuery) filterCards(searchQuery);
}

function attachCardEvents() {
  document.querySelectorAll('.auth-info').forEach((zone) => {
    zone.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const idx      = zone.getAttribute('data-index');
      const codeSpan = document.getElementById(`code-${idx}`);
      if (codeSpan.dataset.copying === '1') return;

      const cleanCode = codeSpan.textContent.replace(/\s/g, '');
      if (!cleanCode || cleanCode === '------') return;

      navigator.clipboard.writeText(cleanCode);

      codeSpan.dataset.copying = '1';
      const prev = codeSpan.textContent;
      codeSpan.textContent = 'Copied!';
      codeSpan.style.color = 'var(--accent-color)';

      setTimeout(() => {
        codeSpan.style.color = '';
        codeSpan.textContent = prev;
        delete codeSpan.dataset.copying;
      }, 2000);
    });
  });

  // Dots menu
  document.querySelectorAll('.dots-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card   = btn.closest('.auth-card');
      const isOpen = card.classList.contains('show-actions');
      closeAllMenus();
      if (!isOpen) {
        card.classList.add('show-actions');
        btn.classList.add('active');
      }
    });
  });

  // Edit name
  document.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const idx           = parseInt(btn.getAttribute('data-index'));
      const nameContainer = document.getElementById(`name-container-${idx}`);
      if (nameContainer.querySelector('input')) return;

      const currentName = accounts[idx].name;
      const input       = document.createElement('input');
      input.type        = 'text';
      input.className   = 'edit-name-input';
      input.value       = currentName;

      nameContainer.innerHTML = '';
      nameContainer.appendChild(input);
      input.focus();
      input.select();

      const commit = async () => {
        const value = input.value.trim();
        if (value && value !== currentName) {
          accounts[idx].name          = value;
          const card = nameContainer.closest('.auth-card');
          if (card) card.dataset.name = value;
          await saveAccounts();
          renderList();
        } else {
          nameContainer.textContent = currentName;
        }
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')  { e.preventDefault(); commit(); }
        if (e.key === 'Escape') nameContainer.textContent = currentName;
      });
      input.addEventListener('blur', commit);
    });
  });

  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx     = parseInt(btn.getAttribute('data-index'));
      const confirm = document.getElementById(`delete-confirm-${idx}`);
      confirm.classList.remove('hidden');
    });
  });

  document.querySelectorAll('.confirm-yes').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'));
      accounts.splice(idx, 1);
      await saveAccounts();
      renderList();
    });
  });

  document.querySelectorAll('.confirm-no').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx     = parseInt(btn.getAttribute('data-index'));
      const confirm = document.getElementById(`delete-confirm-${idx}`);
      confirm.classList.add('hidden');
    });
  });
}

function closeAllMenus() {
  document.querySelectorAll('.auth-card').forEach((c) => c.classList.remove('show-actions'));
  document.querySelectorAll('.dots-btn').forEach((b)  => b.classList.remove('active'));
}

document.addEventListener('click', closeAllMenus);

let lastSec     = -1;
let lastCode    = {};
let _intervalId = null;

function tick() {
  if (!accounts.length) {
    rafId = requestAnimationFrame(tick);
    return;
  }

  const now     = Date.now();
  const ms      = now % 1000;
  const sec     = Math.floor(now / 1000) % 60;
  const period  = Math.floor(now / 1000) % 30;
  const passed  = period + ms / 1000;
  const remaining = 30 - passed;

  const offset = (passed / 30) * FULL_CIRCLE_LEN;
  const color  = remaining < 6 ? 'var(--danger-color)' : 'var(--accent-color)';

  const needCodeUpdate = sec !== lastSec;
  if (needCodeUpdate) lastSec = sec;

  accounts.forEach((acc, index) => {
    const circle = document.getElementById(`circle-${index}`);
    if (circle) {
      circle.setAttribute('stroke-dashoffset', offset.toFixed(2));
      circle.setAttribute('stroke', color);
    }

    if (needCodeUpdate) {
      const codeSpan = document.getElementById(`code-${index}`);
      if (codeSpan && !codeSpan.dataset.copying) {
        try {
          const opts = {
            digits:    acc.digits    || 6,
            period:    acc.period    || 30,
            algorithm: acc.algorithm || 'SHA1',
          };
          otplib.authenticator.options = opts;
          const code = otplib.authenticator.generate(acc.secret);
          const fmt  = code.length === 6
            ? code.slice(0, 3) + ' ' + code.slice(3)
            : code.slice(0, 4) + ' ' + code.slice(4);
          if (codeSpan.textContent !== fmt) codeSpan.textContent = fmt;
          lastCode[index] = fmt;
        } catch {
          codeSpan.textContent = 'Error';
        }
      }
    }
  });

  otplib.authenticator.options = { digits: 6, period: 30, algorithm: 'SHA1' };

  rafId = requestAnimationFrame(tick);
}

(async () => {
  loadTheme();

  const { initialized } = await storageGet({ initialized: false });

  if (!initialized) {
    initSetup();
    return;
  }

  let sessionResponse;
  try {
    sessionResponse = await sessionGetKey();
  } catch (e) {
    console.warn('Background not ready:', e);
    initUnlock();
    return;
  }

  if (sessionResponse && sessionResponse.bytes) {
    try {
      cryptoKey = await importKeyBytes(sessionResponse.bytes);
      accounts  = await loadAccounts(cryptoKey);
      initMain();
      return;
    } catch (e) {
      console.error('Auto-decrypt failed:', e);
    }
  }

  initUnlock();
})();
