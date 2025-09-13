// Based on Google Chrome Extensions hello-world sample
// This service worker is optional for the content script functionality
// but included to follow the tutorial bootstrap structure.

chrome.runtime.onInstalled.addListener(() => {
  console.log('Redmine 2.0 installed.');
});

chrome.runtime.onActivate?.addListener?.(() => {
  console.log('Redmine 2.0 activated.');
});
