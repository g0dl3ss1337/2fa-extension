import { state } from './state.js';

const FULL_CIRCLE_LEN = 62.83; // 2 * π * r (r=10)

let lastSec  = -1;
let lastCode = {};

export function tick() {
  if (!state.accounts.length) {
    state.rafId = requestAnimationFrame(tick);
    return;
  }

  const now = Date.now();
  const ms  = now % 1000;
  const sec = Math.floor(now / 1000);

  const needCodeUpdate = sec !== lastSec;
  if (needCodeUpdate) lastSec = sec;

  state.accounts.forEach((acc, index) => {
    const period    = acc.period || 30;
    const passed    = (sec % period) + ms / 1000;
    const remaining = period - passed;
    const offset    = (passed / period) * FULL_CIRCLE_LEN;
    const color     = remaining < 6 ? 'var(--danger-color)' : 'var(--accent-color)';

    const circle = document.getElementById(`circle-${index}`);
    if (circle) {
      circle.setAttribute('stroke-dashoffset', offset.toFixed(2));
      circle.setAttribute('stroke', color);
    }

    const secLabel = document.getElementById(`sec-${index}`);
    if (secLabel) {
      const secs = Math.ceil(remaining);
      if (secLabel.textContent !== String(secs)) {
        secLabel.textContent = secs;
        secLabel.style.color = color;
      }
    }

    if (needCodeUpdate) {
      const codeSpan = document.getElementById(`code-${index}`);
      if (codeSpan && !codeSpan.dataset.copying) {
        try {
          const opts = {
            digits:    acc.digits    || 6,
            period,
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

  state.rafId = requestAnimationFrame(tick);
}

export { FULL_CIRCLE_LEN };
