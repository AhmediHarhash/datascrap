function callChromeApi(fn, ...args) {
  return new Promise((resolve, reject) => {
    fn(...args, (result) => {
      const lastError = chrome.runtime?.lastError;
      if (lastError) {
        reject(new Error(lastError.message || "Chrome API error"));
        return;
      }
      resolve(result);
    });
  });
}

export async function getActiveTab(chromeApi = chrome) {
  const tabs = await callChromeApi(chromeApi.tabs.query.bind(chromeApi.tabs), {
    active: true,
    currentWindow: true
  });
  return Array.isArray(tabs) && tabs.length > 0 ? tabs[0] : null;
}

export async function getTab(tabId, chromeApi = chrome) {
  return callChromeApi(chromeApi.tabs.get.bind(chromeApi.tabs), tabId);
}

export async function waitForTabComplete({ tabId, timeoutMs = 20_000, chromeApi = chrome }) {
  const existing = await getTab(tabId, chromeApi).catch(() => null);
  if (existing?.status === "complete") {
    return true;
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      chromeApi.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error(`Timed out waiting for tab ${tabId} to complete`));
    }, timeoutMs);

    function onUpdated(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId) return;
      if (changeInfo.status === "complete") {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        chromeApi.tabs.onUpdated.removeListener(onUpdated);
        resolve(true);
      }
    }

    chromeApi.tabs.onUpdated.addListener(onUpdated);
  });
}

export async function updateTab({ tabId, updateProperties, chromeApi = chrome }) {
  return callChromeApi(chromeApi.tabs.update.bind(chromeApi.tabs), tabId, updateProperties);
}

export async function createTab({ createProperties, chromeApi = chrome }) {
  return callChromeApi(chromeApi.tabs.create.bind(chromeApi.tabs), createProperties);
}

export async function removeTab({ tabId, chromeApi = chrome }) {
  return callChromeApi(chromeApi.tabs.remove.bind(chromeApi.tabs), tabId).catch(() => null);
}

export async function executeInTab({
  tabId,
  func,
  args = [],
  files = null,
  world = "ISOLATED",
  chromeApi = chrome
}) {
  const target = { tabId };
  if (Array.isArray(files) && files.length > 0) {
    return callChromeApi(chromeApi.scripting.executeScript.bind(chromeApi.scripting), {
      target,
      files,
      world
    });
  }

  return callChromeApi(chromeApi.scripting.executeScript.bind(chromeApi.scripting), {
    target,
    func,
    args,
    world
  });
}

export async function sendTabMessage({ tabId, message, chromeApi = chrome }) {
  return callChromeApi(chromeApi.tabs.sendMessage.bind(chromeApi.tabs), tabId, message);
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms || 0))));
}
