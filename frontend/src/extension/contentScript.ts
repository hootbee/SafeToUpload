const BTN_ID = 'safe-to-upload-floating-btn';

function sendClickEvent() {
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'INJECTED_BUTTON_CLICK' });
  }
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
  document.addEventListener('DOMContentLoaded', mountFloatingButton);
} else {
  mountFloatingButton();
}
