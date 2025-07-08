console.log("DOMTree Explorer+ Popup script loaded");

// Get DOM elements
const  loadDOMBtn = document.getElementById('loadDOM');
const clearHighlightBtn = document.getElementById('clearHighlight');
const statusMessage = document.getElementById('statusMessage');
const domTree = document.getElementById('domTree');

// Global variables
let currentDOMData = null;
let selectedNodeElement = null;
let selectedNodeData = null;
let searchTerm = '';

// Update status message
function updateStatus(message,isError = false){
    statusMessage.textContent = message;
    statusMessage.className = isError ? 'error' : '';
}

// Get the active tab
async function getActiveTab(){
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    return tab;
}

// Send message to content script
async function sendMessageToContentScript(message) {
    try {
        const tab = await getActiveTab();
        
        // Check if we're on a Chrome internal page
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
            throw new Error('Content scripts cannot run on Chrome internal pages. Please navigate to a regular website.');
        }
        
        const response = await chrome.tabs.sendMessage(tab.id, message);
        return response;
    } catch (error) {
        console.error("Error sending message to content script:", error);
        
        // Handle specific error for missing content script
        if (error.message.includes('Receiving end does not exist')) {
            throw new Error('Content script not found. Please refresh the page and try again.');
        }
        
        throw error;
    }
}

// Utility: Recursively search/filter tree nodes
function searchTree(node, term) {
    if (!term) return { ...node, matched: false, children: node.children.map(child => searchTree(child, term)) };
    const lowerTerm = term.toLowerCase();
    const matches =
        (node.tagName && node.tagName.toLowerCase().includes(lowerTerm)) ||
        (node.id && node.id.toLowerCase().includes(lowerTerm)) ||
        (node.className && node.className.toLowerCase().includes(lowerTerm)) ||
        (node.textContent && node.textContent.toLowerCase().includes(lowerTerm));
    const children = node.children.map(child => searchTree(child, term));
    const childMatches = children.some(child => child.matched || (child.children && child.children.some(grand => grand.matched)));
    return {
        ...node,
        matched: matches,
        children,
        expanded: matches || childMatches // auto-expand if match in subtree
    };
}

// Render breadcrumbs for selected node
function renderBreadcrumbs(node) {
    const breadcrumbsDiv = document.getElementById('breadcrumbs');
    if (!node || !currentDOMData) {
        breadcrumbsDiv.innerHTML = '';
        return;
    }
    // Find path from root to node
    const path = [];
    function findPath(current, target) {
        if (current.selector === target.selector) {
            path.push(current);
            return true;
        }
        for (const child of current.children) {
            if (findPath(child, target)) {
                path.unshift(current);
                return true;
            }
        }
        return false;
    }
    findPath(currentDOMData, node);
    // Render breadcrumbs
    breadcrumbsDiv.innerHTML = '';
    path.forEach((n, idx) => {
        if (idx > 0) {
            const sep = document.createElement('span');
            sep.className = 'breadcrumb-sep';
            sep.textContent = '›';
            breadcrumbsDiv.appendChild(sep);
        }
        const crumb = document.createElement('span');
        crumb.className = 'breadcrumb';
        crumb.title = 'Click to select this ancestor node';
        crumb.textContent = n.tagName + (n.id ? `#${n.id}` : '') + (n.className ? `.${n.className.split(' ')[0]}` : '');
        crumb.onclick = () => selectTreeNode(null, n, true);
        breadcrumbsDiv.appendChild(crumb);
    });
}

// Show details in the details panel
function showDetailsPanel(node) {
    const panel = document.getElementById('detailsPanel');
    if (!node) {
        panel.style.display = 'none';
        panel.innerHTML = '';
        return;
    }
    panel.style.display = 'flex';
    // Clear previous details except breadcrumbs
    panel.innerHTML = '<div id="breadcrumbs" class="breadcrumbs" style="margin-bottom:8px;"></div>';
    renderBreadcrumbs(node);
    panel.innerHTML += `
        <div><span class="details-label">Tag:</span> <span>${node.tagName}</span></div>
        <div><span class="details-label">ID:</span> <span>${node.id ? node.id : '<none>'}</span></div>
        <div><span class="details-label">Class:</span> <span>${node.className ? node.className : '<none>'}</span></div>
        <div><span class="details-label">Selector:</span> <span id="selectorText">${node.selector}</span></div>
        <div><span class="details-label">Children:</span> <span>${node.childrenCount}</span></div>
        <button class="copy-btn" id="copySelectorBtn" title="Copy the unique selector for this element">Copy Selector</button>
        <button class="copy-btn" id="jumpToElementBtn" title="Scroll the page to this element">Jump to Element</button>
    `;
    document.getElementById('copySelectorBtn').onclick = function() {
        const selector = node.selector;
        navigator.clipboard.writeText(selector).then(() => {
            this.textContent = 'Copied!';
            setTimeout(() => { this.textContent = 'Copy Selector'; }, 1200);
        });
    };
    document.getElementById('jumpToElementBtn').onclick = function() {
        highlightElement(node.selector, true); // true = jump
    };
}

//Create a tree node element
function createTreeNode(node, depth = 0){
    const nodeElement = document.createElement('div');
    nodeElement.className = 'tree-node';
    nodeElement.style.paddingLeft = `${depth * 20}px`;
    if (node.matched) nodeElement.style.background = '#ffe58f';
    if (selectedNodeData && node.selector === selectedNodeData.selector) nodeElement.classList.add('selected');

    const nodeContent = document.createElement('div');
    nodeContent.className = 'node-content';
    nodeContent.title = 'Click to select and highlight this element';

    // Create expand/collapse button for nodes with children
    if(node.hasChildren && node.children.length > 0){
        const expandBtn = document.createElement('span');
        expandBtn.className = 'expand-btn';
        expandBtn.textContent = node.expanded ? '▼' : '▶';
        expandBtn.onclick = (e) => {
            e.stopPropagation();
            toggleNode(nodeElement, expandBtn);
        };
        nodeContent.appendChild(expandBtn);
    }else{
        // Add spacing for nodes without children
        const spacer = document.createElement('span');
        spacer.className = 'spacer';
        spacer.textContent = '  ';
        nodeContent.appendChild(spacer);
    }

    // Create tag name element
    const tagElement = document.createElement('span');
    tagElement.className = 'tag-name';
    tagElement.textContent = node.tagName;
    nodeContent.appendChild(tagElement);

    // Add ID if present
    if(node.id){
        const idElement = document.createElement('span');
        idElement.className = 'element-id';
        idElement.textContent = `#${node.id}`;
        nodeContent.appendChild(idElement);
    }

    // Add class if present
    if(node.className){
        const classElement = document.createElement('span');
        classElement.className = 'element-class';
        classElement.textContent = `.${node.className.split(' ')[0]}`;
        nodeContent.appendChild(classElement);
    }

    // Add children count if present
    if(node.childrenCount > 0){
        const countElement = document.createElement('span');
        countElement.className = 'children-count';
        countElement.textContent = `(${node.childrenCount})`;
        nodeContent.appendChild(countElement);
    }

    // Add click handler for selecting and highlighting
    nodeContent.onclick = (e) => {
        e.stopPropagation();
        selectTreeNode(nodeElement, node);
        highlightElement(node.selector);
    };

    nodeElement.appendChild(nodeContent);

    // Create children container
    if(node.hasChildren && node.children.length > 0){
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'children-container';
        childrenContainer.style.display = node.expanded ? 'block' : 'none';

        node.children.forEach(child =>{
            const childElement = createTreeNode(child, depth + 1);
            childrenContainer.appendChild(childElement);
        });

        nodeElement.appendChild(childrenContainer);
    }

    return nodeElement;
}

// Toggle node expansion
function toggleNode(nodeElement, expandBtn) {
    const childrenContainer = nodeElement.querySelector('.children-container');
    if (childrenContainer) {
        const isExpanded = childrenContainer.style.display !== 'none';
        childrenContainer.style.display = isExpanded ? 'none' : 'block';
        expandBtn.textContent = isExpanded ? '▶' : '▼';
    }
}

// Select a tree node and show details
function selectTreeNode(nodeElement, nodeData, fromBreadcrumb) {
    // Remove previous selection
    if (selectedNodeElement) {
        selectedNodeElement.classList.remove('selected');
    }
    // Find the new nodeElement if fromBreadcrumb
    if (fromBreadcrumb) {
        // Find the DOM element in the tree
        const allNodes = document.querySelectorAll('.tree-node');
        for (const el of allNodes) {
            if (el.textContent.includes(nodeData.tagName) && el.textContent.includes(nodeData.id || '') && el.textContent.includes(nodeData.className ? nodeData.className.split(' ')[0] : '')) {
                nodeElement = el;
                break;
            }
        }
    }
    selectedNodeElement = nodeElement;
    selectedNodeData = nodeData;
    if (nodeElement) nodeElement.classList.add('selected');
    showDetailsPanel(nodeData);
}

// Highlight element on the page
async function highlightElement(selector, jump = false) {
    try {
        updateStatus('Highlighting element...');
        const response = await sendMessageToContentScript({
            action: 'highlightElement',
            selector: selector,
            jump: jump
        });
        if (response.success) {
            updateStatus('Element highlighted!');
        } else {
            updateStatus('Failed to highlight element', true);
        }
    } catch (error) {
        updateStatus('Error: ' + error.message, true);
    }
}

// Render DOM tree (with search/filter support)
function renderDOMTree(domData) {
    domTree.innerHTML = '';
    if (!domData) {
        domTree.innerHTML = '<p class="placeholder">No DOM data available</p>';
        return;
    }
    // Add page info
    const pageInfo = document.createElement('div');
    pageInfo.className = 'page-info';
    pageInfo.innerHTML = `
        <h3>${domData.pageTitle || 'Untitled Page'}</h3>
        <p class="page-url">${domData.pageUrl || ''}</p>
    `;
    domTree.appendChild(pageInfo);
    // Create tree container
    const treeContainer = document.createElement('div');
    treeContainer.className = 'tree-container';
    // Render the root node
    const rootNode = createTreeNode(domData);
    treeContainer.appendChild(rootNode);
    domTree.appendChild(treeContainer);
}

// Load DOM Tree
async function loadDOMTree(){
    try{
        updateStatus("Loading DOM Tree...");
        loadDOMBtn.classList.add('loading');
        const response = await sendMessageToContentScript({
            action: 'getDOMStructure',
        });
        if(response.success){
            currentDOMData = response.data;
            // If search is active, filter tree
            let treeToRender = currentDOMData;
            if (searchTerm) treeToRender = searchTree(currentDOMData, searchTerm);
            renderDOMTree(treeToRender);
            updateStatus("DOM Tree loaded successfully");
        }else{
            updateStatus("Failed to load DOM Tree",true);
        }
    }catch(error){
        updateStatus("Error: " + error.message,true);
    }finally{
        loadDOMBtn.classList.remove('loading');
    }
}

// Search/filter event
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        if (!currentDOMData) return;
        let treeToRender = currentDOMData;
        if (searchTerm) treeToRender = searchTree(currentDOMData, searchTerm);
        renderDOMTree(treeToRender);
    });
}

// clear highlight
async function clearHighlight(){
    try{
        updateStatus("Clearing highlight...");
        const response = await sendMessageToContentScript({
            action: 'removeHighlight',
        });
        if(response.success){
            updateStatus("Highlight cleared successfully");
        }else{
            updateStatus("Failed to clear highlight",true);
        }
    }catch(error){
        updateStatus("Error: " + error.message,true);
    }
}

//Event Listeners
loadDOMBtn.addEventListener('click',loadDOMTree);
clearHighlightBtn.addEventListener('click',clearHighlight);

// Check if current page is valid for the extension
async function isPageValid() {
    try {
        const tab = await getActiveTab();
        return !tab.url.startsWith('chrome://') && 
               !tab.url.startsWith('chrome-extension://') && 
               !tab.url.startsWith('about:');
    } catch (error) {
        return false;
    }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    const isValid = await isPageValid();
    if (isValid) {
        updateStatus("Ready to explore DOM");
    } else {
        updateStatus("Please navigate to a regular website to use this extension", true);
        loadDOMBtn.disabled = true;
        clearHighlightBtn.disabled = true;
    }
});


