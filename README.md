# Thumbnails Modal Viewer (Chrome Extension)

This extension is built using the Google Chrome Extensions hello-world tutorial bootstrap (MV3) and adds a content script that:
- Finds all images matching the selector `.thumbnails img` on any page
- Opens the clicked image in a modal overlay
- Lets you switch between images in the modal using on-screen buttons or keyboard arrows
- Close with Esc, backdrop click, or the Close button

Installation (Developer mode)
1. Download or clone this repository to your machine.
2. In Chrome, go to chrome://extensions.
3. Enable "Developer mode" (top-right).
4. Click "Load unpacked" and select the folder containing this repository.

How to use
- Visit any page that contains a `.thumbnails` container with `img` elements inside.
- Click any thumbnail image: a modal opens.
- Use the ❮ ❯ buttons or the Left/Right Arrow keys to navigate; press Esc to close.

Notes
- The extension injects a lightweight modal with very high z-index to avoid being hidden by site UI.
- It observes the page for dynamically added thumbnails and binds them automatically.
- No special permissions are required beyond content script injection on all URLs.

Files
- manifest.json — MV3 manifest, includes content script and service worker per the tutorial bootstrap.
- content.js — Finds `.thumbnails img`, opens the modal, handles navigation and keyboard.
- content.css — Styles for the modal overlay and controls.
- service_worker.js — Minimal background script (logs on install), to align with the hello-world bootstrap.