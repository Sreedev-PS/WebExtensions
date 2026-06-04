let isScanning = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "START_SCAN") {
    const { maxPages, keyword } = request.payload;

    if (isScanning) {
      sendResponse({ message: "Already scanning..." });
      return true;
    }

    isScanning = true;

    scanNaukriPages({
      maxPages: Number(maxPages) || 5,
      keyword: keyword || "angular"
    });

    sendResponse({ message: "Scan started..." });
    return true;
  }

  if (request.type === "STOP_SCAN") {
    isScanning = false;
    sendResponse({ message: "Scan stopped" });
    return true;
  }
});

async function scanNaukriPages({ maxPages, keyword }) {
  let page = 1;

  console.log("Naukri scan started");

  await applyDateSort();
  await applyLastOneDayFreshnessFilter();

  while (isScanning && page <= maxPages) {
    console.log("Scanning page:", page);

    await wait(2500);
    await scrollToBottom();
    await wait(1000);

    const jobs = extractJobsFromSearchPage(keyword);

    console.log("Latest jobs found on this page:", jobs);

    await saveJobs(jobs);

    const nextClicked = await clickNextButton();

    if (!nextClicked) {
      console.log("Next button not found. Scan stopped.");
      isScanning = false;
      break;
    }

    page++;

    await wait(4000);
  }

  isScanning = false;

  console.log("Naukri scan completed");
}

async function applyDateSort() {
  const sortButton = document.querySelector("#filter-sort");

  if (!sortButton) {
    console.log("Sort button not found");
    return false;
  }

  const currentSortText = cleanText(sortButton.innerText).toLowerCase();

  if (currentSortText.includes("date")) {
    console.log("Already sorted by date");
    return true;
  }

  sortButton.click();

  await wait(700);

  const dateOption = [...document.querySelectorAll("[data-filter-id='sort'] a")]
    .find((item) => {
      return cleanText(item.innerText).toLowerCase() === "recommended";
    });

  if (!dateOption) {
    console.log("Date option not found");
    return false;
  }

  dateOption.click();

  console.log("Sort applied: Date");

  await wait(3000);

  return true;
}

async function applyLastOneDayFreshnessFilter() {
  const freshnessButton = document.querySelector("#filter-freshness");

  if (!freshnessButton) {
    console.log("Freshness button not found");
    return false;
  }

  const currentFreshnessText = cleanText(freshnessButton.innerText).toLowerCase();

  if (currentFreshnessText.includes("last 1 day")) {
    console.log("Freshness already set: Last 1 day");
    return true;
  }

  freshnessButton.click();

  await wait(700);

  const lastOneDayOption = [
    ...document.querySelectorAll("[data-filter-id='freshness'] a")
  ].find((item) => {
    return cleanText(item.innerText).toLowerCase() === "last 1 day";
  });

  if (!lastOneDayOption) {
    console.log("Last 1 day option not found");
    return false;
  }

  lastOneDayOption.click();

  console.log("Freshness applied: Last 1 day");

  await wait(3000);

  return true;
}

function extractJobsFromSearchPage(keyword) {
  const jobCards = getNaukriJobCards();
  const jobs = [];

  console.log("Total job cards found:", jobCards.length);

  jobCards.forEach((card) => {
    const titleElement = card.querySelector("a.title");
    const companyElement = card.querySelector(".comp-name");
    const expElement = card.querySelector(".expwdth");
    const locationElement = card.querySelector(".locWdth");
    const postedElement = card.querySelector(".job-post-day");

    const title = cleanText(titleElement?.innerText);
    const company = cleanText(companyElement?.innerText);
    const experience = cleanText(expElement?.innerText);
    const location = cleanText(locationElement?.innerText);
    const posted = cleanText(postedElement?.innerText);
    const url = titleElement?.href;

    const fullText = cleanText(card.innerText).toLowerCase();

    const hasKeyword = fullText.includes(keyword.toLowerCase());
    const isLatest = isLatestPostedTime(posted);

    if (!hasKeyword || !isLatest || !url) {
      return;
    }

    jobs.push({
      title,
      company,
      experience,
      location,
      posted,
      url,
      jobId: card.getAttribute("data-job-id"),
      capturedAt: new Date().toISOString()
    });
  });

  return jobs;
}

function getNaukriJobCards() {
  return [...document.querySelectorAll(".srp-jobtuple-wrapper")];
}

function isLatestPostedTime(postedText) {
  const value = cleanText(postedText).toLowerCase();

  return (
    value.includes("just now") ||
    value.includes("minute") ||
    value.includes("few hours") ||
    value.includes("hour") ||
    value.includes("today")
  );
}

async function saveJobs(newJobs) {
  if (!newJobs.length) {
    return;
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(["latestAngularJobs"], (result) => {
      const oldJobs = result.latestAngularJobs || [];
      const mergedJobs = [...oldJobs];

      newJobs.forEach((newJob) => {
        const alreadyExists = mergedJobs.some((oldJob) => {
          return oldJob.url === newJob.url;
        });

        if (!alreadyExists) {
          mergedJobs.push(newJob);
        }
      });

      chrome.storage.local.set(
        {
          latestAngularJobs: mergedJobs
        },
        resolve
      );
    });
  });
}

async function scrollToBottom() {
  const scrollStep = 700;
  const delay = 400;

  let previousHeight = 0;
  let sameHeightCount = 0;

  while (isScanning) {
    window.scrollBy(0, scrollStep);

    await wait(delay);

    const currentHeight = document.body.scrollHeight;

    if (currentHeight === previousHeight) {
      sameHeightCount++;
    } else {
      sameHeightCount = 0;
      previousHeight = currentHeight;
    }

    if (sameHeightCount >= 3) {
      break;
    }
  }

  window.scrollTo(0, document.body.scrollHeight);
}

async function clickNextButton() {
  window.scrollTo(0, document.body.scrollHeight);

  await wait(1000);

  const pagination = document.querySelector(".styles_pagination-cont__sWhS6");

  if (!pagination) {
    console.log("Pagination not found");
    return false;
  }

  const nextLink = [...pagination.querySelectorAll("a")].find((link) => {
    return cleanText(link.innerText).toLowerCase().includes("next");
  });

  if (!nextLink) {
    console.log("Next link not found");
    return false;
  }

  nextLink.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  await wait(700);

  nextLink.click();

  return true;
}

function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}