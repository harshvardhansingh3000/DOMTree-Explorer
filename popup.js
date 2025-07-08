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

// Show details in the details panel
function showDetailsPanel(node) {
    const panel = document.getElementById('detailsPanel');
    if (!node) {
        panel.style.display = 'none';
        panel.innerHTML = '';
        return;
    }
    panel.style.display = 'flex';
    panel.innerHTML = `
        <div><span class="details-label">Tag:</span> <span>${node.tagName}</span></div>
        <div><span class="details-label">ID:</span> <span>${node.id ? node.id : '<none>'}</span></div>
        <div><span class="details-label">Class:</span> <span>${node.className ? node.className : '<none>'}</span></div>
        <div><span class="details-label">Selector:</span> <span id="selectorText">${node.selector}</span></div>
        <div><span class="details-label">Children:</span> <span>${node.childrenCount}</span></div>
        <button class="copy-btn" id="copySelectorBtn">Copy Selector</button>
    `;
    document.getElementById('copySelectorBtn').onclick = function() {
        const selector = node.selector;
        navigator.clipboard.writeText(selector).then(() => {
            this.textContent = 'Copied!';
            setTimeout(() => { this.textContent = 'Copy Selector'; }, 1200);
        });
    };
}

//Create a tree node element
function createTreeNode(node, depth = 0){
    const nodeElement = document.createElement('div');
    nodeElement.className = 'tree-node';
    nodeElement.style.paddingLeft = `${depth * 20}px`;

    const nodeContent = document.createElement('div');
    nodeContent.className = 'node-content';

    // Create expand/collapse button for nodes with children
    if(node.hasChildren && node.children.length > 0){
        const expandBtn = document.createElement('span');
        expandBtn.className = 'expand-btn';
        expandBtn.textContent = '▶';
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
        childrenContainer.style.display = 'none';

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
function selectTreeNode(nodeElement, nodeData) {
    // Remove previous selection
    if (selectedNodeElement) {
        selectedNodeElement.classList.remove('selected');
    }
    selectedNodeElement = nodeElement;
    selectedNodeData = nodeData;
    nodeElement.classList.add('selected');
    showDetailsPanel(nodeData);
}

// Highlight element on the page
async function highlightElement(selector) {
    try {
        updateStatus('Highlighting element...');
        const response = await sendMessageToContentScript({
            action: 'highlightElement',
            selector: selector
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

// Render DOM tree
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
            renderDOMTree(response.data);
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


