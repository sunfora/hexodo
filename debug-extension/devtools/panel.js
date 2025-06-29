// devtools/panel.js

const statusDiv = document.getElementById('status');
const openButton = document.getElementById('open-debugger-window-button');

// Establish connection to devtools-page.js
const port = chrome.runtime.connect({ name: "debugger-visualizer-devtools-panel" });

port.onMessage.addListener(message => {
    // console.log("Message from devtools-page to panel.js:", message); // For debugging
    if (message.type === 'status') {
        statusDiv.textContent = message.message;
        statusDiv.className = 'status ' + (message.error ? 'error' : 'info');
        // Optionally, disable button if window is already open/active
        if (message.message.includes('Window opened') || message.message.includes('Window is already open')) {
            openButton.disabled = true;
        } else if (message.message.includes('Window disconnected')) {
            openButton.disabled = false;
        }
    }
});

port.onDisconnect.addListener(() => {
    console.warn("Connection to devtools-page.js lost from devtools/panel.js.");
    statusDiv.textContent = 'Connection to backend lost. Please reload DevTools.';
    statusDiv.className = 'status error';
    openButton.disabled = false;
});

// Event listener for the button
openButton.addEventListener('click', () => {
    if (port) {
        port.postMessage({ type: 'open-debugger-window' });
        openButton.disabled = true; // Disable button immediately
        statusDiv.textContent = 'Opening debugger window...';
        statusDiv.className = 'status info';
    } else {
        statusDiv.textContent = 'Backend not connected. Reload DevTools.';
        statusDiv.className = 'status error';
    }
});

// Initial status
statusDiv.textContent = 'Connecting to DevTools backend...';
statusDiv.className = 'status info';
openButton.disabled = false; // Enable initially
