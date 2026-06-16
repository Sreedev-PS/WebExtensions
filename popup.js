const $ = (id) => document.getElementById(id);

function getOptions() {
  return {
    keywords: $('keywords').value
      .split(/[\n,]+/)
      .map(x => x.trim())
      .filter(Boolean),

    location: $('location').value.trim(),
    pages: Number($('pages').value || 1),
    delay: Number($('delay').value || 1800),
    mode: $('mode').value
  };
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    throw new Error('No active tab found');
  }

  return tab;
}

function isLinkedInJobsTab(tab) {
  return tab.url && tab.url.startsWith('https://www.linkedin.com/jobs');
}

async function ensureContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js']
  });
}

async function sendToActiveTab(message) {
  const tab = await getActiveTab();

  if (!isLinkedInJobsTab(tab)) {
    throw new Error('Open LinkedIn jobs page first.');
  }

  await ensureContentScript(tab.id);

  return chrome.tabs.sendMessage(tab.id, message);
}

async function refreshStatus() {
  try {
    const res = await sendToActiveTab({
      type: 'LI_JOB_FINDER_STATUS'
    });

    $('status').textContent = res?.status || 'Ready.';
  } catch (e) {
    $('status').textContent = 'Open LinkedIn jobs page first, then click Start.';
  }
}

$('start').addEventListener('click', async () => {
  $('status').textContent = 'Starting...';

  try {
    const res = await sendToActiveTab({
      type: 'LI_JOB_FINDER_START',
      options: getOptions()
    });

    $('status').textContent = res?.status || 'Started.';
  } catch (e) {
    $('status').textContent = 'Error: ' + e.message;
  }
});

$('stop').addEventListener('click', async () => {
  try {
    const res = await sendToActiveTab({
      type: 'LI_JOB_FINDER_STOP'
    });

    $('status').textContent = res?.status || 'Stopped.';
  } catch (e) {
    $('status').textContent = 'Error: ' + e.message;
  }
});

$('downloadCsv').addEventListener('click', async () => {
  try {
    const res = await sendToActiveTab({
      type: 'LI_JOB_FINDER_DOWNLOAD_CSV'
    });

    $('status').textContent = res?.status || 'Downloaded CSV.';
  } catch (e) {
    $('status').textContent = 'Error: ' + e.message;
  }
});

$('downloadHtml').addEventListener('click', async () => {
  try {
    const res = await sendToActiveTab({
      type: 'LI_JOB_FINDER_DOWNLOAD_HTML'
    });

    $('status').textContent = res?.status || 'Downloaded HTML.';
  } catch (e) {
    $('status').textContent = 'Error: ' + e.message;
  }
});

$('clearSaved').addEventListener('click', async () => {
  const ok = confirm('Clear all saved LinkedIn jobs?');

  if (!ok) return;

  try {
    const res = await sendToActiveTab({
      type: 'LI_JOB_FINDER_CLEAR_SAVED'
    });

    $('status').textContent = res?.status || 'Saved jobs cleared.';
  } catch (e) {
    $('status').textContent = 'Error: ' + e.message;
  }
});

setInterval(refreshStatus, 2000);
refreshStatus();