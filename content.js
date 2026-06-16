(() => {
  if (window.__LI_JOB_FINDER_INSTALLED__) return;
  window.__LI_JOB_FINDER_INSTALLED__ = true;

  const STORAGE_KEY = 'linkedinJobFinder.savedJobs.v1';

  const state = {
    running: false,
    jobs: [],
    seen: new Set(),
    status: 'Ready.',
    stopRequested: false,
    storageLoaded: false
  };

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  function normalizeText(text = '') {
    return String(text)
      .replace(/\s+/g, ' ')
      .replace(/\u00a0/g, ' ')
      .trim();
  }

  function csvEscape(value) {
    const str = String(value ?? '');
    return /[",\n]/.test(str)
      ? '"' + str.replace(/"/g, '""') + '"'
      : str;
  }

  function getJobKey(job) {
    return (
      job.link ||
      `${job.title}|${job.company}|${job.location}|${job.posted}`
    ).toLowerCase();
  }

  async function loadSavedJobsFromStorage() {
    if (state.storageLoaded) return;

    const result = await chrome.storage.local.get([STORAGE_KEY]);

    const savedJobs = Array.isArray(result[STORAGE_KEY])
      ? result[STORAGE_KEY]
      : [];

    state.jobs = savedJobs;
    state.seen = new Set(savedJobs.map(getJobKey));
    state.storageLoaded = true;

    state.status = `Loaded saved jobs: ${state.jobs.length}`;
  }

  async function persistSavedJobs() {
    await chrome.storage.local.set({
      [STORAGE_KEY]: state.jobs
    });
  }

  async function clearSavedJobs() {
    state.jobs = [];
    state.seen = new Set();
    state.storageLoaded = true;

    await chrome.storage.local.remove(STORAGE_KEY);

    state.status = 'Saved jobs cleared.';
  }

  function isPostedToday(postedText = '') {
    const text = normalizeText(postedText).toLowerCase();

    if (!text) return false;

    return (
      /\btoday\b/.test(text) ||
      /\bjust now\b/.test(text) ||
      /\b\d+\s+minutes?\s+ago\b/.test(text) ||
      /\b\d+\s+hours?\s+ago\b/.test(text)

      // Testing only:
      // || /\b1\s+week\s+ago\b/.test(text)
    );
  }

  function getSearchKeywordsFromOptions(keyword = '') {
    return String(keyword || '')
      .split(/[\n,]+/)
      .map(x => x.trim().toLowerCase())
      .filter(Boolean);
  }

  function isKeywordMatched(job, keyword = '') {
    const keywords = getSearchKeywordsFromOptions(keyword);

    if (!keywords.length) return true;

    const searchText = [
      job.title,
      job.company,
      job.location
    ].join(' ').toLowerCase();

    return keywords.some(k => searchText.includes(k));
  }

  function realClick(element) {
    if (!element) return false;

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });

    const rect = element.getBoundingClientRect();

    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const options = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: 1
    };

    element.dispatchEvent(new MouseEvent('mouseover', options));
    element.dispatchEvent(new MouseEvent('mousemove', options));
    element.dispatchEvent(new MouseEvent('mousedown', options));
    element.dispatchEvent(new MouseEvent('mouseup', options));
    element.dispatchEvent(new MouseEvent('click', options));

    return true;
  }

  function downloadFile(filename, mime, content) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function getCurrentJobIdFromUrl() {
    const url = new URL(location.href);
    return url.searchParams.get('currentJobId') || '';
  }

  function buildJobUrlFromId(jobId) {
    if (!jobId) return '';
    return `https://www.linkedin.com/jobs/view/${jobId}/`;
  }

  function goToNextPageByUrl() {
    const url = new URL(location.href);

    const currentStart = Number(url.searchParams.get('start') || 0);
    const nextStart = currentStart + 25;

    url.searchParams.set('start', String(nextStart));

    location.href = url.toString();

    return true;
  }

  function getLeftJobListContainer() {
    const direct =
      document.querySelector('[componentkey="SearchResultsMainContent"][data-testid="lazy-column"]') ||
      document.querySelector('[data-component-type="LazyColumn"][componentkey="SearchResultsMainContent"]');

    if (direct) return direct;

    const lazyColumns = [
      ...document.querySelectorAll('[data-testid="lazy-column"], [data-component-type="LazyColumn"]')
    ];

    return lazyColumns.find(el => {
      const text = normalizeText(el.innerText || el.textContent || '');

      return (
        text.includes('Dismiss') &&
        /Posted|Easy Apply|Viewed|Saved|Actively reviewing applicants/i.test(text)
      );
    });
  }

  function getCardLink(card) {
    const anchor = card.querySelector('a[href*="/jobs/view/"]');

    if (anchor?.href) {
      try {
        return new URL(anchor.href, location.origin).href.split('?')[0];
      } catch {
        return anchor.href;
      }
    }

    return '';
  }

  function cleanTitle(title) {
    return normalizeText(title)
      .replace(/^Selected,\s*/i, '')
      .replace(/\s*\(Verified job\)/gi, '')
      .replace(/\s+Verified job$/gi, '')
      .trim();
  }

  function cleanCardTextPart(text = '') {
    let value = normalizeText(text);

    if (!value) return '';

    value = value
      .replace(/^Selected,\s*/i, '')
      .replace(/\s*\(Verified job\)/gi, '')
      .replace(/\s+Verified job$/gi, '')
      .trim();

    if (!value) return '';
    if (value.length > 140) return '';

    if (/^LinkedIn$/i.test(value)) return '';
    if (/^Dismiss\b/i.test(value)) return '';
    if (/^Viewed$/i.test(value)) return '';
    if (/^Saved$/i.test(value)) return '';
    if (/^Applied$/i.test(value)) return '';
    if (/^Easy Apply$/i.test(value)) return '';
    if (/^Be an early applicant$/i.test(value)) return '';
    if (/^Actively reviewing applicants$/i.test(value)) return '';
    if (/^Posted\b/i.test(value)) return '';

    if (/^\d+\s+(minutes?|hours?|days?|weeks?|months?)\s+ago$/i.test(value)) return '';
    if (/^(today|just now)$/i.test(value)) return '';

    if (/\b\d+\s+(company|school)\s+alumni\s+(works?|work)\s+here\b/i.test(value)) return '';
    if (/^\d+\s+applicants?$/i.test(value)) return '';
    if (/^Under\s+\d+\s+applicants?$/i.test(value)) return '';

    if (/Viewed|Applied|Saved|Posted|Easy Apply|early applicant|Actively reviewing/i.test(value)) {
      return '';
    }

    return value;
  }

  function getTextParts(card) {
    const rawParts = [...card.querySelectorAll('a, p, span')]
      .map(el => normalizeText(el.innerText || el.textContent || ''))
      .filter(Boolean);

    const seen = new Set();
    const parts = [];

    for (const part of rawParts) {
      const clean = cleanCardTextPart(part);

      if (!clean) continue;

      const key = clean.toLowerCase();

      if (seen.has(key)) continue;

      seen.add(key);
      parts.push(clean);
    }

    return parts;
  }

  function getTitleFromDismissButton(card) {
    const dismissBtn = card.querySelector('button[aria-label^="Dismiss "]');
    const label = dismissBtn?.getAttribute('aria-label') || '';

    return normalizeText(
      label
        .replace(/^Dismiss\s+/i, '')
        .replace(/\s+job$/i, '')
    );
  }

  function getTitle(card, parts) {
    const titleFromDismiss = getTitleFromDismissButton(card);

    if (titleFromDismiss) return cleanTitle(titleFromDismiss);

    const ariaHiddenTitles = [...card.querySelectorAll('span[aria-hidden="true"]')]
      .map(el => normalizeText(el.textContent))
      .filter(Boolean)
      .map(x => cleanTitle(x))
      .filter(Boolean)
      .filter(text => {
        return !/^(Easy Apply|Verified job|Posted|Be an early applicant|Actively reviewing applicants)$/i.test(text);
      })
      .filter(text => {
        return !/^\d+\s+(minutes?|hours?|days?|weeks?|months?)\s+ago$/i.test(text);
      });

    return ariaHiddenTitles[0] || parts[0] || '';
  }

  function extractPostedTextFromCard(fullText) {
    const text = normalizeText(fullText);

    return (
      text.match(/Posted\s+([^·]+?ago)/i)?.[1] ||
      text.match(/\b(today|just now)\b/i)?.[1] ||
      text.match(/\b(\d+\s+(?:minutes?|hours?|days?|weeks?|months?)\s+ago)\b/i)?.[1] ||
      ''
    ).trim();
  }

  function cleanCompany(company = '') {
    return normalizeText(company)
      .replace(/^Selected,\s*/i, '')
      .replace(/\(Verified job\)/gi, '')
      .replace(/\b\d+\s+(company|school)\s+alumni\s+(works?|work)\s+here\b/gi, '')
      .replace(/\b(Viewed|Applied|Saved|Posted|Be an early applicant|Actively reviewing applicants|Easy Apply)\b.*$/i, '')
      .trim();
  }

  function cleanLocation(locationText = '') {
    return normalizeText(locationText)
      .replace(/^Selected,\s*/i, '')
      .replace(/\(Verified job\)/gi, '')
      .replace(/\b\d+\s+(company|school)\s+alumni\s+(works?|work)\s+here\b/gi, '')
      .replace(/\b(Viewed|Applied|Saved|Posted|Be an early applicant|Actively reviewing applicants|Easy Apply)\b.*$/i, '')
      .trim();
  }

  function guessCompanyLocationFromParts(parts, title) {
    const cleanTitleValue = cleanTitle(title);

    const joined = parts.join(' ');
    let text = normalizeText(joined)
      .replace(/^Selected,\s*/i, '')
      .replace(/\(Verified job\)/gi, '')
      .trim();

    for (let i = 0; i < 3; i++) {
      if (text.toLowerCase().startsWith(cleanTitleValue.toLowerCase())) {
        text = text.slice(cleanTitleValue.length).trim();
      }
    }

    text = text.split(/\b(Viewed|Applied|Saved|Posted|Be an early applicant|Actively reviewing applicants|Easy Apply)\b/i)[0];
    text = normalizeText(text);

    text = text
      .replace(/\b\d+\s+(company|school)\s+alumni\s+(works?|work)\s+here\b/gi, '')
      .trim();

    const words = text.split(/\s+/).filter(Boolean);

    if (words.length < 2) {
      return {
        company: '',
        location: ''
      };
    }

    const locationWords = [
      'bengaluru',
      'bangalore',
      'chennai',
      'pune',
      'gurugram',
      'gurgaon',
      'hyderabad',
      'mumbai',
      'delhi',
      'noida',
      'kochi',
      'cochin',
      'thiruvananthapuram',
      'trivandrum',
      'india',
      'remote'
    ];

    const locIndex = words.findIndex(w => {
      return locationWords.includes(w.toLowerCase().replace(/[(),]/g, ''));
    });

    if (locIndex > 0) {
      return {
        company: words.slice(0, locIndex).join(' '),
        location: words.slice(locIndex).join(' ')
      };
    }

    return {
      company: words[0] || '',
      location: words.slice(1).join(' ')
    };
  }

  function extractCompanyAndLocation(parts, title) {
    const cleanTitleValue = cleanTitle(title).toLowerCase();

    const filtered = parts
      .map(x => cleanTitle(x))
      .filter(Boolean)
      .filter(x => x.toLowerCase() !== cleanTitleValue)
      .filter(x => !x.toLowerCase().startsWith(cleanTitleValue + ' '))
      .filter(x => !x.toLowerCase().includes(cleanTitleValue + ' '));

    let company = '';
    let locationText = '';

    if (filtered.length >= 2) {
      company = filtered[0] || '';
      locationText = filtered[1] || '';
    }

    if (!company || !locationText) {
      const guessed = guessCompanyLocationFromParts(parts, title);

      company = company || guessed.company;
      locationText = locationText || guessed.location;
    }

    return {
      company: cleanCompany(company),
      location: cleanLocation(locationText)
    };
  }

  function extractJobFromCard(card, keyword = '') {
    const parts = getTextParts(card);
    const fullText = normalizeText(card.innerText || card.textContent || '');

    const title = cleanTitle(getTitle(card, parts));
    const posted = extractPostedTextFromCard(fullText);

    const info = extractCompanyAndLocation(parts, title);

    const easyApply = /Easy Apply/i.test(fullText);
    const earlyApplicant = /early applicant/i.test(fullText);
    const activelyReviewing = /Actively reviewing applicants/i.test(fullText);

    const applicants = (
      fullText.match(/(Under\s+\d+\s+applicants?|\d+\s+applicants?)/i)?.[1] ||
      ''
    ).trim();

    return {
      keyword,
      title,
      company: info.company,
      location: info.location,
      posted,
      easyApply: easyApply ? 'Yes' : 'No',
      earlyApplicant: earlyApplicant ? 'Yes' : 'No',
      activelyReviewing: activelyReviewing ? 'Yes' : 'No',
      applicants,
      link: getCardLink(card),
      pageUrl: location.href.split('#')[0],
      collectedAt: new Date().toLocaleString()
    };
  }

  function getCardFromDismissButton(btn) {
    const leftList = getLeftJobListContainer();

    const roleButtonCard = btn.closest('div[role="button"][componentkey]');

    if (roleButtonCard && (!leftList || leftList.contains(roleButtonCard))) {
      const text = normalizeText(roleButtonCard.innerText || roleButtonCard.textContent || '');
      const dismissCount = roleButtonCard.querySelectorAll('button[aria-label^="Dismiss "]').length;

      if (
        dismissCount === 1 &&
        text.length > 20 &&
        /Posted|Easy Apply|Viewed|Saved|Today|Just now|Actively reviewing applicants/i.test(text)
      ) {
        return roleButtonCard;
      }
    }

    let node = btn.parentElement;

    for (let i = 0; i < 8 && node; i++) {
      if (leftList && !leftList.contains(node)) {
        node = node.parentElement;
        continue;
      }

      const dismissButtons = node.querySelectorAll('button[aria-label^="Dismiss "]');
      const text = normalizeText(node.innerText || node.textContent || '');

      if (
        dismissButtons.length === 1 &&
        text.length > 20 &&
        /Posted|Easy Apply|Viewed|Saved|Today|Just now|Actively reviewing applicants/i.test(text)
      ) {
        return node;
      }

      node = node.parentElement;
    }

    return null;
  }

  function findJobCards() {
    const leftList = getLeftJobListContainer();

    if (!leftList) {
      state.status = 'Left job list not found.';
      return [];
    }

    const cards = new Set();

    leftList.querySelectorAll('button[aria-label^="Dismiss "]').forEach(btn => {
      const card = getCardFromDismissButton(btn);

      if (card && leftList.contains(card)) {
        cards.add(card);
      }
    });

    return [...cards].filter(card => {
      const text = normalizeText(card.innerText || card.textContent || '');
      const dismissCount = card.querySelectorAll('button[aria-label^="Dismiss "]').length;

      return (
        dismissCount === 1 &&
        text.length > 20 &&
        /Posted|Easy Apply|Viewed|Saved|Today|Just now|Actively reviewing applicants/i.test(text)
      );
    });
  }

  async function enrichLinkByClickingCard(card, job) {
    if (job.link) return job;

    const beforeId = getCurrentJobIdFromUrl();

    realClick(card);

    await wait(900);

    const afterId = getCurrentJobIdFromUrl();

    if (afterId && afterId !== beforeId) {
      job.link = buildJobUrlFromId(afterId);
      job.pageUrl = location.href.split('#')[0];
    } else if (afterId) {
      job.link = buildJobUrlFromId(afterId);
      job.pageUrl = location.href.split('#')[0];
    }

    return job;
  }

  async function addJobsFromCurrentView(keyword = '', shouldClickCards = true) {
    await loadSavedJobsFromStorage();

    const cards = findJobCards();

    let added = 0;
    let skippedOld = 0;
    let skippedInvalid = 0;
    let skippedKeyword = 0;
    let skippedDuplicate = 0;

    state.status = `Found ${cards.length} left-side job cards. Filtering jobs...`;

    for (const card of cards) {
      if (state.stopRequested) break;

      let job = extractJobFromCard(card, keyword);

      if (!job.title || !job.company) {
        skippedInvalid++;
        continue;
      }

      if (!isPostedToday(job.posted)) {
        skippedOld++;
        continue;
      }

      if (!isKeywordMatched(job, keyword)) {
        skippedKeyword++;
        continue;
      }

      if (shouldClickCards) {
        job = await enrichLinkByClickingCard(card, job);
      }

      const key = getJobKey(job);

      if (state.seen.has(key)) {
        skippedDuplicate++;
        continue;
      }

      state.seen.add(key);
      state.jobs.push(job);

      await persistSavedJobs();

      added++;

      state.status = `Saved jobs: ${state.jobs.length}
Added now: ${added}
Last: ${job.title}
Skipped old: ${skippedOld}
Skipped keyword: ${skippedKeyword}
Skipped invalid: ${skippedInvalid}
Skipped duplicate: ${skippedDuplicate}`;
    }

    state.status = `Saved jobs: ${state.jobs.length}
Added now: ${added}
Skipped old: ${skippedOld}
Skipped keyword: ${skippedKeyword}
Skipped invalid: ${skippedInvalid}
Skipped duplicate: ${skippedDuplicate}`;

    return added;
  }

  function getScrollContainer() {
    return (
      getLeftJobListContainer() ||
      document.scrollingElement
    );
  }

  async function scrollToLoadMore(delay, keyword = '') {
    const container = getScrollContainer();

    let previousCount = 0;
    let stableCount = 0;

    for (let i = 0; i < 15 && !state.stopRequested; i++) {
      const cardsBefore = findJobCards().length;

      try {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      } catch {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }

      await wait(delay);

      await addJobsFromCurrentView(keyword, true);

      const cardsAfter = findJobCards().length;

      if (cardsAfter === previousCount || cardsAfter === cardsBefore) {
        stableCount++;
      } else {
        stableCount = 0;
      }

      previousCount = cardsAfter;

      if (stableCount >= 3) break;
    }
  }

  function findNextButton() {
    const candidates = [
      ...document.querySelectorAll('button, a')
    ];

    return candidates.find(el => {
      const text = normalizeText(
        el.innerText ||
        el.textContent ||
        el.getAttribute('aria-label') ||
        ''
      );

      const ariaLabel = normalizeText(el.getAttribute('aria-label') || '');

      const disabled =
        el.disabled ||
        el.getAttribute('aria-disabled') === 'true' ||
        el.closest('[aria-disabled="true"]');

      if (disabled) return false;

      return (
        /^next$/i.test(text) ||
        /^next page$/i.test(text) ||
        /next/i.test(ariaLabel)
      );
    });
  }

  async function clickNextPage(delay) {
    const next = findNextButton();

    if (next) {
      state.status = 'Clicking next page button...';

      const beforeUrl = location.href;

      realClick(next);

      await wait(delay * 2);

      if (location.href !== beforeUrl) {
        return true;
      }

      state.status = 'Next button clicked, but URL did not change. Using URL fallback...';
    } else {
      state.status = 'No next button found. Using URL fallback...';
    }

    goToNextPageByUrl();

    return true;
  }

  function buildLinkedInJobSearchUrl(keyword, locationName, pageStart = 0) {
    const params = new URLSearchParams();

    params.set('keywords', keyword);

    if (locationName) {
      params.set('location', locationName);
    }

    params.set('f_TPR', 'r86400');
    params.set('f_AL', 'true');
    params.set('start', String(pageStart));
    params.set('origin', 'JOB_SEARCH_PAGE_SEARCH_BUTTON');

    return `https://www.linkedin.com/jobs/search-results/?${params.toString()}`;
  }

  async function runCurrentPage(options) {
    await loadSavedJobsFromStorage();

    state.running = true;
    state.stopRequested = false;
    state.status = 'Collecting jobs from left job list...';

    const keyword =
      options.keywords?.join(',') ||
      document.querySelector('[data-testid="typeahead-input"]')?.value ||
      '';

    for (let page = 1; page <= options.pages && !state.stopRequested; page++) {
      state.status = `Scanning left job list batch ${page}/${options.pages}...`;

      await addJobsFromCurrentView(keyword, true);

      await scrollToLoadMore(options.delay, keyword);

      await addJobsFromCurrentView(keyword, true);

      if (page < options.pages) {
        await clickNextPage(options.delay);
      }
    }

    state.running = false;
    state.status = `Done. Total saved jobs: ${state.jobs.length}`;
  }

  async function runMultiKeyword(options) {
    await loadSavedJobsFromStorage();

    state.running = true;
    state.stopRequested = false;

    const keyword = options.keywords?.[0] || 'Angular Developer';
    const url = buildLinkedInJobSearchUrl(keyword, options.location, 0);

    state.status = `Opening search for: ${keyword}`;

    location.href = url;

    state.running = false;
    state.status = `Opened first keyword. Saved jobs preserved: ${state.jobs.length}`;
  }

  function makeCsv() {
    const headers = [
      'title',
      'company',
      'location',
      'posted',
      'easyApply',
      'earlyApplicant',
      'activelyReviewing',
      'applicants',
      'jobUrl',
      'collectedAt'
    ];

    const rows = state.jobs.map(job => {
      const jobUrl = job.link || job.pageUrl || '';

      const row = {
        title: job.title,
        company: job.company,
        location: job.location,
        posted: job.posted,
        easyApply: job.easyApply,
        earlyApplicant: job.earlyApplicant,
        activelyReviewing: job.activelyReviewing,
        applicants: job.applicants,
        jobUrl,
        collectedAt: job.collectedAt
      };

      return headers.map(h => csvEscape(row[h])).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  function makeHtml() {
    const esc = (s) => {
      return String(s ?? '').replace(/[&<>"]/g, ch => {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;'
        }[ch];
      });
    };

    const rows = state.jobs.map((job, index) => {
      const openUrl = job.link || job.pageUrl || '';
      const linkLabel = job.link ? 'Open Job Post' : 'Open Selected Job Page';

      return `
        <tr
          data-row-index="${index}"
          data-title="${esc(job.title)}"
          data-company="${esc(job.company)}"
          data-location="${esc(job.location)}"
          data-open-url="${esc(openUrl)}"
        >
          <td>
            ${
              openUrl
                ? `<a href="${esc(openUrl)}" target="_blank">${esc(job.title)}</a>`
                : esc(job.title)
            }
          </td>
          <td>${esc(job.company)}</td>
          <td>${esc(job.location)}</td>
          <td>${esc(job.posted)}</td>
          <td>${esc(job.easyApply)}</td>
          <td>${esc(job.earlyApplicant)}</td>
          <td>${esc(job.activelyReviewing)}</td>
          <td>${esc(job.applicants)}</td>
          <td>
            ${
              openUrl
                ? `<a href="${esc(openUrl)}" target="_blank">${linkLabel}</a>`
                : ''
            }
          </td>
          <td>${esc(job.collectedAt)}</td>
        </tr>
      `;
    }).join('');

    return `<!doctype html>
<html>
<head>
<meta charset="UTF-8" />
<title>LinkedIn Jobs Export</title>

<style>
  body {
    font-family: Arial, sans-serif;
    padding: 20px;
    background: #fafafa;
  }

  h2 {
    margin-bottom: 6px;
  }

  .top-bar {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    margin: 14px 0;
  }

  .button {
    background: #0a66c2;
    color: white;
    border: 0;
    padding: 9px 14px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 700;
  }

  .button.secondary {
    background: #eef3f8;
    color: #0a66c2;
  }

  .count-box {
    font-size: 13px;
    background: white;
    padding: 8px 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    background: white;
  }

  th,
  td {
    border: 1px solid #ddd;
    padding: 8px;
    font-size: 13px;
    vertical-align: top;
  }

  th {
    background: #0a66c2;
    color: white;
    position: sticky;
    top: 0;
    z-index: 5;
    white-space: nowrap;
  }

  tr:hover {
    background: #fff7d6;
  }

  a {
    color: #0a66c2;
    font-weight: 700;
  }

  .filter-wrap {
    position: relative;
    display: inline-block;
    margin-left: 6px;
  }

  .filter-btn {
    background: white;
    color: #0a66c2;
    border: 1px solid white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    padding: 2px 5px;
  }

  .filter-panel {
    display: none;
    position: absolute;
    top: 25px;
    left: 0;
    width: 260px;
    max-height: 340px;
    overflow: hidden;
    background: white;
    color: #111;
    border: 1px solid #bbb;
    box-shadow: 0 4px 14px rgba(0,0,0,0.18);
    border-radius: 6px;
    z-index: 9999;
    padding: 10px;
  }

  .filter-panel.open {
    display: block;
  }

  .filter-search {
    width: 100%;
    box-sizing: border-box;
    padding: 7px;
    margin-bottom: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .filter-actions {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }

  .filter-actions button {
    flex: 1;
    padding: 6px;
    cursor: pointer;
    border: 1px solid #ccc;
    background: #f3f3f3;
    border-radius: 4px;
    font-size: 12px;
  }

  .filter-options {
    max-height: 210px;
    overflow-y: auto;
    border-top: 1px solid #eee;
    padding-top: 6px;
  }

  .filter-option {
    display: block;
    margin: 5px 0;
    font-size: 12px;
    cursor: pointer;
    color: #111;
  }

  .filter-option input {
    margin-right: 6px;
  }

  .muted {
    color: #666;
    font-size: 12px;
  }

  .hidden-row {
    display: none;
  }
</style>
</head>

<body>
<h2>LinkedIn Jobs Export</h2>

<div class="top-bar">
  <button class="button" onclick="openVisibleJobUrls()">Open Visible Job Pages</button>
  <button class="button secondary" onclick="resetAllFilters()">Reset Filters</button>
  <span class="count-box">
    Showing: <b id="visibleCount">0</b> / <b id="totalCount">${state.jobs.length}</b>
  </span>
  <span class="muted">
    Direct job post opens when available. Otherwise it opens the selected-job search page.
  </span>
</div>

<table id="jobsTable">
  <thead>
    <tr>
      <th>
        Title
        <span class="filter-wrap">
          <button class="filter-btn" onclick="toggleFilter(event, 'title')">▼</button>
          <div class="filter-panel" id="filter-title"></div>
        </span>
      </th>

      <th>
        Company
        <span class="filter-wrap">
          <button class="filter-btn" onclick="toggleFilter(event, 'company')">▼</button>
          <div class="filter-panel" id="filter-company"></div>
        </span>
      </th>

      <th>
        Location
        <span class="filter-wrap">
          <button class="filter-btn" onclick="toggleFilter(event, 'location')">▼</button>
          <div class="filter-panel" id="filter-location"></div>
        </span>
      </th>

      <th>Posted</th>
      <th>Easy Apply</th>
      <th>Early</th>
      <th>Reviewing</th>
      <th>Applicants</th>
      <th>Job Page</th>
      <th>Collected At</th>
    </tr>
  </thead>

  <tbody>
    ${rows}
  </tbody>
</table>

<script>
  const filterState = {
    title: new Set(),
    company: new Set(),
    location: new Set()
  };

  const filterKeys = ['title', 'company', 'location'];

  function getRows() {
    return Array.from(document.querySelectorAll('#jobsTable tbody tr'));
  }

  function getValue(row, key) {
    return (row.dataset[key] || '').trim();
  }

  function getUniqueValues(key) {
    const values = getRows()
      .map(row => getValue(row, key))
      .filter(Boolean);

    return Array.from(new Set(values)).sort((a, b) => {
      return a.localeCompare(b);
    });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"]/g, ch => {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
      }[ch];
    });
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, '&#39;');
  }

  function buildFilterPanel(key) {
    const panel = document.getElementById('filter-' + key);
    const values = getUniqueValues(key);

    filterState[key] = new Set(values);

    panel.innerHTML = \`
      <input
        class="filter-search"
        placeholder="Search \${key}..."
        oninput="renderFilterOptions('\${key}', this.value)"
      />

      <div class="filter-actions">
        <button onclick="selectAllFilter('\${key}')">Select All</button>
        <button onclick="clearFilter('\${key}')">Clear</button>
        <button onclick="applyFilters()">Apply</button>
      </div>

      <div class="filter-options" id="filter-options-\${key}"></div>
    \`;

    renderFilterOptions(key, '');
  }

  function renderFilterOptions(key, searchText) {
    const container = document.getElementById('filter-options-' + key);
    const values = getUniqueValues(key);
    const q = String(searchText || '').toLowerCase();

    const filteredValues = values.filter(value => {
      return value.toLowerCase().includes(q);
    });

    container.innerHTML = filteredValues.map(value => {
      const checked = filterState[key].has(value) ? 'checked' : '';

      return \`
        <label class="filter-option">
          <input
            type="checkbox"
            \${checked}
            onchange="toggleFilterValue('\${key}', this.value, this.checked)"
            value="\${escapeAttr(value)}"
          />
          \${escapeHtml(value)}
        </label>
      \`;
    }).join('');
  }

  function toggleFilter(event, key) {
    event.stopPropagation();

    document.querySelectorAll('.filter-panel').forEach(panel => {
      if (panel.id !== 'filter-' + key) {
        panel.classList.remove('open');
      }
    });

    document.getElementById('filter-' + key).classList.toggle('open');
  }

  function toggleFilterValue(key, value, checked) {
    if (checked) {
      filterState[key].add(value);
    } else {
      filterState[key].delete(value);
    }

    applyFilters();
  }

  function selectAllFilter(key) {
    filterState[key] = new Set(getUniqueValues(key));
    renderFilterOptions(key, '');
    applyFilters();
  }

  function clearFilter(key) {
    filterState[key] = new Set();
    renderFilterOptions(key, '');
    applyFilters();
  }

  function resetAllFilters() {
    filterKeys.forEach(key => {
      filterState[key] = new Set(getUniqueValues(key));
      renderFilterOptions(key, '');
    });

    applyFilters();
  }

  function applyFilters() {
    let visible = 0;

    getRows().forEach(row => {
      const isVisible = filterKeys.every(key => {
        const value = getValue(row, key);
        return filterState[key].has(value);
      });

      row.classList.toggle('hidden-row', !isVisible);

      if (isVisible) visible++;
    });

    document.getElementById('visibleCount').textContent = String(visible);
  }

  function openVisibleJobUrls() {
    const urls = getRows()
      .filter(row => !row.classList.contains('hidden-row'))
      .map(row => row.dataset.openUrl)
      .filter(Boolean);

    const uniqueUrls = Array.from(new Set(urls));

    if (!uniqueUrls.length) {
      alert('No visible job URLs found.');
      return;
    }

    const confirmed = confirm('Open ' + uniqueUrls.length + ' visible job pages?');

    if (!confirmed) return;

    uniqueUrls.forEach((url, index) => {
      setTimeout(() => {
        window.open(url, '_blank');
      }, index * 250);
    });
  }

  document.addEventListener('click', () => {
    document.querySelectorAll('.filter-panel').forEach(panel => {
      panel.classList.remove('open');
    });
  });

  document.querySelectorAll('.filter-panel').forEach(panel => {
    panel.addEventListener('click', event => {
      event.stopPropagation();
    });
  });

  filterKeys.forEach(buildFilterPanel);
  applyFilters();
</script>

</body>
</html>`;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
      if (message.type === 'LI_JOB_FINDER_STATUS') {
        await loadSavedJobsFromStorage();

        sendResponse({
          status: `${state.status}\nTotal saved jobs: ${state.jobs.length}`
        });
        return;
      }

      if (message.type === 'LI_JOB_FINDER_STOP') {
        state.stopRequested = true;
        state.running = false;
        state.status = `Stopped. Total saved jobs: ${state.jobs.length}`;

        sendResponse({
          status: state.status
        });
        return;
      }

      if (message.type === 'LI_JOB_FINDER_START') {
        await loadSavedJobsFromStorage();

        if (state.running) {
          sendResponse({
            status: 'Already running.'
          });
          return;
        }

        const options = message.options || {};

        options.keywords = options.keywords?.length
          ? options.keywords
          : ['Angular Developer'];

        options.pages = Math.max(1, Number(options.pages || 1));
        options.delay = Math.max(700, Number(options.delay || 1800));

        sendResponse({
          status: `Started. Existing saved jobs: ${state.jobs.length}`
        });

        if (options.mode === 'multiKeyword') {
          runMultiKeyword(options);
        } else {
          runCurrentPage(options);
        }

        return;
      }

      if (message.type === 'LI_JOB_FINDER_CLEAR_SAVED') {
        await clearSavedJobs();

        sendResponse({
          status: 'Saved jobs cleared. Total saved jobs: 0'
        });
        return;
      }

      if (message.type === 'LI_JOB_FINDER_DOWNLOAD_CSV') {
        await loadSavedJobsFromStorage();

        downloadFile(
          'linkedin-jobs.csv',
          'text/csv;charset=utf-8',
          makeCsv()
        );

        sendResponse({
          status: `CSV downloaded. Total saved jobs: ${state.jobs.length}`
        });
        return;
      }

      if (message.type === 'LI_JOB_FINDER_DOWNLOAD_HTML') {
        await loadSavedJobsFromStorage();

        downloadFile(
          'linkedin-jobs.html',
          'text/html;charset=utf-8',
          makeHtml()
        );

        sendResponse({
          status: `HTML downloaded. Total saved jobs: ${state.jobs.length}`
        });
        return;
      }
    })();

    return true;
  });
})();