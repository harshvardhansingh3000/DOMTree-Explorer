console.log("DOMTree Explorer+ Content script loaded");

// Global variables
let currentHighlightedElement = null;

// Function to highlight an element on the page
function highlightElement(selector){
    //remove previous highlight
    if(currentHighlightedElement){
        currentHighlightedElement.style.outline = '';
        currentHighlightedElement.style.backgroundColor = '';
    }

    //Find and highlight new element
    const element = document.querySelector(selector);
    if(element){
        element.style.outline = '2px solid #ff6b6b';
        element.style.backgroundColor = 'rgba(255, 107, 107, 0.3)';
        currentHighlightedElement = element;
    

        //scroll element into view
        element.scrollIntoView({behavior: 'smooth', block: 'center'});

        return true;
    }
    return false;

}

// Function to remove highlight
function removeHighlight(){
    if(currentHighlightedElement){
        currentHighlightedElement.style.outline = '';
        currentHighlightedElement.style.backgroundColor = '';
        currentHighlightedElement = null;
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request,sender,sendResponse)=>{
    console.log("Message received:",request);
    switch(request.action){
        case 'getDOMStructure':
            sendResponse({success:true,message:"DOM structure fetched successfully"});
            break;
        case 'highlightElement':
            const success = highlightElement(request.selector);
            sendResponse({success:success});
            break;
        case 'removeHighlight':
            removeHighlight();
            sendResponse({success:true,message:"Highlight removed successfully"});
            break;
        default:
            sendResponse({success:false,message:"Unknown action"});
    }
    return true;// keep the message channel open for async response
});

// Clean up when page unloads
window.addEventListener('beforeunload',()=>{
    removeHighlight();
});
