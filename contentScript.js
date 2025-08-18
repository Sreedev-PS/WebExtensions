"use strict";
// Content script for Naukri profile automation
function updateResumeHeadline(addDot) {
    // Click the Resume Headline edit icon
    const headlineSection = document.getElementById('lazyResumeHead');
    if (headlineSection) {
        const editIcon = headlineSection.querySelector('.edit.icon');
        if (editIcon) {
            editIcon.click();
            setTimeout(() => {
                // Find the resume headline popup textarea
                const headlineInput = document.getElementById('resumeHeadlineTxt');
                if (headlineInput) {
                    let value = headlineInput.value;
                    if (addDot) {
                        if (!value.endsWith('.')) {
                            headlineInput.value = value + '.';
                        }
                    }
                    else {
                        if (value.endsWith('.')) {
                            headlineInput.value = value.slice(0, -1);
                        }
                    }
                    // Find and click the save button in the popup
                    const form = headlineInput.closest('form');
                    if (form) {
                        const saveBtn = form.querySelector('button[type="submit"]');
                        if (saveBtn) {
                            saveBtn.click();
                        }
                    }
                }
            }, 500); // Wait for popup to open
        }
    }
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateDescription') {
        updateResumeHeadline(message.addDot);
    }
    // ...existing code...
});
