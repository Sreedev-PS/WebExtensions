// Popup Script
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const addHeadlineBtn = document.getElementById('addHeadlineBtn');
const headlineInput = document.getElementById('headlineInput');
const headlinesList = document.getElementById('headlinesList');
const statusEl = document.getElementById('status');
const currentHeadlineEl = document.getElementById('currentHeadline');

let headlines = [];

// Initialize
loadHeadlines();
updateStatus();

startBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'startAutoUpdate' }, (response) => {
    updateStatus();
  });
});

stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'stopAutoUpdate' }, (response) => {
    updateStatus();
  });
});

addHeadlineBtn.addEventListener('click', () => {
  const headline = headlineInput.value.trim();
  if (headline.length > 0) {
    headlines.push(headline);
    saveHeadlines();
    headlineInput.value = '';
    renderHeadlines();
  }
});

headlineInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addHeadlineBtn.click();
  }
});

function loadHeadlines() {
  chrome.storage.local.get(['headlines'], (result) => {
    headlines = result.headlines || [
      "Experienced Developer III Software Engineer with expertise in Angular, JavaScript, TypeScript",
      "Full-stack Developer - Angular & Node.js Specialist",
      "Software Engineer - Web Development & Problem Solving Expert",
      "Developer III - Building scalable web applications with modern tech stack"
    ];
    renderHeadlines();
  });
}

function saveHeadlines() {
  chrome.runtime.sendMessage(
    { action: 'updateHeadlines', headlines: headlines },
    (response) => {
      loadHeadlines();
    }
  );
}

function renderHeadlines() {
  headlinesList.innerHTML = '';
  headlines.forEach((headline, index) => {
    const item = document.createElement('div');
    item.className = 'headline-item';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'headline-text';
    textDiv.textContent = headline;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      headlines.splice(index, 1);
      saveHeadlines();
    });
    
    item.appendChild(textDiv);
    item.appendChild(removeBtn);
    headlinesList.appendChild(item);
  });
}

function removeHeadline(index) {
  headlines.splice(index, 1);
  saveHeadlines();
}

function updateStatus() {
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    if (response) {
      statusEl.textContent = response.isRunning ? '🟢 Running' : '🔴 Stopped';
      startBtn.disabled = response.isRunning;
      stopBtn.disabled = !response.isRunning;
      
      if (response.currentHeadline) {
        currentHeadlineEl.textContent = response.currentHeadline;
      }
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Update status every 2 seconds
setInterval(updateStatus, 2000);
