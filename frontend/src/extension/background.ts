const hasChrome = typeof chrome !== 'undefined';

if (hasChrome && chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    if (chrome.sidePanel?.setPanelBehavior) {
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
    if (chrome.contextMenus) {
      chrome.contextMenus.create({
        id: 'safe-to-upload-check',
        title: '올려도댐? 개인정보 점검',
        contexts: ['selection'],
      });
    }
  });
}

if (hasChrome && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener(async (message: any, sender: any) => {
    if (message?.type !== 'INJECTED_BUTTON_CLICK') return;
    const tabId = sender?.tab?.id;
    if (tabId && chrome.sidePanel?.open) {
      try {
        await chrome.sidePanel.open({ tabId });
      } catch {
        // no-op fallback
      }
    }
  });
}

if (hasChrome && chrome.contextMenus?.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info: any, tab: any) => {
    if (info.menuItemId !== 'safe-to-upload-check') return;
    const selectedText = info.selectionText || '';

    if (chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'CONTEXT_ANALYZE_TEXT',
        payload: { selectedText },
      });
    }

    if (tab?.id && chrome.sidePanel?.open) {
      try {
        await chrome.sidePanel.open({ tabId: tab.id });
      } catch {
        // no-op fallback
      }
    }
  });
}
