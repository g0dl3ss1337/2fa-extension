import { exportKeyBytes } from './crypto.js';

export function sessionSetKey(key) {
  return new Promise(async (res) => {
    const bytes = await exportKeyBytes(key);
    chrome.runtime.sendMessage({ type: 'SET_KEY_BYTES', bytes }, res);
  });
}

export function sessionGetKey() {
  return new Promise((res) => {
    chrome.runtime.sendMessage({ type: 'GET_KEY_BYTES' }, res);
  });
}

export function sessionClearKey() {
  chrome.runtime.sendMessage({ type: 'CLEAR_KEY' });
}
