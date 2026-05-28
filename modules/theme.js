const THEME_KEY = 'theme';

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'original' ? '' : theme);
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

export function loadTheme() {
  chrome.storage.local.get({ [THEME_KEY]: 'original' }, (r) => applyTheme(r[THEME_KEY]));
}

export function saveTheme(theme) {
  chrome.storage.local.set({ [THEME_KEY]: theme });
  applyTheme(theme);
}
