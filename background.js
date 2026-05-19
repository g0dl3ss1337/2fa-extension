// background.js

if (chrome.storage.session && chrome.storage.session.setAccessLevel) {
    chrome.storage.session.setAccessLevel({ 
        accessLevel: 'TRUSTED_CONTEXTS' 
    }).catch(err => console.error("Ошибка установки уровня доступа:", err));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SET_KEY') {
        chrome.storage.session.set({ masterPassword: message.key }, () => {
            sendResponse({ success: true });
        });
        return true;
    } 
    
    else if (message.type === 'GET_KEY') {
        chrome.storage.session.get({ masterPassword: null }, (result) => {
            sendResponse({ key: result.masterPassword });
        });
        return true;
    } 
    
    else if (message.type === 'CLEAR_KEY') {
        chrome.storage.session.remove('masterPassword', () => {
            sendResponse({ success: true });
        });
        return true;
    }
});