// ==UserScript==
// @name         🙂AutoHelper
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Salin HTML & screenshot full halaman (clipboard/file) — fix teks field terpotong, tanpa duplikasi textarea, full-page capture stabil
// @author       annayanami19
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/* global html2canvas */

(function () {
  'use strict';
  if (window.top !== window.self) return;

  const UPDATE_DELAY = 200;
  const PRESETS = { full: 'html', body: 'body', custom: '' };
  let currentMode = 'full';
  let targetSelector = PRESETS[currentMode];
  let latestHtml = '';
  let removeAllScripts = false;

  const debounce = (fn, wait) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  const getTimestamp = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}_${String(n.getHours()).padStart(2, '0')}-${String(n.getMinutes()).padStart(2, '0')}-${String(n.getSeconds()).padStart(2, '0')}`;
  };

  const getTarget = () =>
    targetSelector.toLowerCase() === 'html' || targetSelector.toLowerCase() === 'document'
      ? document.documentElement
      : document.querySelector(targetSelector);

  const getHtmlClean = () => {
    const el = getTarget();
    if (!el) return '';
    const clone = el.cloneNode(true);
    clone.querySelectorAll('#copyHtmlGui, #copyHtmlReopenBtn').forEach(e => e.remove());
    clone.querySelectorAll('script').forEach(scr => {
      const txt = scr.textContent || '';
      const isTamper = txt.includes('AutoHelper') || txt.includes('Tampermonkey');
      if (isTamper || (scr.src && scr.src.includes('tampermonkey'))) scr.remove();
    });
    if (removeAllScripts) clone.querySelectorAll('script').forEach(scr => scr.remove());
    clone.querySelectorAll('style').forEach(st => {
      if (st.textContent.includes('#copyHtmlGui')) st.remove();
    });
    return clone.outerHTML;
  };

  const copyToClipboard = async text => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    return true;
  };

  const copyImageToClipboard = async canvas => {
    try {
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      return true;
    } catch (e) {
      console.error('Clipboard image copy failed:', e);
      return false;
    }
  };

  // GUI panel
  const panel = document.createElement('div');
  panel.id = 'copyHtmlGui';
  panel.innerHTML = `
  <div id="panelContainer" style="all:revert; position:fixed; bottom:20px; right:20px;
    background:#fff; border:1px solid #ccc; box-shadow:0 4px 10px rgba(0,0,0,0.25);
    border-radius:10px; font-family:system-ui,sans-serif;
    z-index:999999999; width:270px; line-height:1.4;
    font-size:14px; color:#222; transition:all 0.2s ease; overflow:hidden;">
    <style>
      #copyHtmlGui * { all:revert; box-sizing:border-box!important; font-family:system-ui,sans-serif!important; font-size:14px!important; line-height:1.4!important; }
      #copyHtmlGui button { display:block; width:100%; padding:8px; border:none; border-radius:6px; cursor:pointer; font-weight:600; transition:filter 0.15s; }
      #copyHtmlGui button:hover { filter:brightness(0.9); }
      #copyHtmlGui #closeBtn:hover { background:rgba(255,255,255,0.15); }
    </style>
    <div id="headerBar" style="background:#0b74de;color:white;padding:10px 14px 10px 12px;cursor:move;font-weight:bold;display:flex;justify-content:space-between;align-items:center;position:relative;">
      <span>AutoHelper</span>
      <button id="closeBtn" title="Close" style="all:unset;position:absolute;top:50%;right:10px;transform:translateY(-50%);color:white;font-weight:700;font-size:18px;cursor:pointer;line-height:1;width:22px;height:22px;text-align:center;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:background 0.15s;">×</button>
    </div>
    <div id="panelContent" style="padding:10px;">
      <label style="font-size:13px;">Target:</label><br>
      <select id="presetSelect" style="width:100%;padding:6px;margin-top:4px;border:1px solid #ccc;border-radius:5px;">
        <option value="full">🌐 Full Page (&lt;html&gt;)</option>
        <option value="body">🧩 Body Only</option>
        <option value="custom">✏️ Custom Selector</option>
      </select>

      <input id="selectorInput" type="text" placeholder="contoh: #main .content" style="width:100%;padding:5px;margin-top:6px;border:1px solid #ccc;border-radius:5px;display:none;">

      <label style="font-size:12px;margin-top:8px;display:block;">
        <input type="checkbox" id="removeScriptsChk" style="margin-right:4px;">Hapus semua &lt;script&gt;
      </label>

      <button id="copyBtn" style="background:#0b74de;color:white;margin-top:10px;">📋 Copy HTML</button>
      <hr style="margin:10px 0;border:none;border-top:1px solid #ccc;">
      <button id="screenshotBtn" style="background:#009f4d;color:white;">📸 Screenshot (Download)</button>
      <button id="copyShotBtn" style="background:#ff9800;color:white;margin-top:6px;">🖼️ Copy Screenshot</button>
      <div id="statusText" style="font-size:12px;margin-top:8px;color:#333;text-align:center;"></div>
    </div>
  </div>`;
  document.body.appendChild(panel);

  // Reopen button
  const reopenBtn = document.createElement('button');
  reopenBtn.id = 'copyHtmlReopenBtn';
  reopenBtn.textContent = '🔘 Show Panel';
  Object.assign(reopenBtn.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 999999998,
    background: '#0b74de',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 10px',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    display: 'none',
    fontFamily: 'system-ui, sans-serif'
  });
  document.body.appendChild(reopenBtn);

  const panelContainer = panel.querySelector('#panelContainer');
  const headerBar = panel.querySelector('#headerBar');
  const presetSelect = panel.querySelector('#presetSelect');
  const selectorInput = panel.querySelector('#selectorInput');
  const copyBtn = panel.querySelector('#copyBtn');
  const screenshotBtn = panel.querySelector('#screenshotBtn');
  const copyShotBtn = panel.querySelector('#copyShotBtn');
  const statusText = panel.querySelector('#statusText');
  const removeScriptsChk = panel.querySelector('#removeScriptsChk');
  const closeBtn = panel.querySelector('#closeBtn');

  const showStatus = (msg, ms = 1800) => {
    statusText.textContent = msg;
    setTimeout(() => (statusText.textContent = ''), ms);
  };

  // Drag panel
  (() => {
    let dragging = false, offsetX, offsetY;
    headerBar.addEventListener('mousedown', e => {
      dragging = true;
      offsetX = e.clientX - panelContainer.getBoundingClientRect().left;
      offsetY = e.clientY - panelContainer.getBoundingClientRect().top;
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', stop);
    });
    function move(e) {
      if (!dragging) return;
      panelContainer.style.left = `${e.clientX - offsetX}px`;
      panelContainer.style.top = `${e.clientY - offsetY}px`;
      panelContainer.style.right = 'auto';
      panelContainer.style.bottom = 'auto';
    }
    function stop() {
      dragging = false;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', stop);
    }
  })();

  closeBtn.addEventListener('click', () => {
    panelContainer.style.display = 'none';
    reopenBtn.style.display = 'block';
  });
  reopenBtn.addEventListener('click', () => {
    panelContainer.style.display = 'block';
    reopenBtn.style.display = 'none';
  });

  const updateHtml = debounce(() => (latestHtml = getHtmlClean()), UPDATE_DELAY);
  new MutationObserver(updateHtml).observe(document.body, { childList: true, subtree: true, attributes: true });
  updateHtml();

  presetSelect.addEventListener('change', () => {
    currentMode = presetSelect.value;
    selectorInput.style.display = currentMode === 'custom' ? 'block' : 'none';
    targetSelector = currentMode === 'custom' ? selectorInput.value.trim() || 'body' : PRESETS[currentMode];
    updateHtml();
    showStatus(`Target: ${presetSelect.selectedOptions[0].text}`);
  });

  selectorInput.addEventListener('input', () => {
    targetSelector = selectorInput.value.trim() || 'body';
    updateHtml();
  });

  removeScriptsChk.addEventListener('change', e => {
    removeAllScripts = e.target.checked;
    updateHtml();
  });

  copyBtn.addEventListener('click', async () => {
    updateHtml();
    setTimeout(async () => {
      if (!latestHtml) return showStatus('❌ Elemen tidak ditemukan!');
      await copyToClipboard(latestHtml);
      showStatus('✅ HTML disalin!');
    }, 250);
  });

  async function ensureHtml2Canvas() {
    if (typeof html2canvas === 'undefined') {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      document.body.appendChild(s);
      await new Promise(r => (s.onload = r));
    }
  }

  // Screenshot with clean field overlay
  async function takeScreenshot(returnCanvas = false) {
  await ensureHtml2Canvas();

  // Pilih semua elemen GUI (panel, tombol reopen, style internal, iframe)
  const guiSelectors = ['#copyHtmlGui', '#copyHtmlReopenBtn', 'style[data-autohelper-style]', 'iframe'];
  const hiddenEls = [];

  guiSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (el && el.style) {
        el.dataset._autoHelperDisplay = el.style.display;
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        hiddenEls.push(el);
      }
    });
  });

  // Force reflow agar repaint selesai
  document.body.offsetHeight;
  await new Promise(r => setTimeout(r, 300));

  // Patch untuk mencegah elemen GUI disertakan html2canvas clone()
  const ignoreList = new Set(['copyHtmlGui', 'copyHtmlReopenBtn']);
  const originalCloneNode = Node.prototype.cloneNode;
  Node.prototype.cloneNode = function(deep) {
    if (this.nodeType === 1 && ignoreList.has(this.id)) {
      return document.createComment(`ignored ${this.id}`);
    }
    return originalCloneNode.call(this, deep);
  };

  // Tambahkan overlay teks pada input/select yang nilainya tidak terlihat
  const overlays = [];
  document.querySelectorAll('input, textarea, select').forEach(el => {
    let val = '';
    if (el.tagName === 'SELECT') val = el.selectedOptions[0]?.text || '';
    else val = el.value;
    if (!val) return;

    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const visible = style.color !== 'transparent' && el.value.trim() !== '';
    if (visible) return;

    const span = document.createElement('span');
    span.textContent = val;
    Object.assign(span.style, {
      position: 'absolute',
      left: `${window.scrollX + rect.left + 6}px`,
      top: `${window.scrollY + rect.top + 4}px`,
      font: style.font,
      color: style.color,
      background: 'transparent',
      whiteSpace: 'pre-wrap',
      width: `${rect.width - 10}px`,
      lineHeight: style.lineHeight,
      zIndex: 2147483647,
      pointerEvents: 'none'
    });
    document.body.appendChild(span);
    overlays.push(span);
  });

  // Ambil screenshot tanpa elemen GUI
  const scrollY = window.scrollY;
  window.scrollTo(0, 0);
  // Hapus semua elemen <noscript> agar html2canvas tidak render fallback teks
     document.querySelectorAll('noscript').forEach(el => el.remove());
  //
  document.querySelectorAll('iframe').forEach(frame => {
  try {
    const rect = frame.getBoundingClientRect();
    const placeholder = document.createElement('div');
    Object.assign(placeholder.style, {
      position: 'absolute',
      left: `${window.scrollX + rect.left}px`,
      top: `${window.scrollY + rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      background: '#fff url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgCkHrO0AAAAASUVORK5CYII=") center/contain no-repeat',
      border: '1px solid #ccc',
      zIndex: 2147483647
    });
    placeholder.dataset.autohelperIgnore = 'true';
    document.body.appendChild(placeholder);
    frame.dataset._autohelperPlaceholder = 'true';
  } catch {}
});

  const canvas = await html2canvas(document.body, {
    useCORS: true,
    scale: 2,
    scrollX: -window.scrollX,
    scrollY: -window.scrollY,
    windowWidth: document.documentElement.scrollWidth,
    windowHeight: document.documentElement.scrollHeight,
    backgroundColor: null,
    foreignObjectRendering: true,
    ignoreElements: el =>
      el?.id === 'copyHtmlGui' ||
      el?.id === 'copyHtmlReopenBtn' ||
      el?.tagName === 'IFRAME' ||
      el?.dataset?.autohelperIgnore === 'true'
  });
  window.scrollTo(0, scrollY);

  // Bersihkan overlay dan restore GUI
  overlays.forEach(e => e.remove());
  hiddenEls.forEach(el => {
    el.style.display = el.dataset._autoHelperDisplay || '';
    el.style.visibility = '';
    delete el.dataset._autoHelperDisplay;
  });
  Node.prototype.cloneNode = originalCloneNode;

  return returnCanvas ? canvas : canvas.toDataURL('image/png');
}







  screenshotBtn.addEventListener('click', async () => {
    showStatus('📸 Mengambil screenshot...');
    try {
      const dataUrl = await takeScreenshot(false);
      const ts = getTimestamp();
      const host = location.hostname.replace(/^www\./, '');
      const filename = `screenshot_${ts}_${host}.png`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
      showStatus(`✅ Screenshot disimpan (${filename})`);
    } catch (err) {
      console.error(err);
      showStatus('❌ Gagal menyimpan screenshot!');
    }
  });

  copyShotBtn.addEventListener('click', async () => {
    showStatus('🖼️ Menyalin screenshot ke clipboard...');
    try {
      const canvas = await takeScreenshot(true);
      const ok = await copyImageToClipboard(canvas);
      const ts = getTimestamp();
      showStatus(ok ? `✅ Screenshot ${ts} disalin ke clipboard!` : '❌ Clipboard gagal!');
    } catch (err) {
      console.error(err);
      showStatus('❌ Gagal menyalin screenshot!');
    }
  });

  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
      e.preventDefault();
      copyBtn.click();
    }
  });
})();
