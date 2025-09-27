(function () {

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

      // Sync optimistic locking fields on the issue form if they changed
      try {
        const newForm = doc.getElementById('issue-form');
        const curForm = document.getElementById('issue-form');
        if (newForm && curForm) {
          const mappings = [
            'input[name="issue[lock_version]"]',
            'input[name="last_journal_id"]',
          ];
          for (const sel of mappings) {
            const src = newForm.querySelector(sel);
            const dst = curForm.querySelector(sel);
            if (src && dst && dst.value !== src.value) {
              dst.value = src.value;
            }
          }
        }
      } catch (_) { }

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
    if (!location.href.startsWith('https://tracker.sendpulse.com/issues/')) return;
    
    setInterval(refreshHistoryOnce, 10000);
  }

  // Expose to other content scripts
  window.setupHistoryWatcher = setupHistoryWatcher;
})();
