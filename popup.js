"use strict";
// Nukari Profile Auto-Updater Popup Script
var _a;
// ...existing code...
document.addEventListener('DOMContentLoaded', () => {
    var _a;
    const startBtn = document.getElementById('startUpdate');
    const status = document.getElementById('status');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'startAutoUpdate' });
            if (status)
                status.textContent = 'Running';
        });
    }
    (_a = document.getElementById('uploadResume')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
        const fileInput = document.getElementById('resumeFile');
        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                var _a;
                chrome.runtime.sendMessage({ action: 'uploadResume', data: (_a = e.target) === null || _a === void 0 ? void 0 : _a.result });
            };
            reader.readAsArrayBuffer(fileInput.files[0]);
        }
    });
});
// Nukari Profile Auto-Updater Popup Script
(_a = document.getElementById('uploadResume')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
    const fileInput = document.getElementById('resumeFile');
    if (fileInput.files && fileInput.files[0]) {
        // TODO: Send file to background script for upload
    }
});
