// background.js

if (chrome.storage.session && chrome.storage.session.setAccessLevel) {
    chrome.storage.session.setAccessLevel({
        accessLevel: 'TRUSTED_CONTEXTS'
    }).catch(err => console.error("Access level error:", err));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SET_KEY_BYTES') {
        chrome.storage.session.set({ keyBytes: message.bytes }, () => {
            sendResponse({ success: true });
        });
        return true;
    }

    else if (message.type === 'GET_KEY_BYTES') {
        chrome.storage.session.get({ keyBytes: null }, (result) => {
            sendResponse({ bytes: result.keyBytes });
        });
        return true;
    }

    else if (message.type === 'CLEAR_KEY') {
        chrome.storage.session.remove('keyBytes', () => {
            sendResponse({ success: true });
        });
        return true;
    }
});
