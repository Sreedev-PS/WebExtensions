// Background Service Worker
let isAutoUpdating = false;
let updateInterval = null;
let headlines = [];
let currentHeadlineIndex = 0;

// Load headlines from storage
chrome.storage.local.get(['headlines', 'isAutoUpdating'], (result) => {
  headlines = result.headlines || [
    "Experienced Developer III Software Engineer with expertise in Angular, JavaScript, TypeScript",
    "Full-stack Developer - Angular & Node.js Specialist",
    "Software Engineer - Web Development & Problem Solving Expert",
    "Developer III - Building scalable web applications with modern tech stack"
  ];
  isAutoUpdating = result.isAutoUpdating || false;
  
  if (isAutoUpdating) {
    startAutoUpdate();
  }
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startAutoUpdate') {
    startAutoUpdate();
    sendResponse({ status: 'started' });
  } else if (request.action === 'stopAutoUpdate') {
    stopAutoUpdate();
    sendResponse({ status: 'stopped' });
  } else if (request.action === 'updateHeadlines') {
    headlines = request.headlines;
    chrome.storage.local.set({ headlines: headlines });
    sendResponse({ status: 'updated' });
  } else if (request.action === 'getStatus') {
    sendResponse({ 
      isRunning: isAutoUpdating,
      currentHeadline: headlines[currentHeadlineIndex],
      totalHeadlines: headlines.length
    });
  }
});

function startAutoUpdate() {
  if (isAutoUpdating) return;
  
  isAutoUpdating = true;
  chrome.storage.local.set({ isAutoUpdating: true });
  
  // Update immediately
  updateHeadlineOnNaukri();
  
  // Then update every 10 seconds
  updateInterval = setInterval(() => {
    updateHeadlineOnNaukri();
  }, 10000);
  
  // Notify all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: 'autoUpdateStarted' }).catch(() => {});
    });
  });
}

function stopAutoUpdate() {
  isAutoUpdating = false;
  chrome.storage.local.set({ isAutoUpdating: false });
  
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  
  // Notify all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: 'autoUpdateStopped' }).catch(() => {});
    });
  });
}

function updateHeadlineOnNaukri() {
  if (headlines.length === 0) return;
  
  // Get current active tab and send update request
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const headline = headlines[currentHeadlineIndex];
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'updateHeadline', headline: headline },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log('Tab not ready yet');
          }
        }
      );
      
      // Move to next headline
      currentHeadlineIndex = (currentHeadlineIndex + 1) % headlines.length;
    }
  });
}
