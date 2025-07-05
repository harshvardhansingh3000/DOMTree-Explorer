console.log("DOMTree Explorer+ Background script loaded");

// Handle extension installation
chrome.runtime.onInstalled.addListener(()=>{
    console.log("DOMTree Explorer+ installed!");
});

// We can add more background functionality later:
// - Global state management
// - Cross-tab communication
// - Extension-wide events