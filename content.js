// Thumbnails Modal Viewer content script
// Scans for images within `.thumbnails` containers and enables a modal viewer

(() => {
  const STATE = {
    images: [], // array of {el: HTMLImageElement, src: string}
    index: -1,
    initialized: false,
  };

  const SELECTOR = '.thumbnails img';

  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function buildModalOnce() {
    if ($('#tmv-overlay')) return; // already built

    const overlay = document.createElement('div');
    overlay.id = 'tmv-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div id="tmv-container" aria-live="polite">
        <img id="tmv-image" alt="Image preview" />
        <div id="tmv-description" aria-live="polite"></div>
        <button id="tmv-prev" class="tmv-btn" aria-label="Previous image" title="Previous (←)">❮</button>
        <button id="tmv-next" class="tmv-btn" aria-label="Next image" title="Next (→)">❯</button>
        <button id="tmv-close" class="tmv-btn" aria-label="Close" title="Close (Esc)">✕</button>
        <span id="tmv-counter" class="tmv-visually-hidden" aria-live="polite"></span>
      </div>
    `;

    overlay.addEventListener('click', (e) => {
      // Close when clicking outside the image/container
      if (e.target === overlay) closeModal();
    });

    document.documentElement.appendChild(overlay);

    $('#tmv-prev').addEventListener('click', (e) => { e.stopPropagation(); prev(); });
    $('#tmv-next').addEventListener('click', (e) => { e.stopPropagation(); next(); });
    $('#tmv-close').addEventListener('click', (e) => { e.stopPropagation(); closeModal(); });

    document.addEventListener('keydown', onKeyDown, true);
  }

  function openModal(index) {
    if (!STATE.images.length) return;
    STATE.index = index;
    buildModalOnce();
    const overlay = $('#tmv-overlay');
    const img = $('#tmv-image');

    const item = STATE.images[STATE.index];
    img.src = item.downloadSrc || item.src;

    const desc = $('#tmv-description');
    if (desc) {
      const text = item.description || '';
      desc.textContent = text;
      desc.style.display = text ? '' : 'none';
    }
    console.log(STATE)

    const counter = $('#tmv-counter');
    if (counter) counter.textContent = `Image ${STATE.index + 1} of ${STATE.images.length}`;

    overlay.classList.add('tmv-open');
    document.body.classList.add('tmv-no-scroll');
  }

  function closeModal() {
    const overlay = $('#tmv-overlay');
    if (!overlay) return;
    overlay.classList.remove('tmv-open');
    document.body.classList.remove('tmv-no-scroll');
    STATE.index = -1;
  }

  function next() {
    if (!STATE.images.length) return;
    STATE.index = (STATE.index + 1) % STATE.images.length;
    updateImage();
  }

  function prev() {
    if (!STATE.images.length) return;
    STATE.index = (STATE.index - 1 + STATE.images.length) % STATE.images.length;
    updateImage();
  }

  function onKeyDown(e) {
    const overlay = $('#tmv-overlay');
    if (!overlay || !overlay.classList.contains('tmv-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  }

  function updateImage() {
    const img = $('#tmv-image');
    if (!img || STATE.index < 0) return;
    const item = STATE.images[STATE.index];
    img.src = item.downloadSrc || item.src;
    const desc = $('#tmv-description');
    if (desc) {
      const text = item.description || '';
      desc.textContent = text;
      desc.style.display = text ? '' : 'none';
    }
    const counter = $('#tmv-counter');
    if (counter) counter.textContent = `Image ${STATE.index + 1} of ${STATE.images.length}`;
  }

  function buildDownloadSrc(el) {
    try {
      const raw = el.currentSrc || el.src || '';
      const m = raw.match(/\/attachments\/thumbnail\/(\d+)(?:\/|$)/);
      if (!m) return null;
      const id = m[1];
      let name = (el.getAttribute('title') || '').trim();
      if (!name) {
        // Fallbacks if title is missing; requirement prioritizes title
        name = (el.getAttribute('alt') || '').trim();
      }
      if (!name) return `/attachments/download/${id}`; // still useful
      const encodedName = encodeURIComponent(name);
      return `/attachments/download/${id}/${encodedName}`;
    } catch (_) {
      return null;
    }
  }

  function collectImages() {
    const nodes = $all(SELECTOR);
    const unique = new Set();
    const items = [];
    for (const el of nodes) {
      if (!(el instanceof HTMLImageElement)) continue;
      if (el.dataset.tmvBound === '1') {
        // Keep already bound elements in items list as well
      }
      const src = el.currentSrc || el.src;
      const downloadSrc = buildDownloadSrc(el) || src;
      const description = getDescription(el);
      console.log(description)
      const key = downloadSrc + '|' + (el.alt || '') + '|' + items.length;
      if (!unique.has(key)) {
        unique.add(key);
        items.push({ el, src, downloadSrc, description });
      }
    }
    STATE.images = items;
  }

  function bindClicks() {
    $all(SELECTOR).forEach((imgEl, idx) => {
      if (imgEl.dataset.tmvBound === '1') return;
      imgEl.dataset.tmvBound = '1';
      imgEl.style.cursor = imgEl.style.cursor || 'zoom-in';
      imgEl.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        collectImages();
        const index = STATE.images.findIndex(item => item.el === imgEl);
        openModal(index >= 0 ? index : 0);
      });
    });
  }

  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldRebind = false;
      for (const m of mutations) {
        if (m.type === 'childList') {
          if ([...m.addedNodes].some(n => n.nodeType === 1 && (n.matches?.(SELECTOR) || n.querySelector?.(SELECTOR)))) {
            shouldRebind = true;
            break;
          }
        } else if (m.type === 'attributes' && m.target instanceof HTMLImageElement && m.target.matches(SELECTOR)) {
          shouldRebind = true;
          break;
        }
      }
      if (shouldRebind) {
        bindClicks();
        collectImages();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });
  }

  function init() {
    if (STATE.initialized) return;
    STATE.initialized = true;
    bindClicks();
    collectImages();
    setupMutationObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();


function getDescription(imgEl) {
  try {
    const note = imgEl.closest('div.note');
    if (!note) return '';
    const header = note.querySelector('h4.note-header');
    if (!header) return '';
    const text = (header.textContent || '').trim().replace(/\s+/g, ' ');
    return text;
  } catch (_) {
    return '';
  }
}
