console.log("DOMTree Explorer+ Content script loaded");

// Global variables
let currentHighlightedElement = null;

// Function to generate a unique selector for an element
function generateSelector(element){
    if(element.id){
        return `#${element.id}`;
    }
    if(element.className){
        const classes = element.className.// a single string like "btn primary large"
        split(' '). // ["btn", "primary", "large"]
        filter(c => c.trim()). // removes accidental empty strings
        join('.'); // "btn.primary.large"
        const selector = `${element.tagName. // "DIV" , "BUTTON"
            toLowerCase()}.${classes}`; // "div.btn.primary.large"
        const elements = document.querySelectorAll(selector);
        if(elements.length === 1){ // if there is only one element with this selector, return it
            // return the selector
            return selector;
        }
    }
    // Fallback: build path with nth-child
    let path = []; //path – an array that will hold each step (later joined with “ > ”).
    let current = element;
    while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        
        if (current.id) { // if current has an id, then add it to path and break because ids are unique
            selector = `#${current.id}`;
            path.unshift(selector); // put it at the *front* of the path
            break;
        }
        
        if (current.className) {
            const classes = current.className.
            split(' ').
            filter(c => c.trim()).
            join('.');
            selector += `.${classes}`; // "div.btn.primary"
        }
        
        // Add nth-child if needed
        const siblings = Array.from(current.parentNode.children).filter(child => 
            child.tagName === current.tagName
        );
        if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += `:nth-child(${index})`;
        }
        
        path.unshift(selector);
        current = current.parentNode;
    }
    
    return path.join(' > '); // join the path with “ > ” to make it a string
    
}

// Function to get the element details
function getElementDetails(element){
    return{
        tagName: element.tagName.toLowerCase(),
        id: element.id || null,
        className: element.className || null,
        textContent: element.textContent?.trim().substring(0, 50) || null,
        selector: generateSelector(element),
        hasChildren: element.children.length > 0,
        childrenCount: element.children.length
    }
}

// Function to recursively build DOM tree
function buildDOMTree(element, maxDepth = 20, currentDepth = 0){
    if(!element || currentDepth >= maxDepth){
        return null;
    }
    const details = getElementDetails(element);
    const node = {
        ...details,
        children: [],
        depth: currentDepth
    }
    // Add children (limit to first 10 to avoid overwhelming the UI)
    const children = Array.from(element.children);
    for(const child of children){
        const childNode = buildDOMTree(child, maxDepth, currentDepth + 1);
        if(childNode){
            node.children.push(childNode);
        }
    }
    return node;
}

// Function to highlight an element on the page
function highlightElement(selector) {
    // Remove previous highlight
    if (currentHighlightedElement) {
        currentHighlightedElement.style.outline = '';
        currentHighlightedElement.style.backgroundColor = '';
    }

    // Find and highlight new element
    const element = document.querySelector(selector);
    if (element) {
        element.style.outline = '2px solid #ff6b6b';
        element.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
        currentHighlightedElement = element;
    
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        return true;
    }
    return false;
}

// Function to remove highlight
function removeHighlight() {
    if (currentHighlightedElement) {
        currentHighlightedElement.style.outline = '';
        currentHighlightedElement.style.backgroundColor = '';
        currentHighlightedElement = null;
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    switch (request.action) {
        case 'getDOMStructure':
            try {
                const domTree = buildDOMTree(document.body);
                sendResponse({ 
                    success: true, 
                    data: domTree,
                    pageTitle: document.title,
                    pageUrl: window.location.href
                });
            } catch (error) {
                console.error('Error building DOM tree:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message 
                });
            }
            break;
            
        case 'highlightElement':
            const success = highlightElement(request.selector);
            sendResponse({ success: success });
            break;
            
        case 'removeHighlight':
            removeHighlight();
            sendResponse({ success: true });
            break;
            
        default:
            sendResponse({ success: false, message: 'Unknown action' });
    }
    
    return true; // Keep the message channel open for async response
});

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
    removeHighlight();
});
