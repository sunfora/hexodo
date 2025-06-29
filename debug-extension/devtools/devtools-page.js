// devtools/devtools-page.js

console.log("devtools-page.js loaded.");
console.log("chrome.devtools:", chrome.devtools);
console.log("chrome.debugger (before panel create):", chrome.debugger);

let debuggerAttached = false;
let devtoolsPanelPort = null; // Connection to the *DevTools Panel*
let popupPort = null;         // Connection to the *Popup Window*
let currentTabId = chrome.devtools.inspectedWindow.tabId;
let visualizerPanel = null;   // Reference to the created DevTools panel

// Store active watch expressions here
let watchedExpressions = []; // Array of strings, e.g., ['myVar', 'someObject.prop']

// --- Create Custom DevTools Panel ---
chrome.devtools.panels.create(
    "Debugger Visualizer",
    "../icons/visualizer-48.png",
    "devtools/panel.html", // HTML file for your custom panel
    function(newPanel) {
        console.log("Custom DevTools panel created callback triggered.");
        visualizerPanel = newPanel; // Store the panel reference for later use (e.g., show())
        newPanel.onShown.addListener(handleDevtoolsPanelShown);
        newPanel.onHidden.addListener(handleDevtoolsPanelHidden);
    }
);

// --- Message Passing Setup ---

// Listen for connections from any script in your extension
chrome.runtime.onConnect.addListener(function(port) {
    console.log(`Incoming port connection: ${port.name}`); // Log every connection attempt

    // 1. Connection from the DEVTOOLS PANEL (devtools/panel.js)
    if (port.name === "debugger-visualizer-devtools-panel") {
        if (devtoolsPanelPort) {
            console.warn("DevTools Panel already connected, replacing old port.");
            devtoolsPanelPort.disconnect(); // Disconnect previous one if exists
        }
        devtoolsPanelPort = port;
        console.log("DevTools Panel connected.");

        devtoolsPanelPort.onDisconnect.addListener(function() {
            console.log("DevTools Panel disconnected.");
            devtoolsPanelPort = null;
            sendMessageToDevtoolsPanel({ type: 'status', message: 'DevTools Panel disconnected. Re-open to use.' });
            sendMessageToDevtoolsPanel({ type: 'popupStatus', isOpen: false });
        });
        devtoolsPanelPort.onMessage.addListener(handleDevtoolsPanelMessage);

        sendMessageToDevtoolsPanel({ type: 'status', message: 'DevTools Panel connected. Click "Open Debugger Window".' });
        if (popupPort) {
            sendMessageToDevtoolsPanel({ type: 'popupStatus', isOpen: true, message: 'Debugger Window is already open and connected.' });
        } else {
             sendMessageToDevtoolsPanel({ type: 'popupStatus', isOpen: false, message: 'Debugger Window is closed. Click to open.' });
        }

    }
    // 2. Connection from the POPUP WINDOW (popup/popup.js)
    else if (port.name === "debugger-visualizer-popup") {
        if (popupPort) {
            console.warn("Popup window already connected, replacing old port.");
            popupPort.disconnect(); // Disconnect previous one if exists
        }
        popupPort = port;
        console.log("Popup window connected.");

        popupPort.onDisconnect.addListener(function() {
            console.log("Popup window disconnected.");
            popupPort = null;
            detachDebugger();
            sendMessageToDevtoolsPanel({ type: 'popupStatus', isOpen: false, message: 'Debugger Window disconnected. Debugger detached.' });
        });
        popupPort.onMessage.addListener(handlePopupMessage);

        if (!debuggerAttached) {
            console.log("Popup connected. Attempting to attach debugger.");
            attachDebugger();
        } else {
            sendMessageToPopup({ type: 'status', message: 'Debugger already attached. Ready to visualize.' });
            sendMessageToPopup({ type: 'debuggerResumed' });
        }
        sendMessageToDevtoolsPanel({ type: 'popupStatus', isOpen: true, message: 'Debugger Window opened and connected.' });

    } else {
        console.error(`ERROR: Unexpected port connection attempt. Port name: "${port.name}". This indicates a misconfigured script.`);
    }
});

function sendMessageToDevtoolsPanel(message) {
    if (devtoolsPanelPort) {
        try {
            devtoolsPanelPort.postMessage(message);
        } catch (e) {
            console.error("Error sending message to DevTools Panel:", e);
            devtoolsPanelPort = null;
        }
    } else {
        console.warn("Attempted to send message to DevTools Panel, but port is not active. Message:", message);
    }
}

function sendMessageToPopup(message) {
    if (popupPort) {
        try {
            popupPort.postMessage(message);
        } catch (e) {
            console.error("Error sending message to Popup:", e);
            popupPort = null;
        }
    } else {
        console.warn("Attempted to send message to Popup, but port is not active. Message:", message);
    }
}

// --- Debugger Attachment/Detachment ---
async function attachDebugger() {
    if (!chrome.debugger) {
        console.error("Critical Error: chrome.debugger API is undefined.");
        sendMessageToPopup({ type: 'status', message: `Critical Error: Debugger API unavailable.`, error: true });
        sendMessageToDevtoolsPanel({ type: 'status', message: `Critical Error: Debugger API unavailable.`, error: true });
        return;
    }
    if (debuggerAttached) {
        console.log("Debugger already attached. Skipping re-attachment.");
        sendMessageToPopup({ type: 'status', message: 'Debugger already attached. Ready to visualize.' });
        sendMessageToPopup({ type: 'debuggerResumed' });
        sendMessageToDevtoolsPanel({ type: 'status', message: 'Debugger Attached. Window active.' });
        return;
    }

    try {
        console.log("Attempting to attach debugger to tab:", currentTabId);
        await chrome.debugger.attach({ tabId: currentTabId }, "1.3");
        debuggerAttached = true;
        console.log("Debugger attached.");

        chrome.debugger.onEvent.addListener(handleDebuggerEvent);
        chrome.debugger.onDetach.addListener(handleDebuggerDetach);

        await chrome.debugger.sendCommand({ tabId: currentTabId }, "Debugger.enable");
        await chrome.debugger.sendCommand({ tabId: currentTabId }, "Runtime.enable"); // Enable Runtime for evaluation

        sendMessageToPopup({ type: 'status', message: 'Debugger Attached. Ready to visualize.' });
        sendMessageToPopup({ type: 'debuggerResumed' });
        sendMessageToDevtoolsPanel({ type: 'status', message: 'Debugger Attached. Window active.' });

    } catch (e) {
        console.error("Failed to attach debugger:", e);
        debuggerAttached = false;
        sendMessageToPopup({ type: 'status', message: `Failed to attach debugger: ${e.message}`, error: true });
        sendMessageToDevtoolsPanel({ type: 'status', message: `Failed to attach debugger: ${e.message}`, error: true });
        sendMessageToPopup({ type: 'debuggerResumed' });
        sendMessageToDevtoolsPanel({ type: 'popupStatus', isOpen: false });
    }
}

async function detachDebugger() {
    if (debuggerAttached) {
        try {
            chrome.debugger.onEvent.removeListener(handleDebuggerEvent);
            chrome.debugger.onDetach.removeListener(handleDebuggerDetach);
            await chrome.debugger.detach({ tabId: currentTabId });
            debuggerAttached = false;
            console.log("Debugger detached from tab:", currentTabId);
            sendMessageToPopup({ type: 'status', message: 'Debugger Detached.' });
            sendMessageToPopup({ type: 'debuggerResumed' });
            sendMessageToDevtoolsPanel({ type: 'status', message: 'Debugger Detached. Window can be re-opened.' });
            sendMessageToDevtoolsPanel({ type: 'popupStatus', isOpen: false });
        } catch (e) {
            console.error("Failed to detach debugger:", e);
            if (e.message.includes("Debugger is not attached") || e.message.includes("No tab with given id")) {
                debuggerAttached = false;
                console.warn("Debugger was already detached or tab closed.");
            }
            sendMessageToDevtoolsPanel({ type: 'status', message: `Failed to detach debugger: ${e.message}. Debugger state reset.` });
            sendMessageToDevtoolsPanel({ type: 'popupStatus', isOpen: false });
        }
    }
}

function handleDebuggerDetach(debuggee, reason) {
    if (debuggee.tabId === currentTabId) {
        console.warn(`Debugger detached unexpectedly from tab ${debuggee.tabId}. Reason: ${reason}`);
        debuggerAttached = false;
        sendMessageToPopup({ type: 'status', message: `Debugger detached unexpectedly: ${reason}.` });
        sendMessageToPopup({ type: 'debuggerResumed' });
        sendMessageToDevtoolsPanel({ type: 'status', message: `Debugger detached unexpectedly from tab. Reason: ${reason}` });
        sendMessageToDevtoolsPanel({ type: 'popupStatus', isOpen: false });
    }
}


// --- DevTools Panel Lifecycle Handlers ---
async function handleDevtoolsPanelShown() {
    console.log("handleDevtoolsPanelShown called.");
    if (devtoolsPanelPort) {
        sendMessageToDevtoolsPanel({ type: 'status', message: 'DevTools Panel visible.' });
        if (popupPort) {
            sendMessageToDevtoolsPanel({ type: 'popupStatus', isOpen: true, message: 'Debugger Window is open.' });
        } else {
            sendMessageToDevtoolsPanel({ type: 'popupStatus', isOpen: false, message: 'Debugger Window is closed. Click to open.' });
        }
    } else {
        console.warn("Panel shown but no active port. Panel.js might not have connected yet.");
    }
    // Attempt to re-activate your panel after a short delay, to counteract DevTools switching to Sources
    if (visualizerPanel && chrome.devtools.panels.selectedPanel !== visualizerPanel) {
        setTimeout(() => {
            console.log("Attempting to re-activate DevTools panel.");
            visualizerPanel.show(); // This method makes the panel active
        }, 100);
    }
}

async function handleDevtoolsPanelHidden() {
    console.log("handleDevtoolsPanelHidden called.");
}

// --- Debugger Event Handling (Sends data to popup) ---
async function handleDebuggerEvent(source, method, params) {
    if (source.tabId !== currentTabId) {
        return;
    }
    // console.log("Debugger Event:", method, params);

    if (method === "Debugger.paused") {
        console.log("Debugger paused! Reason:", params.reason);
        sendMessageToPopup({ type: 'debuggerPaused' });

        const currentCallFrame = params.callFrames && params.callFrames[0];

        // --- Evaluate Watched Expressions first ---
        let evaluatedWatchedData = {};
        let canvasObjectId = null; // To store the objectId of the canvas variable

        for (const expr of watchedExpressions) {
            try {
                const evaluateParams = {
                    expression: expr,
                    objectGroup: "debugger-visualizer-watches",
                    includeCommandLineAPI: true,
                    returnByValue: false, // Keep as false to get objectId for objects
                    generatePreview: true
                };
                if (currentCallFrame && currentCallFrame.callFrameId) {
                    evaluateParams.callFrameId = currentCallFrame.callFrameId;
                }

                const { result, exceptionDetails } = await chrome.debugger.sendCommand(
                    { tabId: currentTabId },
                    "Runtime.evaluate",
                    evaluateParams
                );
                console.log(result);
                if (result && !exceptionDetails) {
                    evaluatedWatchedData[expr] = {
                        value: result.value,
                        preview: result.preview,
                        objectId: result.objectId, // This is key!
                        type: result.type,
                        subtype: result.subtype
                    };
                    // Check if this watched expression is a canvas element
                    if (result.subtype === 'node' && result.className === 'HTMLCanvasElement' && result.objectId) {
                        canvasObjectId = result.objectId;
                        console.log(`Identified canvas object for expression "${expr}" with objectId: ${canvasObjectId}`);
                    }
                } else {
                    evaluatedWatchedData[expr] = { error: exceptionDetails ? exceptionDetails.text : "Evaluation failed" };
                }
            } catch (e) {
                console.warn(`Failed to evaluate watch expression "${expr}":`, e);
                evaluatedWatchedData[expr] = { error: `Evaluation error: ${e.message}` };
            }
        }
        // Send watched data immediately
        sendMessageToPopup({ type: 'watchedData', data: evaluatedWatchedData });


        // --- NEW ADDITION: Capture Canvas Content from Watch Variable ---
        let canvasDataURL = null;
        let canvasWidth = 0;
        let canvasHeight = 0;
        let canvasCaptureError = null;

        if (canvasObjectId) {
            try {
                // Call toDataURL on the *specific RemoteObject* representing the canvas
                const callResult = await chrome.debugger.sendCommand(
                    { tabId: currentTabId },
                    "Runtime.callFunctionOn",
                    {
                        functionDeclaration: "function() { return this.toDataURL('image/png'); }", // Function to execute on the object
                        objectId: canvasObjectId,
                        returnByValue: true // We need the string value back
                    }
                );

                if (callResult && !callResult.exceptionDetails) {
                    canvasDataURL = callResult.result.value; // The DataURL string
                    // Also get width/height if available in the watchedData for that canvas
                    const canvasWatchData = evaluatedWatchedData[watchedExpressions.find(e => evaluatedWatchedData[e]?.objectId === canvasObjectId)];
                    if (canvasWatchData && canvasWatchData.preview && canvasWatchData.preview.properties) {
                        const widthProp = canvasWatchData.preview.properties.find(p => p.name === 'width');
                        const heightProp = canvasWatchData.preview.properties.find(p => p.name === 'height');
                        if (widthProp) canvasWidth = widthProp.value;
                        if (heightProp) canvasHeight = heightProp.value;
                    }
                    console.log(`Captured canvas from variable with ${canvasWidth}x${canvasHeight}`);

                } else {
                    canvasCaptureError = callResult.exceptionDetails ? callResult.exceptionDetails.text : "Unknown error calling toDataURL.";
                    console.warn("Failed to get canvas DataURL via callFunctionOn:", canvasCaptureError);
                }
            } catch (e) {
                canvasCaptureError = `Error during callFunctionOn for canvas: ${e.message}`;
                console.error("Error during canvas capture evaluation via callFunctionOn:", e);
            }
        } else {
            canvasCaptureError = "No watched expression identified as an HTMLCanvasElement.";
            console.log(canvasCaptureError);
        }
        sendMessageToPopup({ type: 'canvasDataURL', dataURL: canvasDataURL, width: canvasWidth, height: canvasHeight, error: canvasCaptureError });
        // --- END NEW ADDITION: Capture Canvas Content ---

    } else if (method === "Debugger.resumed") {
        console.log("Debugger resumed.");
        sendMessageToPopup({ type: 'debuggerResumed' });
    }
}

// --- Handlers for Messages from UI (DevTools Panel or Popup) ---

// Handle messages from the DevTools Panel (e.g., "open-popup")
async function handleDevtoolsPanelMessage(message) {
    if (message.type === 'open-debugger-window') {
        if (!popupPort) { // Only open if one isn't already active
            console.log("Received request to open debugger window.");
            try {
                await chrome.windows.create({
                    url: chrome.runtime.getURL("popup/popup.html"),
                    type: "popup",
                    width: 900,
                    height: 700
                });
                sendMessageToDevtoolsPanel({ type: 'popupStatus', isOpen: true, message: 'Debugger Window opened.' });
            } catch (e) {
                console.error("Failed to open debugger window:", e);
                sendMessageToDevtoolsPanel({ type: 'status', message: `Failed to open window: ${e.message}`, error: true });
                sendMessageToDevtoolsPanel({ type: 'popupStatus', isOpen: false });
            }
        } else {
            console.log("Debugger window already open.");
            sendMessageToDevtoolsPanel({ type: 'popupStatus', isOpen: true, message: 'Debugger Window is already open.' });
        }
    }
}

// Handle messages from the Popup Window (e.g., step commands, add/remove watches)
async function handlePopupMessage(message) {
    if (message.type === 'debuggerCommand') {
        if (!debuggerAttached) {
            console.warn("Debugger not attached, cannot send command:", message.command);
            sendMessageToPopup({ type: 'error', message: "Debugger not attached. Please ensure the main DevTools is open." });
            return;
        }
        try {
            switch (message.command) {
                case 'stepOver':
                    await chrome.debugger.sendCommand({ tabId: currentTabId }, "Debugger.stepOver");
                    break;
                case 'stepInto':
                    await chrome.debugger.sendCommand({ tabId: currentTabId }, "Debugger.stepInto");
                    break;
                case 'stepOut':
                    await chrome.debugger.sendCommand({ tabId: currentTabId }, "Debugger.stepOut");
                    break;
                case 'resume':
                    await chrome.debugger.sendCommand({ tabId: currentTabId }, "Debugger.resume");
                    break;
                case 'pause':
                    await chrome.debugger.sendCommand({ tabId: currentTabId }, "Debugger.pause");
                    break;
                default:
                    console.warn("Unknown debugger command:", message.command);
            }
        } catch (e) {
            console.error(`Failed to send debugger command '${message.command}':`, e);
            sendMessageToPopup({ type: 'error', message: `Failed to send command '${message.command}': ${e.message}` });
        }
    } else if (message.type === 'addWatchExpression') {
        if (!watchedExpressions.includes(message.expression)) {
            watchedExpressions.push(message.expression);
            console.log("Added watch expression:", message.expression);
        }
    } else if (message.type === 'removeWatchExpression') {
        watchedExpressions = watchedExpressions.filter(expr => expr !== message.expression);
        console.log("Removed watch expression:", message.expression);
    }
}
