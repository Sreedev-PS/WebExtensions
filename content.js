// Content Script - Runs on Naukri pages
let currentHeadline = '';

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateHeadline') {
    updateResumeHeadline(request.headline);
    sendResponse({ status: 'updated' });
  } else if (request.action === 'autoUpdateStarted') {
    console.log('Auto-update started');
    sendResponse({ status: 'acknowledged' });
  } else if (request.action === 'autoUpdateStopped') {
    console.log('Auto-update stopped');
    sendResponse({ status: 'acknowledged' });
  }
});

function updateResumeHeadline(newHeadline) {
  try {
    // Method 1: Look for resume headline input field
    const headlineInputs = document.querySelectorAll(
      'textarea[name*="headline"], textarea[data-fieldname*="headline"], input[name*="headline"]'
    );
    
    if (headlineInputs.length > 0) {
      headlineInputs.forEach(input => {
        input.value = newHeadline;
        // Trigger change events
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      currentHeadline = newHeadline;
      console.log('Headline updated via input:', newHeadline);
      return;
    }

    // Method 2: Look for contenteditable divs (Naukri sometimes uses these)
    const editableDivs = document.querySelectorAll('[contenteditable="true"]');
    for (let div of editableDivs) {
      if (div.innerText.length > 50 && div.innerText.length < 500) {
        div.innerText = newHeadline;
        div.dispatchEvent(new Event('input', { bubbles: true }));
        currentHeadline = newHeadline;
        console.log('Headline updated via contenteditable:', newHeadline);
        return;
      }
    }

    // Method 3: Look for the edit button and trigger modal
    const editButtons = Array.from(document.querySelectorAll('span.edit, i.edit'))
      .filter(btn => btn.closest('.resumeHeadline') || btn.closest('[class*="headline"]'));
    
    if (editButtons.length > 0) {
      editButtons[0].click();
      
      // Wait for modal and update
      setTimeout(() => {
        const modalInputs = document.querySelectorAll(
          '.profileEditDrawer textarea, .profileEditDrawer input[type="text"]'
        );
        if (modalInputs.length > 0) {
          modalInputs[0].value = newHeadline;
          modalInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
          modalInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
          
          // Find and click save button
          const saveBtn = document.querySelector(
            '.profileEditDrawer .save-btn, .profileEditDrawer button[type="submit"]'
          );
          if (saveBtn) {
            saveBtn.click();
          }
          currentHeadline = newHeadline;
          console.log('Headline updated via modal:', newHeadline);
        }
      }, 500);
    }

  } catch (error) {
    console.error('Error updating headline:', error);
  }
}

// Notify background about page load
window.addEventListener('load', () => {
  chrome.runtime.sendMessage({ action: 'pageLoaded' }).catch(() => {});
});
