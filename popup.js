import { state } from './modules/state.js';
import { deriveKey, importKeyBytes, randomBytes, buf2b64, b642buf } from './modules/crypto.js';
import { storageGet, storageSet, saveAccounts, loadAccounts } from './modules/storage.js';
import { sessionSetKey, sessionGetKey, sessionClearKey } from './modules/session.js';
import { showScreen, showError, evalStrength, updateListHeight } from './modules/ui.js';
import { loadTheme } from './modules/theme.js';
import { tick } from './modules/otp.js';
import { renderList, filterCards, closeAllMenus, initDragAndDrop } from './modules/accounts.js';
import { openSettings, closeSettings, initSettingsPanel } from './modules/settings.js';

document.addEventListener('click', closeAllMenus);

async function initSetup() {
  showScreen('screen-setup');

  const input1  = document.getElementById('setup-password');
  const input2  = document.getElementById('setup-password-confirm');
  const btn     = document.getElementById('setup-btn');
  const errSpan = document.getElementById('setup-error');
  const bar     = document.getElementById('strength-bar');
  const label   = document.getElementById('strength-label');

  input1.addEventListener('input', () => {
    const { score, label: lbl, color } = evalStrength(input1.value);
    bar.style.width           = `${score * 20}%`;
    bar.style.backgroundColor = color;
    label.textContent         = lbl;
    label.style.color         = color;
  });

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

    const salt      = randomBytes(16);
    state.cryptoKey = await deriveKey(pw, salt);
    state.accounts  = [];

    await storageSet({ salt: buf2b64(salt), vault: null, initialized: true });
    await saveAccounts();
    await sessionSetKey(state.cryptoKey);

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
      const { salt }  = await storageGet({ salt: null });
      const key       = await deriveKey(pw, b642buf(salt));
      state.accounts  = await loadAccounts(key);
      state.cryptoKey = key;

      await sessionSetKey(state.cryptoKey);
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
  state.cryptoKey = null;
  state.accounts  = [];
  if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }

  sessionClearKey();

  document.getElementById('add-form').classList.remove('visible');
  document.getElementById('toggle-add-btn').textContent = '+';

  closeSearch();
  closeSettings();

  initUnlock();
}

let searchOpen = false;

function openSearch() {
  const bar = document.getElementById('search-bar');
  bar.classList.remove('hidden');
  requestAnimationFrame(() => {
    bar.classList.add('visible');
    updateListHeight();
  });
  document.getElementById('search-btn').classList.add('active');
  setTimeout(() => document.getElementById('search-input').focus(), 50);
  searchOpen = true;
}

function closeSearch() {
  const bar = document.getElementById('search-bar');
  bar.classList.remove('visible');
  document.getElementById('search-btn').classList.remove('active');
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').classList.add('hidden');
  filterCards('');
  setTimeout(() => bar.classList.add('hidden'), 300);
  updateListHeight();
  searchOpen = false;
}

function initMain() {
  showScreen('screen-main');
  renderList();
  if (state.rafId) cancelAnimationFrame(state.rafId);
  state.rafId = requestAnimationFrame(tick);
  initDragAndDrop();
  initSettingsPanel();

  document.getElementById('lock-btn').addEventListener('click', lockApp);

  const searchBtn   = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  searchBtn.addEventListener('click', () => {
    if (searchOpen) closeSearch();
    else            openSearch();
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

  document.getElementById('settings-btn').addEventListener('click', () => {
    const panel = document.getElementById('settings-panel');
    if (panel.classList.contains('visible')) closeSettings();
    else                                     openSettings();
  });

  const toggleBtn   = document.getElementById('toggle-add-btn');
  const addForm     = document.getElementById('add-form');
  const saveBtn     = document.getElementById('save-btn');
  const nameInput   = document.getElementById('new-name');
  const secretInput = document.getElementById('new-secret');
  const secretErr   = document.getElementById('secret-error');
  const advToggle   = document.getElementById('advanced-toggle');
  const advFields   = document.getElementById('advanced-fields');

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

    const s = secret.toUpperCase().replace(/\s/g, '');
    if (!s.length || !/^[A-Z2-7]+=*$/.test(s)) {
      showError(secretErr, 'Invalid Base32 key');
      return;
    }

    try {
      otplib.authenticator.generate(secret);
    } catch {
      showError(secretErr, 'Key is not working — please check the format');
      return;
    }

    state.accounts.push({ name, secret, period, algorithm, digits });
    await saveAccounts();

    nameInput.value   = '';
    secretInput.value = '';
    advFields.classList.add('hidden');
    advToggle.classList.remove('open');
    addForm.classList.remove('visible');
    toggleBtn.textContent = '+';
    renderList();
    setTimeout(updateListHeight, 320);
  });
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
      state.cryptoKey = await importKeyBytes(sessionResponse.bytes);
      state.accounts  = await loadAccounts(state.cryptoKey);
      initMain();
      return;
    } catch (e) {
      console.error('Auto-decrypt failed:', e);
    }
  }

  initUnlock();
})();
