const BTN_ID = 'safe-to-upload-floating-btn';
let lastSentUrl = '';

function sendClickEvent() {
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({
      type: 'INJECTED_BUTTON_CLICK',
      payload: { tabUrl: window.location.href },
    });
  }
}

function notifyCurrentUrlIfChanged() {
  const currentUrl = window.location.href;
  if (!currentUrl || currentUrl === lastSentUrl) return;
  lastSentUrl = currentUrl;
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({
      type: 'PLATFORM_URL_CHANGED',
      payload: { tabUrl: currentUrl },
    });
  }
}

function bindUrlChangeNotifier() {
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function (...args) {
    originalPushState(...args);
    notifyCurrentUrlIfChanged();
  };
  history.replaceState = function (...args) {
    originalReplaceState(...args);
    notifyCurrentUrlIfChanged();
  };

  window.addEventListener('popstate', () => notifyCurrentUrlIfChanged());
}

function mountFloatingButton() {
  if (document.getElementById(BTN_ID)) return;

  const button = document.createElement('button');
  button.id = BTN_ID;
  button.textContent = '개인정보 점검';
  Object.assign(button.style, {
    position: 'fixed',
    right: '20px',
    bottom: '20px',
    zIndex: '2147483647',
    border: '1px solid #777',
    background: '#ececec',
    color: '#111',
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
  });

  button.addEventListener('click', () => {
    sendClickEvent();
  });

  document.body.appendChild(button);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    mountFloatingButton();
    bindUrlChangeNotifier();
    notifyCurrentUrlIfChanged();
  });
} else {
  mountFloatingButton();
  bindUrlChangeNotifier();
  notifyCurrentUrlIfChanged();
}
