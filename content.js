let isVanishMode = false;
let hoveredElement = null;
let reticle = null;
let hud = null;

// --- 1. THE PHYSICS & SHOCKWAVE STYLES ---
const style = document.createElement('style');
style.textContent = `
  /* HUD - Dynamic Island */
  #n3xt-vanish-hud {
    position: fixed !important;
    top: 0 !important;
    left: 50% !important;
    transform: translate3d(-50%, -100%, 0) !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
    
    background: rgba(10, 10, 12, 0.85) !important;
    backdrop-filter: blur(24px) saturate(200%) !important;
    -webkit-backdrop-filter: blur(24px) saturate(200%) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
    
    display: flex !important;
    align-items: center !important;
    gap: 14px !important;
    padding: 10px 18px !important;
    border-radius: 999px !important;
    margin-top: 24px !important;
    
    font-family: system-ui, -apple-system, sans-serif !important;
    opacity: 0 !important;
    transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease !important;
    will-change: transform, opacity !important;
  }

  #n3xt-vanish-hud.n3xt-active {
    transform: translate3d(-50%, 0, 0) !important;
    opacity: 1 !important;
  }

  /* HUD Internals */
  .n3xt-hud-indicator {
    display: flex !important; align-items: center !important; justify-content: center !important; position: relative !important;
    width: 10px !important; height: 10px !important;
  }
  .n3xt-hud-dot {
    width: 8px !important; height: 8px !important; background: #ff453a !important; border-radius: 50% !important;
    box-shadow: 0 0 10px rgba(255, 69, 58, 0.6) !important; z-index: 2 !important;
  }
  .n3xt-hud-ping {
    position: absolute !important; width: 100% !important; height: 100% !important; background: #ff453a !important;
    border-radius: 50% !important; animation: n3xt-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite !important;
  }
  @keyframes n3xt-ping { 75%, 100% { transform: scale(2.5); opacity: 0; } }

  .n3xt-hud-text { color: #f4f4f5 !important; font-size: 13px !important; font-weight: 500 !important; letter-spacing: -0.01em !important; }
  .n3xt-hud-kbd {
    background: rgba(255, 255, 255, 0.1) !important; border: 1px solid rgba(255, 255, 255, 0.05) !important;
    border-bottom: 2px solid rgba(255, 255, 255, 0.15) !important; color: #a1a1aa !important; padding: 2px 6px !important;
    border-radius: 4px !important; font-size: 11px !important; font-weight: 600 !important; font-family: monospace !important;
  }

  /* THE FLUID RETICLE (With Spring Physics) */
  #n3xt-vanish-reticle {
    position: fixed !important; top: 0 !important; left: 0 !important; z-index: 2147483646 !important; pointer-events: none !important;
    
    /* Notice the cubic-bezier bounce curve */
    transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.1), 
                width 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.1), 
                height 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.1),
                opacity 0.15s ease !important;
    will-change: transform, width, height !important;
    
    border-radius: 8px !important;
    background: rgba(255, 255, 255, 0.02) !important;
    box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.9), 0 0 0 1px rgba(0, 0, 0, 0.15), 0 12px 32px rgba(0, 0, 0, 0.2) !important;
    backdrop-filter: blur(2px) contrast(0.95) !important;
    -webkit-backdrop-filter: blur(2px) contrast(0.95) !important;
    opacity: 0 !important;
  }
  #n3xt-vanish-reticle.n3xt-visible { opacity: 1 !important; }

  /* THE KINETIC SHOCKWAVE */
  .n3xt-shockwave {
    position: fixed !important;
    border-radius: 50% !important;
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.4) !important;
    backdrop-filter: blur(4px) !important;
    -webkit-backdrop-filter: blur(4px) !important;
    pointer-events: none !important;
    z-index: 2147483647 !important;
    transform: translate(-50%, -50%) scale(0) !important;
    opacity: 1 !important;
    animation: n3xt-ripple 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
  }

  @keyframes n3xt-ripple {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
  }

  /* THE SINGULARITY DELETION */
  .n3xt-vanish-destroyed {
    /* Transform origin is set dynamically by JS on click */
    transform: scale(0) rotate(5deg) !important;
    opacity: 0 !important;
    filter: blur(10px) brightness(200%) !important;
    transition: all 0.4s cubic-bezier(0.5, 0, 0, 1) !important;
    pointer-events: none !important;
  }
`;
document.head.appendChild(style);

// --- 2. INITIALIZE UI ---
function initUI() {
  if (hud) return;
  hud = document.createElement('div');
  hud.id = 'n3xt-vanish-hud';
  hud.innerHTML = `
    <div class="n3xt-hud-indicator"><div class="n3xt-hud-ping"></div><div class="n3xt-hud-dot"></div></div>
    <span class="n3xt-hud-text">Vanish Armed</span>
    <kbd class="n3xt-hud-kbd">ESC</kbd>
  `;
  document.body.appendChild(hud);

  reticle = document.createElement('div');
  reticle.id = 'n3xt-vanish-reticle';
  document.body.appendChild(reticle);
}

// --- 3. CORE LOGIC ---
function toggleVanishMode() {
  initUI();
  isVanishMode = !isVanishMode;

  if (isVanishMode) {
    document.body.style.cursor = 'crosshair';
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

// --- THE SINGULARITY CLICK ---
document.addEventListener('click', (e) => {
  if (!isVanishMode || !hoveredElement || !reticle) return;

  e.preventDefault();
  e.stopPropagation();

  const elToDelete = hoveredElement;
  const rect = elToDelete.getBoundingClientRect();
  
  // 1. Fire the Glass Shockwave at exact mouse coordinates
  const shockwave = document.createElement('div');
  shockwave.className = 'n3xt-shockwave';
  // Scale the ripple size based on the element size
  const maxDim = Math.max(rect.width, rect.height, 100); 
  shockwave.style.width = (maxDim * 1.5) + 'px';
  shockwave.style.height = (maxDim * 1.5) + 'px';
  shockwave.style.left = e.clientX + 'px';
  shockwave.style.top = e.clientY + 'px';
  document.body.appendChild(shockwave);
  
  // Clean up shockwave
  setTimeout(() => shockwave.remove(), 600);

  // 2. Set the "Black Hole" origin to exactly where the user clicked
  // This calculates the click position relative to the element itself
  const originX = e.clientX - rect.left;
  const originY = e.clientY - rect.top;
  elToDelete.style.transformOrigin = originX + 'px ' + originY + 'px';
  
  // 3. Implode the element
  elToDelete.classList.add('n3xt-vanish-destroyed');

  // 4. Snap the reticle shut
  reticle.style.transform = 'translate3d(' + (e.clientX) + 'px, ' + (e.clientY) + 'px, 0) scale(0)';
  reticle.style.opacity = '0';

  // 5. R.I.P Element
  setTimeout(() => { elToDelete.remove(); }, 400);

  // Reset reticle
  setTimeout(() => {
    reticle.classList.remove('n3xt-visible');
    reticle.style.opacity = '';
  }, 200);

  hoveredElement = null;
}, true);

// --- 4. SHORTCUTS ---
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isVanishMode) toggleVanishMode();
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
    e.preventDefault();
    toggleVanishMode();
  }
});