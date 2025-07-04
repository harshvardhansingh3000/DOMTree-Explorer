# DOM Tree Explorer & Annotator – Project Plan

## Project Purpose
A Chrome extension that lets users visually explore, inspect, and annotate the DOM tree of any web page. It provides a sidebar or popup UI to navigate the DOM, highlight elements, add personal notes, and generate selector code for any element.

---

## Planned Features

### 1. DOM Tree Visualization
- Sidebar or popup UI with a collapsible tree view of the current page's DOM.
- Expand/collapse nodes to navigate deeply nested structures.
- Clicking a node highlights the corresponding element on the page.

### 2. Element Highlighting
- Hovering over a node highlights the element on the page.
- Clicking a node scrolls to and outlines the element.

### 3. Node Details
- Show tag, classes, id, and attributes for the selected node.

### 4. Annotation/Notes
- Add, edit, or delete personal notes for any DOM node.
- Notes are saved using chrome.storage, mapped to the page URL and a unique selector for the element.
- Annotated nodes are visually marked in the tree.

### 5. Selector Code Generator
- Display the best JavaScript selector code (e.g., `document.getElementById`, `document.querySelector`) for the selected element.
- "Copy" button to copy the code to clipboard.

### 6. Search & Filter
- Search for elements by tag, class, id, or text content.
- Filter to show only elements with notes or matching criteria.

### 7. User Experience
- Modern, responsive UI (CSS framework optional).
- Tooltips for buttons and features.
- (Optional) Keyboard navigation for the tree.

### 8. Persistent Storage
- All notes and user preferences are saved in chrome.storage (local or sync).

### 9. Publishing
- Prepare and optimize the extension for publishing on the Chrome Web Store.
- Write a clear README and store listing description.

---

## Technical Stack
- Manifest V3 (service worker, content scripts, web accessible resources)
- Content Script: DOM reading/highlighting, messaging
- Sidebar/Popup: UI for DOM tree, notes, selector code
- Background/Service Worker: Extension lifecycle, messaging
- chrome.storage: For notes and preferences
- CSS/JS for UI (framework optional)

---

## Stretch Features (Optional)
- Export/import notes
- Share annotated DOM trees
- Show computed styles or event listeners for nodes
- Dark mode

---

This document will be updated as we progress. Next, we'll start with the initial project setup and structure. Let me know when you're ready to begin! 