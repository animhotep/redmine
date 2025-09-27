// History watcher for Redmine issue pages
// Extracted from content.js to a dedicated file
(function () {
  const HISTORY_WATCH = { timer: null };

  function shouldWatchHistory() {
    try {
      return location.href.startsWith('https://tracker.sendpulse.com/issues/');
    } catch (_) {
      return false;
    }
  }

  // Periodically checks for new history entries and appends new .journal.has-notes
  async function refreshHistoryOnce() {
    try {
      const currentTab = document.getElementById('tab-content-history');
      if (!currentTab) return;

      const res = await fetch(location.href, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-cache',
        redirect: 'follow',
      });
      if (!res.ok) return;
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const fetchedTab = doc.getElementById('tab-content-history');
      if (!fetchedTab) return;

      const curHtml = (currentTab.innerHTML || '').trim();
      const newHtml = (fetchedTab.innerHTML || '').trim();
      if (curHtml === newHtml) return; // nothing changed

      const currentTarget = document.getElementById('history') || currentTab;
      const fetchedTarget = doc.getElementById('history') || fetchedTab;
      if (!currentTarget || !fetchedTarget) return;

      const existingIds = new Set(
        Array.from(currentTarget.querySelectorAll('div.journal.has-notes[id]')).map(el => el.id)
      );
      const existingHTML = new Set(
        Array.from(currentTarget.querySelectorAll('div.journal.has-notes')).map(el => el.outerHTML)
      );

      const nodes = Array.from(fetchedTarget.querySelectorAll('div.journal.has-notes'));
      for (const node of nodes) {
        const id = node.id || node.getAttribute('data-id') || '';
        let exists = false;
        if (id && existingIds.has(id)) {
          exists = true;
        } else if (existingHTML.has(node.outerHTML)) {
          exists = true;
        }
        if (!exists) {
          currentTarget.appendChild(node.cloneNode(true));
        }
      }
    } catch (err) {
      // Silent fail to avoid console noise on pages without permissions
    }
  }

  function setupHistoryWatcher() {
    if (!shouldWatchHistory()) return;
    if (HISTORY_WATCH.timer) return;
    // Initial check shortly after load
    setTimeout(refreshHistoryOnce, 1500);
    // Then poll periodically
    HISTORY_WATCH.timer = setInterval(refreshHistoryOnce, 20000);
  }

  // Expose to other content scripts
  window.setupHistoryWatcher = setupHistoryWatcher;
})();
