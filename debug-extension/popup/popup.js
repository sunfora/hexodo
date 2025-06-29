// popup/popup.js

const statusDiv = document.getElementById('status');
const visualCanvas = document.getElementById('visualCanvas');
const ctx = visualCanvas.getContext('2d');

const stepOverBtn = document.getElementById('step-over-btn');
const stepIntoBtn = document.getElementById('step-into-btn');
const stepOutBtn = document.getElementById('step-out-btn');
const resumeBtn = document.getElementById('resume-btn');
const pauseBtn = document.getElementById('pause-btn');

// Watcher elements
const watchExpressionInput = document.getElementById('watch-expression-input');
const addWatchBtn = document.getElementById('add-watch-btn');
const watchedExpressionsDisplay = document.getElementById('watched-expressions-display');

let img = new Image();
let updateFrame = false;
img.onload = () => {
  console.log("image loaded");
  updateFrame = true;
}

// Store active watch expressions (to know what to request from backend)
let activeWatchExpressions = new Set();
let lastWatchedData = {};

// --- Establish Communication with devtools-page.js ---
const devtoolsPagePort = chrome.runtime.connect({ name: "debugger-visualizer-popup" });

devtoolsPagePort.onMessage.addListener(message => {
    // console.log("Message from devtools-page:", message); // Uncomment for debugging

    switch (message.type) {
        case 'status':
            statusDiv.textContent = message.message;
            statusDiv.className = 'status ' + (message.error ? 'error' : 'info');
            break;
        case 'debuggerPaused':
            statusDiv.textContent = 'Debugger paused. Updating visuals...';
            statusDiv.className = 'status warning';
            setControlButtonsState(true); // Enable step/resume buttons
            break;
        case 'debuggerResumed':
            statusDiv.textContent = 'Debugger resumed.';
            statusDiv.className = 'status success';
            setControlButtonsState(false); // Disable step/resume buttons
            lastWatchedData = {}; // Clear stored data
            renderWatchedExpressions();
            break;
        case 'watchedData':
            lastWatchedData = message.data; // Store the data
            renderWatchedExpressions(message.data); // Update watch display with new values
            // No longer calling drawCustomVisualization directly here.
            // It will be called after canvasDataURL is received.
            break;
        case 'canvasDataURL': // <<< NEW CASE HERE <<<
            if (message.dataURL) {
                img.src = message.dataURL;
            }
            break;
        case 'error':
            statusDiv.textContent = `Error: ${message.message}`;
            statusDiv.className = 'status error';
            break;
    }
    window.focus();
});

devtoolsPagePort.onDisconnect.addListener(() => {
    console.warn("Connection to devtools-page.js lost from popup.js side.");
    statusDiv.textContent = 'Connection to debugger backend lost. Please close and re-open this window via DevTools.';
    statusDiv.className = 'status error';
    setControlButtonsState(false, true); // Disable all buttons
});


// --- UI Event Listeners (Sending Commands to devtools-page.js) ---
stepOverBtn.addEventListener('click', () => sendDebuggerCommand('stepOver'));
stepIntoBtn.addEventListener('click', () => sendDebuggerCommand('stepInto'));
stepOutBtn.addEventListener('click', () => sendDebuggerCommand('stepOut'));
resumeBtn.addEventListener('click', () => sendDebuggerCommand('resume'));
pauseBtn.addEventListener('click', () => sendDebuggerCommand('pause'));

let skipOver = true;

window.addEventListener('keypress', (e) => {
  if (skipOver) {
    if (e.key.toLowerCase() === 'n') {
      sendDebuggerCommand('stepOver');
    } else if (e.key.toLowerCase() === 'i') {
      e.preventDefault(); 
      sendDebuggerCommand('stepInto');
    } else if (e.key.toLowerCase() === 'o') {
      e.preventDefault(); 
      sendDebuggerCommand('stepOut');
    } else if (e.key.toLowerCase() === 'r') {
      e.preventDefault(); 
      sendDebuggerCommand('resume');
    } else if (e.key.toLowerCase() === 'p') {
      e.preventDefault(); 
      sendDebuggerCommand('pause');
    }
  }
});

watchExpressionInput.addEventListener('focus', (e) => {
  skipOver = false;
});
watchExpressionInput.addEventListener('blur', (e) => {
  skipOver = true;
});

addWatchBtn.addEventListener('click', addWatchExpression);
watchExpressionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission if input is in a form
        addWatchExpression();
    }
});
watchedExpressionsDisplay.addEventListener('click', (e) => {
    if (e.target.classList.contains('watch-item-remove-btn')) {
        removeWatchExpression(e.target.dataset.expression);
    }
});


function sendDebuggerCommand(command) {
    if (devtoolsPagePort) {
        devtoolsPagePort.postMessage({ type: 'debuggerCommand', command: command });
    } else {
        statusDiv.textContent = 'Connection to debugger lost. Please re-open DevTools and this window.';
        statusDiv.className = 'status error';
        console.error("Attempting to send command on a disconnected port to devtools-page.");
        setControlButtonsState(false, true);
    }
}

function setControlButtonsState(paused) {
    stepOverBtn.disabled = !paused;
    stepIntoBtn.disabled = !paused;
    stepOutBtn.disabled = !paused;
    resumeBtn.disabled = !paused;
    pauseBtn.disabled = paused; // Pause button is disabled when already paused
}

// Initial state for buttons
setControlButtonsState(false); // Initially debugger is not paused


// --- Utility for HTML escaping ---
function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}


// --- Watch Expression Logic ---
function addWatchExpression() {
    const expression = watchExpressionInput.value.trim();
    if (expression && !activeWatchExpressions.has(expression)) {
        activeWatchExpressions.add(expression);
        devtoolsPagePort.postMessage({ type: 'addWatchExpression', expression: expression });
        watchExpressionInput.value = ''; // Clear input
        renderWatchedExpressions(lastWatchedData); // Re-render to show new expression (with last known data)
    }
}

function removeWatchExpression(expression) {
    if (activeWatchExpressions.has(expression)) {
        activeWatchExpressions.delete(expression);
        if (lastWatchedData[expression]) {
            delete lastWatchedData[expression];
        }
        devtoolsPagePort.postMessage({ type: 'removeWatchExpression', expression: expression });
        renderWatchedExpressions(lastWatchedData);
        // We do NOT call drawCustomVisualization here, as we wait for debuggerPaused event
        // to re-capture and re-draw everything consistently.
    }
}

function renderWatchedExpressions(evaluatedData = {}) {
    let html = '';
    if (activeWatchExpressions.size === 0) {
        html = '<p>No watch expressions added.</p>';
    } else {
        activeWatchExpressions.forEach(expr => {
            const data = evaluatedData[expr];
            let valueToDisplay = '...';
            let valueClass = '';

            if (data) {
                if (data.error) {
                    valueToDisplay = `Error: ${data.error}`;
                    valueClass = 'error-value';
                } else if (data.preview && data.preview.description) {
                    valueToDisplay = data.preview.description;
                    valueClass = 'object-value';
                } else if (data.value !== undefined) {
                    valueToDisplay = String(data.value);
                    valueClass = 'primitive-value';
                } else {
                    valueToDisplay = `(${data.type || 'unknown'})`;
                    valueClass = 'unknown-value';
                }
            }

            html += `
                <div class="watch-item">
                    <span class="watch-item-name">${escapeHTML(expr)}:</span>
                    <span class="watch-item-value ${valueClass}">${escapeHTML(valueToDisplay)}</span>
                    <button class="watch-item-remove-btn" data-expression="${escapeHTML(expr)}">&times;</button>
                </div>
            `;
        });
    }
    watchedExpressionsDisplay.innerHTML = html;
}

let canvasFrame = null;
function loop() {
  if (canvasFrame) {
    cancelAnimationFrame(canvasFrame); 
    canvasFrame = null;
  }
  if (updateFrame) {
    const wdth = img.naturalWidth;
    const hght = img.naturalHeight;
    visualCanvas.style.width = `${Math.round(wdth / 2)}px`;
    visualCanvas.style.height = `${Math.round(hght / 2)}px`;
    visualCanvas.width = wdth;
    visualCanvas.height = hght;
    ctx.clearRect(0, 0, wdth, hght);
    ctx.drawImage(img, 0, 0, wdth, hght);
    updateFrame = false;
  }
  canvasFrame = requestAnimationFrame(loop);
}
// Initial canvas setup
visualCanvas.width = visualCanvas.clientWidth;
visualCanvas.height = visualCanvas.clientHeight;
ctx.clearRect(0, 0, visualCanvas.width, visualCanvas.height);
renderWatchedExpressions(); // Initial render for watchers

requestAnimationFrame(loop);
