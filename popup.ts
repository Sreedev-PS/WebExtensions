// Nukari Profile Auto-Updater Popup Script

// ...existing code...

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startUpdate');
  const status = document.getElementById('status');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'startAutoUpdate' });
      if (status) status.textContent = 'Running';
    });
  }

  // ...existing code...
});
// Nukari Profile Auto-Updater Popup Script

document.getElementById('uploadResume')?.addEventListener('click', () => {
  const fileInput = document.getElementById('resumeFile') as HTMLInputElement;
  if (fileInput.files && fileInput.files[0]) {
    // TODO: Send file to background script for upload
  }
});
