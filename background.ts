// Nukari Profile Auto-Updater Background Script


// ...existing code...
let autoUpdateInterval: number | undefined;

chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  if (message.action === 'startAutoUpdate') {
    if (!autoUpdateInterval) {
      autoUpdateInterval = setInterval(() => {
        updateProfileDescription();
        setTimeout(revertProfileDescription, 5000); // Revert after 5 seconds
        updateResume();
      }, 20000);
    }
  }
  // ...existing code...
});

function updateProfileDescription() {
  // Send message to content script to add a dot to description
  chrome.tabs.query({ url: "https://www.naukri.com/mnjuser/profile*" }, function(tabs: any[]) {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "updateDescription", addDot: true });
    }
  });
}

function revertProfileDescription() {
  // Send message to content script to remove the dot from description
  chrome.tabs.query({ url: "https://www.naukri.com/mnjuser/profile*" }, function(tabs: any[]) {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "updateDescription", addDot: false });
    }
  });
}

function updateResume() {
  // Automatically read and upload the resume file from the resume folder
  const fileName = 'resume/Sreedev P S -Resume';
  fetch(chrome.runtime.getURL(fileName))
    .then(response => response.arrayBuffer())
    .then(resumeData => {
      chrome.tabs.query({ url: "https://www.naukri.com/mnjuser/profile*" }, function(tabs: any[]) {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "uploadResume", resumeData });
        }
      });
    })
    .catch(error => {
      console.error('Resume file not found or could not be read:', error);
    });
}
