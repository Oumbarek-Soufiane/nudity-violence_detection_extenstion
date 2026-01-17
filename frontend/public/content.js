/* public/content.js */
console.log("🛡️ SafeSurf Content Script Active");

let isProtectionEnabled = true;
const processedImages = new Set();
const imageQueue = [];
let isProcessing = false;
let requestDelay = 2000; // Start with 2 seconds

// Load Settings
if (chrome.storage) {
    chrome.storage.local.get(['protectionEnabled'], (result) => {
        if (result.protectionEnabled === false) isProtectionEnabled = false;
    });
}

// 1. Observer to find images
const observer = new MutationObserver((mutations) => {
    if (!isProtectionEnabled) return;
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.tagName === 'IMG') queueImage(node);
            if (node.querySelectorAll) node.querySelectorAll('img').forEach(queueImage);
        });
    });
});
observer.observe(document.body, { childList: true, subtree: true });
document.querySelectorAll('img').forEach(queueImage);

function queueImage(img) {
    if (img.width < 100 || img.height < 100) return;
    if (processedImages.has(img.src)) return;
    
    // Visual indicator that it's queued
    img.style.filter = "blur(15px) grayscale(100%)";
    img.style.transition = "filter 0.5s";
    
    imageQueue.push(img);
    processedImages.add(img.src);
    
    // Trigger processor if not running
    if (!isProcessing) processQueue();
}

// 2. The Smart Processor
async function processQueue() {
    if (imageQueue.length === 0) {
        isProcessing = false;
        return;
    }
    
    isProcessing = true;
    const img = imageQueue[0]; // Peek at the first image (don't remove yet)

    try {
        console.log(`Processing image... (Queue: ${imageQueue.length})`);
        await analyzeImage(img);
        
        // SUCCESS: Remove image from queue and reset speed
        imageQueue.shift(); 
        requestDelay = 2000; // Reset to 2 seconds
        
    } catch (err) {
        if (err.message === "Rate Limit") {
            console.warn("⚠️ Rate Limit Hit! Pausing for 15 seconds...");
            requestDelay = 15000; // SLOW DOWN massively
            // Do NOT remove image from queue, we will retry it
        } else {
            console.error("Skipping image due to error:", err);
            img.style.filter = "none"; // Unblur if broken
            imageQueue.shift(); // Remove broken image
        }
    }

    // Schedule next processing
    setTimeout(processQueue, requestDelay);
}

async function analyzeImage(img) {
    // OLD WAY: getBase64Image(img.src) <-- This was failing!
    
    // NEW WAY: Just send the URL
    console.log("Sending URL to server:", img.src);

    const response = await fetch('http://localhost:3002/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            imageUrl: img.src, // <--- Sending URL instead of massive Base64 string
            mimeType: "image/jpeg" 
        })
    });

    if (response.status === 429) {
        throw new Error("Rate Limit");
    }

    if (!response.ok) {
        // If server failed to download (e.g. broken link), just unblur it
        throw new Error("Server failed to process image");
    }

    const data = await response.json();

    if (data.result && data.result.recommendation === 'SAFE') {
        img.style.filter = "none";
        updateStats('scanned');
    } else {
        img.style.border = "5px solid red";
        updateStats('blocked');
    }
}

async function getBase64Image(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
        });
    } catch(e) { return null; }
}

function updateStats(type) {
    if (chrome.storage) {
        chrome.storage.local.get(['scannedCount', 'blockedCount'], (res) => {
            const key = type === 'scanned' ? 'scannedCount' : 'blockedCount';
            const newCount = (res[key] || 0) + 1;
            chrome.storage.local.set({ [key]: newCount });
        });
    }
}