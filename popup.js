const toggleAddBtn = document.getElementById('toggle-add-btn');
const addForm = document.getElementById('add-form');
const saveBtn = document.getElementById('save-btn');
const authList = document.getElementById('auth-list');

const FULL_CIRCLE_LEN = 62.83; // 2 * π * r (r=10)

toggleAddBtn.addEventListener('click', () => {
    addForm.classList.toggle('hidden');
    toggleAddBtn.textContent = addForm.classList.contains('hidden') ? '+' : '×';
});

saveBtn.addEventListener('click', () => {
    const name = document.getElementById('new-name').value.trim();
    let secret = document.getElementById('new-secret').value.trim().toUpperCase().replace(/\s/g, '');

    if (!name || !secret) {
        alert('Заполните все поля!');
        return;
    }

    chrome.storage.local.get({ accounts: [] }, (result) => {
        const accounts = result.accounts;
        accounts.push({ name, secret });
        
        chrome.storage.local.set({ accounts }, () => {
            document.getElementById('new-name').value = '';
            document.getElementById('new-secret').value = '';
            addForm.classList.add('hidden');
            toggleAddBtn.textContent = '+';
            initList(); 
        });
    });
});

function initList() {
    chrome.storage.local.get({ accounts: [] }, (result) => {
        authList.innerHTML = '';
        const accounts = result.accounts;

        if (accounts.length === 0) {
            authList.innerHTML = '<div style="text-align:center;color:#6c7086;padding:20px;">No codes added</div>';
            return;
        }

        accounts.forEach((acc, index) => {
            const card = document.createElement('div');
            card.className = 'auth-card';
            card.innerHTML = `
                <div class="auth-info" data-index="${index}" title="Click to copy">
                    <span class="auth-name" id="name-container-${index}">${acc.name}</span>
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
                        <button class="icon-btn edit-btn" data-index="${index}" title="Change name">
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
            `;
            authList.appendChild(card);
        });

        // --- EVENTS ---

        document.querySelectorAll('.auth-info').forEach(infoZone => {
            infoZone.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return;

                const idx = infoZone.getAttribute('data-index');
                const codeSpan = document.getElementById(`code-${idx}`);
                
                if (codeSpan.textContent === 'Copied!') return;

                const cleanCode = codeSpan.textContent.replace(' ', '');
                navigator.clipboard.writeText(cleanCode);

                const oldColor = codeSpan.style.color;
                codeSpan.textContent = 'Copied!';
                codeSpan.style.color = '#a6e3a1';

                setTimeout(() => { codeSpan.style.color = oldColor; }, 800);
            });
        });

        document.querySelectorAll('.dots-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = btn.getAttribute('data-index');
                const card = btn.closest('.auth-card');
                
                document.querySelectorAll('.auth-card').forEach(otherCard => {
                    if(otherCard !== card) otherCard.classList.remove('show-actions');
                });
                document.querySelectorAll('.dots-btn').forEach(dBtn => {
                    if(dBtn !== btn) dBtn.classList.remove('active');
                });

                card.classList.toggle('show-actions');
                btn.classList.toggle('active', card.classList.contains('show-actions'));
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-index'));
                const nameContainer = document.getElementById(`name-container-${idx}`);
                
                if (nameContainer.querySelector('input')) return;

                const currentName = accounts[idx].name;
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'edit-name-input';
                input.value = currentName;
                
                nameContainer.innerHTML = '';
                nameContainer.appendChild(input);
                input.focus();

                const saveInlineEdit = () => {
                    const value = input.value.trim();
                    if (value && value !== "") {
                        accounts[idx].name = value;
                        chrome.storage.local.set({ accounts }, () => { initList(); });
                    } else {
                        nameContainer.textContent = currentName; 
                    }
                };

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') saveInlineEdit();
                });

                input.addEventListener('blur', saveInlineEdit);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-index'));
                if (confirm(`Delete 2FA for "${accounts[idx].name}"?`)) {
                    accounts.splice(idx, 1);
                    chrome.storage.local.set({ accounts }, () => { initList(); });
                }
            });
        });
    });
}

document.addEventListener('click', () => {
    document.querySelectorAll('.auth-card').forEach(card => card.classList.remove('show-actions'));
    document.querySelectorAll('.dots-btn').forEach(btn => btn.classList.remove('active'));
});

function updateDynamicElements() {
    chrome.storage.local.get({ accounts: [] }, (result) => {
        const accounts = result.accounts;
        if (!accounts || accounts.length === 0) {
            requestAnimationFrame(updateDynamicElements);
            return;
        }

        const now = new Date();
        const ms = now.getMilliseconds();
        const sec = now.getSeconds();
        
        const timePassedInWindow = (sec % 30) + (ms / 1000);
        const remaining = 30 - timePassedInWindow;

        const strokeDashoffset = (timePassedInWindow / 30) * FULL_CIRCLE_LEN;
        const circleColor = remaining < 6 ? '#f38ba8' : '#a6e3a1';

        accounts.forEach((acc, index) => {
            const circle = document.getElementById(`circle-${index}`);
            if (circle) {
                circle.setAttribute('stroke-dashoffset', strokeDashoffset);
                circle.setAttribute('stroke', circleColor);
            }

            const codeSpan = document.getElementById(`code-${index}`);
            if (codeSpan && codeSpan.textContent !== 'Copied!') {
                try {
                    let code = otplib.authenticator.generate(acc.secret);
                    let formattedCode = code.slice(0, 3) + ' ' + code.slice(3);
                    
                    if (codeSpan.textContent !== formattedCode) {
                        codeSpan.textContent = formattedCode;
                    }
                } catch (e) {
                    codeSpan.textContent = "Error";
                }
            }
        });

        requestAnimationFrame(updateDynamicElements);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initList();
    requestAnimationFrame(updateDynamicElements);
});