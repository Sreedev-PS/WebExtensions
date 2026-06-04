const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const showBtn = document.getElementById("showBtn");
const clearBtn = document.getElementById("clearBtn");

const statusEl = document.getElementById("status");
const jobsEl = document.getElementById("jobs");
const downloadTxtBtn = document.getElementById("downloadTxtBtn");
const downloadHtmlBtn = document.getElementById("downloadHtmlBtn");

startBtn.addEventListener("click", async () => {
  const maxPages = Number(document.getElementById("maxPagesInput").value);
  const keyword = document.getElementById("keywordInput").value.trim();

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  chrome.tabs.sendMessage(
    tab.id,
    {
      type: "START_SCAN",
      payload: {
        maxPages,
        keyword
      }
    },
    (response) => {
      if (chrome.runtime.lastError) {
        statusEl.innerText =
          "Error: Please reload Naukri page and try again.";
        return;
      }

      statusEl.innerText = response?.message || "Scan started";
    }
  );
});

stopBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  chrome.tabs.sendMessage(tab.id, { type: "STOP_SCAN" }, (response) => {
    if (chrome.runtime.lastError) {
      statusEl.innerText = "Error: Could not stop scan.";
      return;
    }

    statusEl.innerText = response?.message || "Stopped";
  });
});

showBtn.addEventListener("click", () => {
  chrome.storage.local.get(["latestAngularJobs"], (result) => {
    const jobs = result.latestAngularJobs || [];
    renderJobs(jobs);
  });
});

clearBtn.addEventListener("click", () => {
  chrome.storage.local.set({ latestAngularJobs: [] }, () => {
    jobsEl.innerHTML = "";
    statusEl.innerText = "Cleared saved jobs";
  });
});

function renderJobs(jobs) {
  if (!jobs.length) {
    jobsEl.innerHTML = "<p>No jobs saved yet.</p>";
    return;
  }

  jobsEl.innerHTML = jobs
    .map(
      (job, index) => `
      <div class="job-card">
        <h3>${index + 1}. ${escapeHtml(job.title)}</h3>
        <p><strong>Company:</strong> ${escapeHtml(job.company)}</p>
        <p><strong>Experience:</strong> ${escapeHtml(job.experience)}</p>
        <p><strong>Location:</strong> ${escapeHtml(job.location)}</p>
        <p><strong>Posted:</strong> ${escapeHtml(job.posted)}</p>
        <a href="${job.url}" target="_blank">Open Job</a>
      </div>
    `
    )
    .join("");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

downloadTxtBtn.addEventListener("click", () => {
  chrome.storage.local.get(["latestAngularJobs"], (result) => {
    const jobs = result.latestAngularJobs || [];

    if (!jobs.length) {
      statusEl.innerText = "No jobs available to download.";
      return;
    }

    const textContent = createTextFileContent(jobs);

    const blob = new Blob([textContent], {
      type: "text/plain"
    });

    const url = URL.createObjectURL(blob);

    const fileName = `naukri-angular-jobs-${getTodayDate()}.txt`;

    chrome.downloads.download({
      url,
      filename: fileName,
      saveAs: true
    });

    statusEl.innerText = "TXT file download started.";
  });
});

function createTextFileContent(jobs) {
  const lines = [];

  lines.push("Naukri Latest Angular Jobs");
  lines.push("==========================");
  lines.push(`Generated At: ${new Date().toLocaleString()}`);
  lines.push(`Total Jobs: ${jobs.length}`);
  lines.push("");

  jobs.forEach((job, index) => {
    lines.push(`${index + 1}. ${job.title}`);
    lines.push(`Company    : ${job.company}`);
    lines.push(`Experience : ${job.experience}`);
    lines.push(`Location   : ${job.location}`);
    lines.push(`Posted     : ${job.posted}`);
    lines.push(`Link       : ${job.url}`);
    lines.push("----------------------------------------");
  });

  return lines.join("\n");
}

function getTodayDate() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

downloadHtmlBtn.addEventListener("click", () => {
  chrome.storage.local.get(["latestAngularJobs"], (result) => {
    const jobs = result.latestAngularJobs || [];

    if (!jobs.length) {
      statusEl.innerText = "No jobs available to download.";
      return;
    }

    const htmlContent = createHtmlFileContent(jobs);

    const blob = new Blob([htmlContent], {
      type: "text/html"
    });

    const url = URL.createObjectURL(blob);

    const fileName = `naukri-angular-jobs-${getTodayDate()}.html`;

    chrome.downloads.download({
      url,
      filename: fileName,
      saveAs: true
    });

    statusEl.innerText = "HTML file download started.";
  });
});
function createHtmlFileContent(jobs) {
  const rows = jobs
    .map((job, index) => {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(job.title)}</td>
          <td>${escapeHtml(job.company)}</td>
          <td>${escapeHtml(job.experience)}</td>
          <td>${escapeHtml(job.location)}</td>
          <td>${escapeHtml(job.posted)}</td>
          <td>
            <a href="${job.url}" target="_blank">Open Job</a>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Naukri Latest Angular Jobs</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
    }

    h1 {
      margin-bottom: 5px;
    }

    .summary {
      margin-bottom: 20px;
      color: #555;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #f2f2f2;
    }

    a {
      color: #0645ad;
      font-weight: bold;
    }
  </style>
</head>

<body>
  <h1>Naukri Latest Angular Jobs</h1>

  <div class="summary">
    <p><strong>Generated At:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Total Jobs:</strong> ${jobs.length}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>No</th>
        <th>Title</th>
        <th>Company</th>
        <th>Experience</th>
        <th>Location</th>
        <th>Posted</th>
        <th>Link</th>
      </tr>
    </thead>

    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>
  `;
}

function getTodayDate() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}