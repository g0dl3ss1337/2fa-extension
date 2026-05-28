import { encrypt, decrypt } from './crypto.js';
import { state } from './state.js';

export function storageGet(keys) {
  return new Promise((res) => chrome.storage.local.get(keys, res));
}

export function storageSet(obj) {
  return new Promise((res) => chrome.storage.local.set(obj, res));
}

export async function saveAccounts() {
  const json = JSON.stringify(state.accounts);
  const { iv, ct } = await encrypt(state.cryptoKey, json);
  await storageSet({ vault: { iv, ct } });
}

export async function loadAccounts(key) {
  const { vault } = await storageGet({ vault: null });
  if (!vault) return [];
  try {
    const json = await decrypt(key, vault.iv, vault.ct);
    return JSON.parse(json);
  } catch {
    throw new Error('wrong_password');
  }
}
