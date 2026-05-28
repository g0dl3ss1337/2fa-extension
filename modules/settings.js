import { state } from './state.js';
import { encrypt, decrypt, deriveKey, randomBytes, b642buf, buf2b64 } from './crypto.js';
import { storageGet, storageSet, saveAccounts, loadAccounts } from './storage.js';
import { sessionSetKey } from './session.js';
import { showError, evalStrength, updateListHeight } from './ui.js';
import { saveTheme } from './theme.js';
import { renderList } from './accounts.js';

export function openSettings() {
  const panel = document.getElementById('settings-panel');
  panel.classList.remove('hidden');
  requestAnimationFrame(() => {
    panel.classList.add('visible');
    document.getElementById('auth-list').classList.add('list-hidden');
  });
  document.getElementById('settings-btn').classList.add('active');
}

export function closeSettings() {
  const panel = document.getElementById('settings-panel');
  panel.classList.remove('visible');
  document.getElementById('settings-btn').classList.remove('active');
  document.getElementById('auth-list').classList.remove('list-hidden');
  closeCpwDialog();
}

export function showChangePwDialog() {
  const dialog = document.getElementById('change-pw-dialog');
  const isOpen = dialog.classList.contains('cpw-open');

  if (isOpen) {
    closeCpwDialog();
  } else {
    dialog.querySelector('#cpw-current').value    = '';
    dialog.querySelector('#cpw-new').value        = '';
    dialog.querySelector('#cpw-confirm').value    = '';
    dialog.querySelector('#cpw-bar').style.width  = '0%';
    dialog.querySelector('#cpw-label').textContent = '';
    dialog.querySelector('#cpw-err').classList.add('hidden');
    const saveBtn       = dialog.querySelector('#cpw-save-btn');
    saveBtn.disabled    = false;
    saveBtn.textContent = 'Change Password';

    requestAnimationFrame(() => {
      dialog.classList.add('cpw-open');
      updateListHeight();
      setTimeout(() => dialog.querySelector('#cpw-current').focus(), 50);
    });
  }
}

export function closeCpwDialog() {
  const dialog = document.getElementById('change-pw-dialog');
  if (!dialog) return;
  dialog.classList.remove('cpw-open');
  updateListHeight();
}

export function initChangePwDialog() {
  const cpwDialog = document.createElement('div');
  cpwDialog.id        = 'change-pw-dialog';
  cpwDialog.className = 'add-form';
  cpwDialog.innerHTML = `
    <input type="password" id="cpw-current"  placeholder="Current password"     autocomplete="current-password">
    <input type="password" id="cpw-new"      placeholder="New password"         autocomplete="new-password">
    <div class="strength-bar-wrap"><div class="strength-bar" id="cpw-bar"></div></div>
    <span class="strength-label" id="cpw-label"></span>
    <input type="password" id="cpw-confirm"  placeholder="Confirm new password" autocomplete="new-password">
    <span id="cpw-err" class="form-error hidden"></span>
    <button id="cpw-save-btn" class="cpw-save-btn">Change Password</button>
  `;
  document.getElementById('change-pw-btn').after(cpwDialog);

  cpwDialog.querySelector('#cpw-new').addEventListener('input', (e) => {
    const { score, label: lbl, color } = evalStrength(e.target.value);
    const bar   = cpwDialog.querySelector('#cpw-bar');
    const label = cpwDialog.querySelector('#cpw-label');
    bar.style.width           = `${score * 20}%`;
    bar.style.backgroundColor = color;
    label.textContent         = lbl;
    label.style.color         = color;
  });

  const doChange = async () => {
    const currentPw = cpwDialog.querySelector('#cpw-current').value;
    const newPw     = cpwDialog.querySelector('#cpw-new').value;
    const confirmPw = cpwDialog.querySelector('#cpw-confirm').value;
    const errEl     = cpwDialog.querySelector('#cpw-err');
    const cpwBtn    = cpwDialog.querySelector('#cpw-save-btn');

    if (!currentPw || !newPw || !confirmPw) { showError(errEl, 'Fill in all fields'); return; }
    if (newPw.length < 4) { showError(errEl, 'New password must be at least 4 characters'); return; }
    if (newPw !== confirmPw) { showError(errEl, 'New passwords do not match'); return; }

    cpwBtn.disabled    = true;
    cpwBtn.textContent = 'Changing…';
    errEl.classList.add('hidden');

    try {
      const { salt } = await storageGet({ salt: null });
      const testKey  = await deriveKey(currentPw, b642buf(salt));
      await loadAccounts(testKey);

      const newSalt     = randomBytes(16);
      state.cryptoKey   = await deriveKey(newPw, newSalt);

      await storageSet({ salt: buf2b64(newSalt) });
      await saveAccounts();
      await sessionSetKey(state.cryptoKey);

      closeCpwDialog();

      const msg = document.getElementById('settings-msg');
      msg.style.color = 'var(--accent-color)';
      msg.textContent = 'Password changed successfully';
      msg.classList.remove('hidden');
      setTimeout(() => msg.classList.add('hidden'), 3000);
    } catch {
      showError(errEl, 'Current password is incorrect');
      cpwBtn.disabled    = false;
      cpwBtn.textContent = 'Change Password';
      cpwDialog.querySelector('#cpw-current').value = '';
      cpwDialog.querySelector('#cpw-current').focus();
    }
  };

  cpwDialog.querySelector('#cpw-save-btn').addEventListener('click', doChange);
  cpwDialog.querySelectorAll('input').forEach((inp) => {
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') doChange(); });
  });
}

export async function exportVault() {
  const { salt } = await storageGet({ salt: null });
  const json     = JSON.stringify(state.accounts, null, 2);
  const { iv, ct }  = await encrypt(state.cryptoKey, json);
  const check       = await encrypt(state.cryptoKey, 'OK');
  const payload     = JSON.stringify({
    encrypted: true, iv, ct,
    salt,
    checkIv: check.iv, checkCt: check.ct,
    version: 2,
  });
  const blob = new Blob([payload], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `2fa-vault-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function mergeImported(imported) {
  if (!Array.isArray(imported)) throw new Error('Bad data');
  const existing = new Set(state.accounts.map((a) => a.secret));
  let added = 0;
  for (const acc of imported) {
    if (acc.name && acc.secret && !existing.has(acc.secret)) {
      state.accounts.push(acc);
      existing.add(acc.secret);
      added++;
    }
  }
  await saveAccounts();
  renderList();
  return added;
}

export async function importVault(file) {
  const msg     = document.getElementById('settings-msg');
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

  if (payload.version === 2 && payload.salt) {
    const { salt: currentSalt } = await storageGet({ salt: null });
    if (payload.salt === currentSalt) {
      try {
        const json  = await decrypt(state.cryptoKey, payload.iv, payload.ct);
        const added = await mergeImported(JSON.parse(json));
        showMsg(`Imported ${added} account(s)`, true);
      } catch {
        showMsg('Import failed: decryption error');
      }
      return;
    }
    showImportPasswordDialog(payload, showMsg);
    return;
  }

  try {
    const json  = await decrypt(state.cryptoKey, payload.iv, payload.ct);
    const added = await mergeImported(JSON.parse(json));
    showMsg(`Imported ${added} account(s)`, true);
    return;
  } catch { /* wrong key */ }

  showImportPasswordDialog(payload, showMsg);
}

function showImportPasswordDialog(payload, showMsg) {
  const old = document.getElementById('import-pw-dialog');
  if (old) old.remove();

  const dialog      = document.createElement('div');
  dialog.id         = 'import-pw-dialog';
  dialog.className  = 'import-pw-dialog';
  dialog.innerHTML  = `
    <p class="import-pw-label">This vault was encrypted with a different password.<br>Enter the original password to import:</p>
    <div class="import-pw-row">
      <input type="password" id="import-pw-input" placeholder="Original password" autocomplete="off">
      <button id="import-pw-btn">Unlock</button>
    </div>
    <span id="import-pw-err" class="form-error hidden"></span>
  `;

  document.getElementById('import-btn').after(dialog);
  updateListHeight();
  document.getElementById('import-pw-input').focus();

  const doUnlock = async () => {
    const pw    = document.getElementById('import-pw-input').value;
    if (!pw) return;
    const errEl = document.getElementById('import-pw-err');
    const btn   = document.getElementById('import-pw-btn');
    btn.disabled    = true;
    btn.textContent = '…';
    errEl.classList.add('hidden');

    try {
      const saltB64 = payload.salt || (await storageGet({ salt: null })).salt;
      const key     = await deriveKey(pw, b642buf(saltB64));

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
      btn.disabled    = false;
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

export function initSettingsPanel() {
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => saveTheme(btn.dataset.theme));
  });

  document.getElementById('export-btn').addEventListener('click', exportVault);

  document.getElementById('change-pw-btn').addEventListener('click', showChangePwDialog);
  initChangePwDialog();

  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', (e) => {
    if (e.target.files[0]) importVault(e.target.files[0]);
    e.target.value = '';
  });

  const versionEl = document.getElementById('settings-version');
  if (versionEl) {
    const { version } = chrome.runtime.getManifest();
    versionEl.textContent = `Version ${version}`;
  }
}