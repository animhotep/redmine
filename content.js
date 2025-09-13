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
        <div id="tmv-top-counter" aria-live="polite"></div>
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

    const counter = $('#tmv-counter');
    const topCounter = $('#tmv-top-counter');
    const label = `${STATE.index + 1} of ${STATE.images.length} images`;
    if (counter) counter.textContent = label;
    if (topCounter) topCounter.textContent = label;

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
    const topCounter = $('#tmv-top-counter');
    const label = `${STATE.index + 1} of ${STATE.images.length} images`;
    if (counter) counter.textContent = label;
    if (topCounter) topCounter.textContent = label;
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
      // Also (re)bind async submit for issue form if it appears dynamically
      setupAsyncIssueForm();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });
  }

  async function handleAsyncIssueSubmit(e) {
    try {
      e.preventDefault();
      const form = e.currentTarget;
      if (!(form instanceof HTMLFormElement)) return;

      const submitter = e.submitter || form.querySelector('[type="submit"]');
      if (submitter) submitter.disabled = true;

      const action = form.action || location.href;
      const method = (form.getAttribute('method') || 'POST').toUpperCase();
      const formData = new FormData(form);

      // Submit without following redirects to avoid HTTPS->HTTP downgrade (mixed content)
      const postRes = await fetch(action, {
        method,
        body: formData,
        credentials: 'same-origin',
        redirect: 'manual',
      });

      let html = '';
      if (postRes.ok) {
        // Server responded with a full page (no redirect). Use it.
        html = await postRes.text();
      } else if (postRes.type === 'opaqueredirect' || (postRes.status >= 300 && postRes.status < 400)) {
        // Most Redmine instances redirect after POST. Since following may downgrade to HTTP,
        // explicitly reload the current page over HTTPS to fetch updated history.
        const refreshUrl = new URL(location.href);
        try {
          // If current context is already HTTPS, this keeps it HTTPS; otherwise, do not force.
          if (location.protocol === 'https:') refreshUrl.protocol = 'https:';
        } catch (_) {}
        const getRes = await fetch(refreshUrl.toString(), {
          method: 'GET',
          credentials: 'same-origin',
          redirect: 'follow',
        });
        if (!getRes.ok) throw new Error(`Follow-up GET failed: ${getRes.status}`);
        html = await getRes.text();
      } else {
        throw new Error(`Request failed: ${postRes.status}`);
      }
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newHistory = doc.querySelector('#history');
      const curHistory = document.querySelector('#history');

      if (newHistory && curHistory) {
        // Try to append only the newest comment block
        let candidate = null;
        // Prefer Redmine-like .journal blocks
        const journals = newHistory.querySelectorAll('.journal');
        if (journals.length) {
          candidate = journals[journals.length - 1];
        } else if (newHistory.lastElementChild) {
          candidate = newHistory.lastElementChild;
        }
        if (candidate) {
          const candId = candidate.id || candidate.getAttribute('data-id');
          let exists = false;
          if (candId) {
            exists = !!curHistory.querySelector(`#${CSS.escape(candId)}`);
          } else if (curHistory.lastElementChild) {
            exists = curHistory.lastElementChild.outerHTML === candidate.outerHTML;
          }
          if (!exists) {
            curHistory.appendChild(candidate.cloneNode(true));
          }
        }
      }
     
      // Reset form (clear note/comment field and attachments)
      try { form.reset(); } catch (_) {}

      if (submitter) submitter.disabled = false;
    } catch (err) {
      console.error('Async issue submit failed', err);
    }
  }

  function setupAsyncIssueForm() {
    const form = document.getElementById('issue-form');
    if (!form || form.dataset.tmvAsync === '1') return;
    form.dataset.tmvAsync = '1';
    form.addEventListener('submit', handleAsyncIssueSubmit, true);
  }

  function init() {
    if (STATE.initialized) return;
    STATE.initialized = true;
    bindClicks();
    collectImages();
    setupMutationObserver();
    setupAsyncIssueForm();
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
