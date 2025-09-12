// Based on Google Chrome Extensions hello-world sample
// This service worker is optional for the content script functionality
// but included to follow the tutorial bootstrap structure.

chrome.runtime.onInstalled.addListener(() => {
  console.log('Thumbnails Modal Viewer installed.');
});

chrome.runtime.onActivate?.addListener?.(() => {
  console.log('Thumbnails Modal Viewer activated.');
});
