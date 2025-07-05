console.log("DOMTree Explorer+ Popup script loaded");

// Get DOM elements
const  loadDOMBtn = document.getElementById('loadDOM');
const clearHighlightBtn = document.getElementById('clearHighlight');
const statusMessage = document.getElementById('statusMessage');
const domTree = document.getElementById('domTree');

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

// Load DOM Tree
async function loadDOMTree(){
    try{
        updateStatus("Loading DOM Tree...");
        loadDOMBtn.classList.add('loading');

        const response = await sendMessageToContentScript({
            action: 'getDOMStructure',
        });
        if(response.success){
            updateStatus("DOM Tree loaded successfully");
            // we will implement the DOM tree rendering here later
            domTree.innerHTML = '<p>DOM structure received! (Tree display coming next)</p>';
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


