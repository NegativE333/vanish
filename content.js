// --- 0. AUTO-PERSISTENCE ENGINE ---
const domain = window.location.hostname;
let savedSelectors = [];

chrome.storage.local.get([domain], (result) => {
  if (result[domain]) {
    savedSelectors = result[domain];
    if (savedSelectors.length > 0) {
      const stealthStyle = document.createElement('style');
      stealthStyle.id = 'n3xt-stealth-blocks';
      stealthStyle.textContent = `${savedSelectors.join(', ')} { display: none !important; }`;
      document.documentElement.appendChild(stealthStyle);
    }
  }
});

// --- STATE ---
let isVanishMode = false;
let isExtractMode = false;
let hoveredElement = null;
let reticle = null;
let hud = null;
let vanishHistory = [];

// --- 1. INJECT ULTRA-PREMIUM STYLES ---
const style = document.createElement('style');
style.textContent = `
  /* --- HUD (Dynamic Island) --- */
  #n3xt-vanish-hud {
    position: fixed !important; top: 0 !important; left: 50% !important; transform: translate3d(-50%, -100%, 0) !important;
    z-index: 2147483647 !important; pointer-events: none !important;
    background: rgba(10, 10, 12, 0.85) !important; backdrop-filter: blur(24px) saturate(200%) !important;
    -webkit-backdrop-filter: blur(24px) saturate(200%) !important; border: 1px solid rgba(255, 255, 255, 0.12) !important;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
    display: flex !important; align-items: center !important; gap: 14px !important; padding: 10px 18px !important;
    border-radius: 999px !important; margin-top: 24px !important; font-family: system-ui, -apple-system, sans-serif !important;
    opacity: 0 !important; transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease, border-color 0.3s ease !important;
    will-change: transform, opacity !important;
  }
  #n3xt-vanish-hud.n3xt-active { transform: translate3d(-50%, 0, 0) !important; opacity: 1 !important; }

  .n3xt-hud-indicator { display: flex !important; align-items: center !important; justify-content: center !important; position: relative !important; width: 10px !important; height: 10px !important; }
  .n3xt-hud-dot { width: 8px !important; height: 8px !important; background: #ff453a !important; border-radius: 50% !important; box-shadow: 0 0 10px rgba(255, 69, 58, 0.6) !important; z-index: 2 !important; transition: background 0.3s ease, box-shadow 0.3s ease !important; }
  .n3xt-hud-ping { position: absolute !important; width: 100% !important; height: 100% !important; background: #ff453a !important; border-radius: 50% !important; animation: n3xt-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite !important; transition: background 0.3s ease !important; }
  @keyframes n3xt-ping { 75%, 100% { transform: scale(2.5); opacity: 0; } }
  
  .n3xt-hud-text { color: #f4f4f5 !important; font-size: 13px !important; font-weight: 500 !important; letter-spacing: -0.01em !important; display: flex !important; align-items: center !important; gap: 8px !important; transition: color 0.3s ease !important;}
  .n3xt-hud-kbd { background: rgba(255, 255, 255, 0.1) !important; border: 1px solid rgba(255, 255, 255, 0.05) !important; border-bottom: 2px solid rgba(255, 255, 255, 0.15) !important; color: #a1a1aa !important; padding: 2px 6px !important; border-radius: 4px !important; font-size: 11px !important; font-weight: 600 !important; font-family: monospace !important; }
  .n3xt-hud-count { background: rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 6px; font-size: 11px; color: #a1a1aa; font-family: system-ui, sans-serif; display: flex; align-items: center; gap: 6px; }
  .n3xt-hud-count kbd { background: transparent; border: 1px solid rgba(255,255,255,0.2); padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 9px; color: #fff; }

  /* --- MODE: EXTRACT (HUD) --- */
  #n3xt-vanish-hud.n3xt-extract { border-color: rgba(255, 255, 255, 0.3) !important; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important; }
  .n3xt-extract .n3xt-hud-dot { background: #ffffff !important; box-shadow: 0 0 12px rgba(255, 255, 255, 0.8) !important; }
  .n3xt-extract .n3xt-hud-ping { background: #ffffff !important; }
  .n3xt-extract .n3xt-hud-text { color: #ffffff !important; font-weight: 600 !important; }

  /* THE FLUID RETICLE (Default Destroy Box) */
  #n3xt-vanish-reticle {
    position: fixed !important; top: 0 !important; left: 0 !important; z-index: 2147483646 !important; pointer-events: none !important;
    transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.1), width 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.1), height 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.1), opacity 0.15s ease, box-shadow 0.2s ease, background 0.2s ease, backdrop-filter 0.2s ease !important;
    will-change: transform, width, height !important;
    border-radius: 8px !important; 
    background: rgba(255, 255, 255, 0.02) !important;
    box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.9), 0 0 0 1px rgba(0, 0, 0, 0.15), 0 12px 32px rgba(0, 0, 0, 0.2) !important;
    backdrop-filter: blur(2px) contrast(0.95) !important; 
    -webkit-backdrop-filter: blur(2px) contrast(0.95) !important; 
    opacity: 0 !important;
  }
  #n3xt-vanish-reticle.n3xt-visible { opacity: 1 !important; }

  /* --- MODE: EXTRACT (Stark Solid Box) --- */
  #n3xt-vanish-reticle.n3xt-extract { 
    background: rgba(255, 255, 255, 0.08) !important; /* Visible luminous fill */
    backdrop-filter: none !important; /* NO BLUR so text is perfectly readable */
    -webkit-backdrop-filter: none !important;
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 1), 0 12px 32px rgba(0, 0, 0, 0.25) !important; /* Crisp 2px solid white border */
  }

  /* --- MICRO-INTERACTIONS --- */
  
  /* The Flashbulb Effect (applies to the element being copied) */
  .n3xt-flashbulb {
    filter: brightness(2) contrast(1.5) drop-shadow(0 0 20px rgba(255,255,255,0.8)) !important;
    transform: scale(0.98) !important;
    transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  /* The Floating Cursor Badge */
  .n3xt-cursor-badge {
    position: fixed !important;
    pointer-events: none !important;
    z-index: 2147483647 !important;
    background: #ffffff !important;
    color: #000000 !important;
    font-family: system-ui, -apple-system, sans-serif !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    padding: 6px 12px !important;
    border-radius: 999px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
    /* Spring animation from cursor */
    animation: n3xt-float-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
  }
  @keyframes n3xt-float-up {
    0% { transform: translate(-50%, -10px) scale(0.8); opacity: 0; }
    15% { transform: translate(-50%, -30px) scale(1.1); opacity: 1; }
    30% { transform: translate(-50%, -35px) scale(1); opacity: 1; }
    80% { transform: translate(-50%, -45px) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -50px) scale(0.9); opacity: 0; }
  }

  /* Shockwave for Destroy */
  .n3xt-shockwave { position: fixed !important; border-radius: 50% !important; backdrop-filter: blur(4px) !important; pointer-events: none !important; z-index: 2147483647 !important; transform: translate(-50%, -50%) scale(0) !important; opacity: 1 !important; animation: n3xt-ripple 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards !important; }
  .n3xt-shockwave.destroy { box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.4) !important; }
  @keyframes n3xt-ripple { 0% { transform: translate(-50%, -50%) scale(0); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 0; } }

  .n3xt-vanish-destroyed { transform: scale(0) rotate(5deg) !important; opacity: 0 !important; filter: blur(10px) brightness(200%) !important; transition: all 0.4s cubic-bezier(0.5, 0, 0, 1) !important; pointer-events: none !important; }
  .n3xt-vanish-rewind { animation: n3xt-rewind-anim 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important; }
  @keyframes n3xt-rewind-anim { 0% { transform: scale(0) translateY(20px); opacity: 0; filter: blur(10px); } 100% { transform: scale(1) translateY(0); opacity: 1; filter: blur(0); } }
`;
document.documentElement.appendChild(style);

// --- 2. INITIALIZE UI ---
function initUI() {
  if (hud) return;
  if (!document.body) { requestAnimationFrame(initUI); return; }
  
  hud = document.createElement('div');
  hud.id = 'n3xt-vanish-hud';
  document.body.appendChild(hud);

  reticle = document.createElement('div');
  reticle.id = 'n3xt-vanish-reticle';
  document.body.appendChild(reticle);
}

function updateHUDText() {
  if (!hud) return;
  const modeText = isExtractMode ? "Data Siphon" : "Vanish Armed";
  const countHTML = savedSelectors.length > 0 && !isExtractMode ? `<div class="n3xt-hud-count">${savedSelectors.length} blocked <kbd>C</kbd> to reset</div>` : '';
  hud.innerHTML = `
    <div class="n3xt-hud-indicator"><div class="n3xt-hud-ping"></div><div class="n3xt-hud-dot"></div></div>
    <span class="n3xt-hud-text">${modeText} ${countHTML}</span>
    <kbd class="n3xt-hud-kbd">ESC</kbd>
  `;
}

function getCssSelector(el) {
  if (!(el instanceof Element)) return;
  let path = [];
  while (el.nodeType === Node.ELEMENT_NODE && el.nodeName.toLowerCase() !== 'html') {
    let selector = el.nodeName.toLowerCase();
    if (el.id) {
      selector += '#' + el.id;
      path.unshift(selector);
      break;
    } else {
      let sib = el, nth = 1;
      while (sib = sib.previousElementSibling) {
        if (sib.nodeName.toLowerCase() == selector) nth++;
      }
      if (nth != 1) selector += ":nth-of-type("+nth+")";
    }
    path.unshift(selector);
    el = el.parentNode;
  }
  return path.join(" > ");
}

// --- 4. CORE ENGINE ---
function toggleVanishMode() {
  initUI();
  isVanishMode = !isVanishMode;
  isExtractMode = false;

  if (isVanishMode) {
    document.body.style.cursor = 'crosshair';
    updateHUDText();
    hud.classList.add('n3xt-active');
  } else {
    document.body.style.cursor = '';
    hud.classList.remove('n3xt-active');
    reticle.classList.remove('n3xt-visible');
    hoveredElement = null;
  }
}

function getValidTarget(el) {
  if (!el) return null;
  const invalidTags = ['SPAN', 'B', 'STRONG', 'I', 'EM', 'A'];
  if (invalidTags.includes(el.tagName) && el.parentElement) return el.parentElement;
  return el;
}

function updateReticlePosition(target) {
  if (!target || !reticle) return;
  const rect = target.getBoundingClientRect();
  reticle.style.width = (rect.width + 12) + 'px';
  reticle.style.height = (rect.height + 12) + 'px';
  reticle.style.transform = 'translate3d(' + (rect.left - 6) + 'px, ' + (rect.top - 6) + 'px, 0)';
}

// Intercept browser native highlighting
document.addEventListener('mousedown', (e) => {
  if (isVanishMode && isExtractMode) e.preventDefault(); 
}, true); 

document.addEventListener('mousemove', (e) => {
  if (!isVanishMode || !reticle) return;
  let target = document.elementFromPoint(e.clientX, e.clientY);
  target = getValidTarget(target);

  if (!target || target === document.body || target === document.documentElement || (hud && hud.contains(target))) {
    reticle.classList.remove('n3xt-visible');
    hoveredElement = null;
    return;
  }

  if (target !== hoveredElement) {
    hoveredElement = target;
    updateReticlePosition(hoveredElement);
    reticle.classList.add('n3xt-visible');
  }
});

window.addEventListener('scroll', () => {
  if (isVanishMode && hoveredElement) updateReticlePosition(hoveredElement);
}, { passive: true });

// --- THE ACTION CLICK (DESTROY OR EXTRACT) ---
document.addEventListener('click', async (e) => {
  if (!isVanishMode || !hoveredElement || !reticle) return;

  e.preventDefault();
  e.stopPropagation();

  const target = hoveredElement;
  const rect = target.getBoundingClientRect();
  
  if (isExtractMode) {
    // === EXTRACTION LOGIC ===
    const textToCopy = target.innerText || target.value || "";
    if (textToCopy) {
      window.getSelection().removeAllRanges();
      await navigator.clipboard.writeText(textToCopy.trim());
      
      // 1. Flashbulb Effect on the element itself
      target.classList.add('n3xt-flashbulb');
      setTimeout(() => target.classList.remove('n3xt-flashbulb'), 150);

      // 2. Spawn Floating Cursor Badge at exact mouse coordinates
      const badge = document.createElement('div');
      badge.className = 'n3xt-cursor-badge';
      badge.innerText = 'Copied';
      badge.style.left = e.clientX + 'px';
      badge.style.top = e.clientY + 'px';
      document.body.appendChild(badge);
      setTimeout(() => badge.remove(), 1000); // Clean up after animation
    }
    
    // Slight reticle bounce
    reticle.style.transform = reticle.style.transform + ' scale(1.02)';
    setTimeout(() => updateReticlePosition(target), 150);
    
  } else {
    // === DESTRUCTION & PERSISTENCE LOGIC ===
    const shockwave = document.createElement('div');
    shockwave.className = 'n3xt-shockwave destroy';
    const maxDim = Math.max(rect.width, rect.height, 100); 
    shockwave.style.width = (maxDim * 1.5) + 'px';
    shockwave.style.height = (maxDim * 1.5) + 'px';
    shockwave.style.left = e.clientX + 'px';
    shockwave.style.top = e.clientY + 'px';
    document.body.appendChild(shockwave);
    setTimeout(() => shockwave.remove(), 600);

    const selector = getCssSelector(target);
    vanishHistory.push({
      element: target,
      parent: target.parentNode,
      nextSibling: target.nextSibling,
      selector: selector
    });

    if (selector && !savedSelectors.includes(selector)) {
      savedSelectors.push(selector);
      chrome.storage.local.set({ [domain]: savedSelectors });
      updateHUDText(); 
    }

    const originX = e.clientX - rect.left;
    const originY = e.clientY - rect.top;
    target.style.transformOrigin = originX + 'px ' + originY + 'px';
    target.classList.add('n3xt-vanish-destroyed');

    reticle.style.transform = 'translate3d(' + (e.clientX) + 'px, ' + (e.clientY) + 'px, 0) scale(0)';
    reticle.style.opacity = '0';

    setTimeout(() => { if(target.parentNode) target.parentNode.removeChild(target); }, 400);
    setTimeout(() => { reticle.classList.remove('n3xt-visible'); reticle.style.opacity = ''; }, 200);

    hoveredElement = null;
  }
}, true);

// --- 5. KEYBOARD STATE MACHINE ---
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isVanishMode) toggleVanishMode();
  
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
    e.preventDefault();
    toggleVanishMode();
  }

  // Switch to Extract Mode
  if (e.key === 'Shift' && isVanishMode && !isExtractMode) {
    isExtractMode = true;
    hud.classList.add('n3xt-extract');
    reticle.classList.add('n3xt-extract');
    // document.body.style.cursor = 'text'; // Change cursor to indicate text copying
    updateHUDText();
  }

  // Clear Blocklist
  if (isVanishMode && !isExtractMode && e.key.toLowerCase() === 'c') {
    e.preventDefault();
    if (savedSelectors.length > 0) {
      savedSelectors = [];
      chrome.storage.local.remove([domain]);
      
      const stealthStyle = document.getElementById('n3xt-stealth-blocks');
      if (stealthStyle) stealthStyle.remove();

      hud.innerHTML = `<span class="n3xt-hud-text" style="color:#fca5a5">Site Blocklist Reset!</span>`;
      setTimeout(() => updateHUDText(), 1500);
    }
  }

  // Cmd+Z (Rewind)
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && vanishHistory.length > 0) {
    e.preventDefault();
    const lastKill = vanishHistory.pop();
    
    savedSelectors = savedSelectors.filter(s => s !== lastKill.selector);
    chrome.storage.local.set({ [domain]: savedSelectors });
    
    lastKill.element.classList.remove('n3xt-vanish-destroyed');
    lastKill.element.classList.add('n3xt-vanish-rewind');
    
    if (lastKill.parent) {
      lastKill.parent.insertBefore(lastKill.element, lastKill.nextSibling);
    }
    
    setTimeout(() => lastKill.element.classList.remove('n3xt-vanish-rewind'), 500);
    if(isVanishMode) updateHUDText();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Shift' && isExtractMode) {
    isExtractMode = false;
    hud.classList.remove('n3xt-extract');
    reticle.classList.remove('n3xt-extract');
    document.body.style.cursor = 'crosshair';
    updateHUDText();
  }
});