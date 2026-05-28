import { state } from './state.js';
import { saveAccounts } from './storage.js';
import { escapeHtml, updateListHeight } from './ui.js';
import { FULL_CIRCLE_LEN } from './otp.js';

const BASE32_RE = /^[A-Z2-7]+=*$/;

export let searchQuery = '';
let dragSrcIndex = null;

export function isValidBase32(secret) {
  const s = secret.toUpperCase().replace(/\s/g, '');
  return s.length > 0 && BASE32_RE.test(s);
}

export function renderList() {
  const authList = document.getElementById('auth-list');
  authList.innerHTML = '';

  if (state.accounts.length === 0) {
    authList.innerHTML = '<div class="empty-state">No codes added yet</div>';
    return;
  }

  state.accounts.forEach((acc, index) => {
    const card = document.createElement('div');
    card.className     = 'auth-card';
    card.dataset.index = index;
    card.dataset.name  = acc.name;
    card.draggable     = true;

    card.innerHTML = `
      <div class="drag-handle" title="Drag to reorder">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">
          <line x1="8" y1="7" x2="16" y2="7"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
          <line x1="8" y1="17" x2="16" y2="17"></line>
        </svg>
      </div>
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

        <svg class="timer-svg" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="none" stroke="var(--border-color)" stroke-width="3"></circle>
          <circle class="timer-progress" id="circle-${index}" cx="12" cy="12" r="10"
                  fill="none" stroke="var(--accent-color)" stroke-width="3"
                  stroke-dasharray="${FULL_CIRCLE_LEN}" stroke-dashoffset="0"></circle>
          <text id="sec-${index}" x="12" y="12"
                text-anchor="middle" dominant-baseline="central"
                class="timer-sec-text">30</text>
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

export function filterCards(query) {
  searchQuery = query.toLowerCase().trim();
  document.querySelectorAll('.auth-card').forEach((card) => {
    const name  = (card.dataset.name || '').toLowerCase();
    const match = !searchQuery || name.includes(searchQuery);
    card.classList.toggle('search-hidden', !match);
  });

  const list    = document.getElementById('auth-list');
  const visible = [...list.querySelectorAll('.auth-card:not(.search-hidden)')];
  let noRes     = list.querySelector('.no-results');
  if (searchQuery && visible.length === 0) {
    if (!noRes) {
      noRes           = document.createElement('div');
      noRes.className = 'empty-state no-results';
      noRes.textContent = 'No results';
      list.appendChild(noRes);
    }
  } else if (noRes) {
    noRes.remove();
  }
}

export function closeAllMenus() {
  document.querySelectorAll('.auth-card').forEach((c) => c.classList.remove('show-actions'));
  document.querySelectorAll('.dots-btn').forEach((b)  => b.classList.remove('active'));
}

export function initDragAndDrop() {
  const list = document.getElementById('auth-list');

  list.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.auth-card');
    if (!card) return;
    dragSrcIndex = parseInt(card.dataset.index);
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  list.addEventListener('dragend', (e) => {
    const card = e.target.closest('.auth-card');
    if (card) card.classList.remove('dragging');
    list.querySelectorAll('.auth-card').forEach((c) => c.classList.remove('drag-over'));
    dragSrcIndex = null;
  });

  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const card = e.target.closest('.auth-card');
    if (!card) return;
    list.querySelectorAll('.auth-card').forEach((c) => c.classList.remove('drag-over'));
    const targetIndex = parseInt(card.dataset.index);
    if (targetIndex !== dragSrcIndex) card.classList.add('drag-over');
  });

  list.addEventListener('dragleave', (e) => {
    const card = e.target.closest('.auth-card');
    if (card) card.classList.remove('drag-over');
  });

  list.addEventListener('drop', async (e) => {
    e.preventDefault();
    const card = e.target.closest('.auth-card');
    if (!card) return;
    const targetIndex = parseInt(card.dataset.index);
    if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;

    const moved = state.accounts.splice(dragSrcIndex, 1)[0];
    state.accounts.splice(targetIndex, 0, moved);

    await saveAccounts();
    renderList();
  });
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

  document.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const idx           = parseInt(btn.getAttribute('data-index'));
      const nameContainer = document.getElementById(`name-container-${idx}`);
      if (nameContainer.querySelector('input')) return;

      const currentName = state.accounts[idx].name;
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
          state.accounts[idx].name = value;
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
      state.accounts.splice(idx, 1);
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
