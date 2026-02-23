(function initDatascrapPickerOverlay() {
  const SINGLETON_KEY = "__datascrapPickerOverlay";
  const MESSAGE_TYPES = {
    START: "datascrap.picker.start",
    CANCEL: "datascrap.picker.cancel",
    PROGRESS: "datascrap.picker.session.progress",
    COMPLETED: "datascrap.picker.session.completed",
    CANCELED: "datascrap.picker.session.canceled"
  };

  if (window[SINGLETON_KEY] && typeof window[SINGLETON_KEY].teardown === "function") {
    window[SINGLETON_KEY].teardown();
  }

  const state = {
    running: false,
    sessionId: null,
    mode: null,
    multiSelect: false,
    prompt: "",
    anchorSelector: "",
    anchorElement: null,
    hoveredElement: null,
    selections: [],
    panelRoot: null,
    panelBody: null,
    panelCount: null,
    panelPrompt: null,
    highlight: null,
    dragHeader: null,
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0
  };

  function styleValue(value) {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
  }

  function cssDescriptor(element) {
    const tagName = String(element.tagName || "").toLowerCase() || "div";
    const parent = element.parentElement;
    if (!parent) return tagName;

    const siblings = Array.from(parent.children).filter((item) => item.tagName === element.tagName);
    if (siblings.length <= 1) return tagName;
    const index = siblings.indexOf(element) + 1;
    return `${tagName}:nth-of-type(${index})`;
  }

  function buildAbsoluteSelector(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }
    if (element.id) {
      return `#${styleValue(element.id)}`;
    }

    const parts = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      parts.unshift(cssDescriptor(current));
      current = current.parentElement;
    }
    if (parts.length === 0) return "body";
    return `body > ${parts.join(" > ")}`;
  }

  function buildRelativeSelector(element, anchorElement) {
    if (!element || !anchorElement || !anchorElement.contains(element)) {
      return "";
    }

    if (element === anchorElement) {
      return ":scope";
    }

    const parts = [];
    let current = element;
    while (current && current !== anchorElement) {
      parts.unshift(cssDescriptor(current));
      current = current.parentElement;
    }
    if (parts.length === 0) return ":scope";
    return parts.join(" > ");
  }

  function attributeHints(element) {
    const hints = [];
    if (!element) return hints;
    if (element.hasAttribute("href") || element.tagName === "A") {
      hints.push({
        mode: "link_url"
      });
    }
    if (element.hasAttribute("src") || element.tagName === "IMG") {
      hints.push({
        mode: "image_url"
      });
    }

    const commonAttrs = ["data-id", "data-testid", "aria-label", "title", "alt", "class"];
    for (const attr of commonAttrs) {
      if (element.hasAttribute(attr)) {
        hints.push({
          mode: "attribute",
          attribute: attr
        });
      }
    }
    return hints;
  }

  function textPreview(element) {
    if (!element) return "";
    const text = String(element.innerText || element.textContent || "").trim().replace(/\s+/g, " ");
    return text.slice(0, 120);
  }

  function updateHighlightForElement(element) {
    if (!state.highlight) return;
    if (!element) {
      state.highlight.style.display = "none";
      return;
    }

    const rect = element.getBoundingClientRect();
    state.highlight.style.display = "block";
    state.highlight.style.left = `${rect.left + window.scrollX}px`;
    state.highlight.style.top = `${rect.top + window.scrollY}px`;
    state.highlight.style.width = `${Math.max(0, rect.width)}px`;
    state.highlight.style.height = `${Math.max(0, rect.height)}px`;
  }

  function updatePanelSelections() {
    if (!state.panelBody || !state.panelCount) return;
    state.panelCount.textContent = String(state.selections.length);
    state.panelBody.innerHTML = "";

    for (let index = 0; index < state.selections.length; index += 1) {
      const selection = state.selections[index];
      const item = document.createElement("div");
      item.style.cssText = "padding:6px 8px;border:1px solid rgba(75,119,236,0.35);border-radius:8px;background:rgba(11,18,36,0.85);font-size:11px;line-height:1.35;";
      item.innerHTML = `
        <div style="color:#7bd6c3;font-weight:600;">#${index + 1} ${selection.tagName}</div>
        <div style="color:#d7e6ff;word-break:break-all;">${selection.selector}</div>
        ${selection.relativeSelector ? `<div style="color:#8fb0f0;word-break:break-all;">relative: ${selection.relativeSelector}</div>` : ""}
      `;
      state.panelBody.appendChild(item);
    }
  }

  function sendPickerMessage(type) {
    if (!state.sessionId) return;
    try {
      chrome.runtime.sendMessage({
        type,
        payload: {
          sessionId: state.sessionId,
          mode: state.mode,
          selections: state.selections
        }
      });
    } catch (_error) {
      // ignore messaging errors if extension worker is not available
    }
  }

  function clearDom() {
    if (state.panelRoot && state.panelRoot.parentElement) {
      state.panelRoot.parentElement.removeChild(state.panelRoot);
    }
    if (state.highlight && state.highlight.parentElement) {
      state.highlight.parentElement.removeChild(state.highlight);
    }
    state.panelRoot = null;
    state.panelBody = null;
    state.panelCount = null;
    state.panelPrompt = null;
    state.highlight = null;
    state.dragHeader = null;
  }

  function onMouseMove(event) {
    if (!state.running) return;
    if (state.panelRoot && state.panelRoot.contains(event.target)) return;
    state.hoveredElement = event.target;
    updateHighlightForElement(state.hoveredElement);
  }

  function addSelection(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    const absolute = buildAbsoluteSelector(element);
    const relative = state.anchorElement ? buildRelativeSelector(element, state.anchorElement) : "";
    const selection = {
      selector: absolute,
      relativeSelector: relative,
      tagName: String(element.tagName || "").toLowerCase(),
      textPreview: textPreview(element),
      attributeHints: attributeHints(element)
    };

    const isDuplicate = state.selections.some((item) => item.selector === selection.selector && item.relativeSelector === selection.relativeSelector);
    if (isDuplicate) return;

    state.selections.push(selection);
    updatePanelSelections();
    sendPickerMessage(MESSAGE_TYPES.PROGRESS);
  }

  function finishSession(completed) {
    if (!state.running) return;
    state.running = false;
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClickCapture, true);
    document.removeEventListener("keydown", onKeyDownCapture, true);
    document.removeEventListener("mousemove", onDragMove, true);
    document.removeEventListener("mouseup", onDragEnd, true);
    clearDom();

    sendPickerMessage(completed ? MESSAGE_TYPES.COMPLETED : MESSAGE_TYPES.CANCELED);

    state.sessionId = null;
    state.mode = null;
    state.multiSelect = false;
    state.prompt = "";
    state.anchorSelector = "";
    state.anchorElement = null;
    state.hoveredElement = null;
    state.selections = [];
    state.isDragging = false;
  }

  function onClickCapture(event) {
    if (!state.running) return;
    if (state.panelRoot && state.panelRoot.contains(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    addSelection(event.target);
    if (!state.multiSelect) {
      finishSession(true);
    }
  }

  function onKeyDownCapture(event) {
    if (!state.running) return;
    if (event.key === "Escape") {
      event.preventDefault();
      finishSession(true);
      return;
    }
    if (event.key === "ArrowUp" && state.hoveredElement && state.hoveredElement.parentElement) {
      event.preventDefault();
      state.hoveredElement = state.hoveredElement.parentElement;
      updateHighlightForElement(state.hoveredElement);
    }
  }

  function onDragStart(event) {
    if (!state.running || !state.panelRoot) return;
    state.isDragging = true;
    const rect = state.panelRoot.getBoundingClientRect();
    state.dragOffsetX = event.clientX - rect.left;
    state.dragOffsetY = event.clientY - rect.top;
    event.preventDefault();
  }

  function onDragMove(event) {
    if (!state.running || !state.isDragging || !state.panelRoot) return;
    const left = event.clientX - state.dragOffsetX;
    const top = event.clientY - state.dragOffsetY;
    state.panelRoot.style.left = `${Math.max(8, left)}px`;
    state.panelRoot.style.top = `${Math.max(8, top)}px`;
    state.panelRoot.style.right = "auto";
  }

  function onDragEnd() {
    state.isDragging = false;
  }

  function createDom() {
    const panel = document.createElement("div");
    panel.style.cssText = [
      "position:absolute",
      "top:12px",
      "right:12px",
      "z-index:2147483647",
      "width:320px",
      "background:rgba(8,14,28,0.96)",
      "border:1px solid rgba(87,126,236,0.5)",
      "border-radius:12px",
      "box-shadow:0 20px 40px rgba(0,0,0,0.35)",
      "color:#e9f1ff",
      "font-family:Segoe UI,Arial,sans-serif"
    ].join(";");

    const header = document.createElement("div");
    header.style.cssText = "padding:10px 12px;border-bottom:1px solid rgba(87,126,236,0.35);cursor:move;display:flex;justify-content:space-between;align-items:center;";
    header.innerHTML = `
      <div>
        <div style="font-size:11px;color:#8fb0f0;letter-spacing:0.08em;text-transform:uppercase;">Datascrap Picker</div>
        <div style="font-size:13px;font-weight:600;" id="datascrap-picker-mode"></div>
      </div>
      <div style="font-size:12px;color:#7bd6c3;">Selected: <span id="datascrap-picker-count">0</span></div>
    `;

    const prompt = document.createElement("div");
    prompt.style.cssText = "padding:10px 12px;font-size:12px;color:#c7d9ff;";

    const body = document.createElement("div");
    body.style.cssText = "max-height:220px;overflow:auto;padding:0 12px 10px;display:grid;gap:6px;";

    const footer = document.createElement("div");
    footer.style.cssText = "padding:10px 12px;border-top:1px solid rgba(87,126,236,0.35);display:flex;gap:8px;";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.style.cssText = "flex:1;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,132,148,0.55);background:rgba(49,14,21,0.8);color:#ffd5db;cursor:pointer;";
    cancelButton.addEventListener("click", () => finishSession(false));

    const finishButton = document.createElement("button");
    finishButton.type = "button";
    finishButton.textContent = "Finish";
    finishButton.style.cssText = "flex:1;padding:8px 10px;border-radius:8px;border:1px solid rgba(61,210,170,0.65);background:rgba(9,53,42,0.85);color:#c6ffe8;cursor:pointer;";
    finishButton.addEventListener("click", () => finishSession(true));

    footer.appendChild(cancelButton);
    footer.appendChild(finishButton);

    panel.appendChild(header);
    panel.appendChild(prompt);
    panel.appendChild(body);
    panel.appendChild(footer);
    document.documentElement.appendChild(panel);

    const highlight = document.createElement("div");
    highlight.style.cssText = [
      "position:absolute",
      "display:none",
      "z-index:2147483646",
      "pointer-events:none",
      "border:2px solid #3dd2aa",
      "background:rgba(61,210,170,0.18)",
      "border-radius:4px"
    ].join(";");
    document.documentElement.appendChild(highlight);

    state.panelRoot = panel;
    state.panelBody = body;
    state.panelCount = header.querySelector("#datascrap-picker-count");
    state.panelPrompt = prompt;
    state.highlight = highlight;
    state.dragHeader = header;
    state.dragHeader.addEventListener("mousedown", onDragStart, true);
  }

  function startSession(payload) {
    finishSession(false);

    state.running = true;
    state.sessionId = String(payload?.sessionId || "").trim();
    state.mode = String(payload?.mode || "").trim() || "field";
    state.multiSelect = Boolean(payload?.multiSelect);
    state.prompt = String(payload?.prompt || "").trim();
    state.anchorSelector = String(payload?.anchorSelector || "").trim();
    state.anchorElement = state.anchorSelector ? document.querySelector(state.anchorSelector) : null;
    state.hoveredElement = null;
    state.selections = [];

    createDom();

    const modeTitle = state.panelRoot.querySelector("#datascrap-picker-mode");
    if (modeTitle) {
      modeTitle.textContent = state.mode.replace(/_/g, " ").toUpperCase();
    }

    const defaultPrompt = state.multiSelect
      ? "Click elements to add them, then press Finish or ESC."
      : "Click one element to select it.";
    state.panelPrompt.textContent = state.prompt || defaultPrompt;

    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("keydown", onKeyDownCapture, true);
    document.addEventListener("mousemove", onDragMove, true);
    document.addEventListener("mouseup", onDragEnd, true);
    updatePanelSelections();
  }

  function onRuntimeMessage(message, _sender, sendResponse) {
    const type = String(message?.type || "").trim();
    if (type === MESSAGE_TYPES.START) {
      startSession(message.payload || {});
      sendResponse({
        ok: true,
        sessionId: state.sessionId
      });
      return true;
    }

    if (type === MESSAGE_TYPES.CANCEL) {
      const requestSessionId = String(message?.payload?.sessionId || "").trim();
      if (!requestSessionId || requestSessionId === state.sessionId) {
        finishSession(false);
      }
      sendResponse({
        ok: true
      });
      return true;
    }

    return false;
  }

  chrome.runtime.onMessage.addListener(onRuntimeMessage);

  window[SINGLETON_KEY] = {
    teardown() {
      chrome.runtime.onMessage.removeListener(onRuntimeMessage);
      finishSession(false);
      clearDom();
    }
  };
})();
