export function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

export function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function evalStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: 'Weak',        color: '#f38ba8' };
  if (score <= 2) return { score: 2, label: 'Fair',        color: '#fab387' };
  if (score <= 3) return { score: 3, label: 'Good',        color: '#f9e2af' };
  if (score <= 4) return { score: 4, label: 'Strong',      color: '#a6e3a1' };
  return               { score: 5, label: 'Very Strong', color: '#89dceb' };
}

export function updateListHeight() {
  // 4 cards * (64px + 8px margin) = 288px
  const BASE = 288;
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
