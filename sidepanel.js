document.addEventListener('DOMContentLoaded', function () {
  const scanButton      = document.getElementById('scanButton');
  const focusOrderBtn   = document.getElementById('focusOrderBtn');
  const resultsDiv      = document.getElementById('results');
  const issuesList      = document.getElementById('issuesList');
  const loadingDiv      = document.getElementById('loading');
  const emptyDiv        = document.getElementById('empty');
  const summaryStrip    = document.getElementById('summaryStrip');
  const statusPill      = document.getElementById('statusPill');
  const themeToggle     = document.getElementById('themeToggle');

  let allIssues       = [];
  let lastScanResult  = null;
  let lastScoreData   = null;
  let focusOrderActive = false;
  // ── Fix suggestions database ────────────────────────────────────
  const fixSuggestions = {
    'Missing Alt Text': {
      title: 'Add an alt attribute',
      code: '<img src="image.jpg" alt="Description of the image">',
      explanation: 'Describe what the image shows. If decorative, use alt="".'
    },
    'Empty Link': {
      title: 'Add accessible text to the link',
      code: '<a href="/page" aria-label="Descriptive link text">\n  <svg>...</svg>\n</a>',
      explanation: 'Add aria-label to the <a> tag, or add visible text inside the link.'
    },
    'Misplaced Accessible Name': {
      title: 'Move aria-label to the parent link',
      code: '<!-- Before -->\n<a href="#">\n  <svg aria-label="Search">...</svg>\n</a>\n\n<!-- After -->\n<a href="#" aria-label="Search">\n  <svg>...</svg>\n</a>',
      explanation: 'Move the aria-label from the child element to the <a> tag itself.'
    },
    'Input Without Label': {
      title: 'Add a label element',
      code: '<label for="email">Email address</label>\n<input type="email" id="email" name="email">',
      explanation: 'Use a <label> tag with matching for/id attributes, or add aria-label to the input.'
    },
    'Missing Language Attribute': {
      title: 'Add lang attribute to html',
      code: '<html lang="en">',
      explanation: 'Specify the page language (e.g., "en" for English, "es" for Spanish).'
    },
    'Button Without Accessible Name': {
      title: 'Add text or aria-label',
      code: '<button aria-label="Close dialog">\n  <svg>...</svg>\n</button>',
      explanation: 'Add visible text inside the button, or use aria-label for icon-only buttons.'
    },
    'Missing H1': {
      title: 'Add an H1 heading to the page',
      code: '<h1>Page Title</h1>',
      explanation: 'Every page should have exactly one H1 that describes the main content.'
    },
    'Multiple H1s': {
      title: 'Use only one H1 per page',
      code: '<!-- Change additional H1s to H2 or lower -->\n<h1>Main Title</h1>\n<h2>Section Title</h2>',
      explanation: 'Keep only one H1 for the main page title. Convert others to H2-H6.'
    },
    'Skipped Heading Level': {
      title: 'Fix heading hierarchy',
      code: '<!-- Before -->\n<h2>Section</h2>\n<h4>Subsection</h4>\n\n<!-- After -->\n<h2>Section</h2>\n<h3>Subsection</h3>',
      explanation: "Don't skip heading levels. Go from H2→H3→H4, not H2→H4."
    },
    'Missing Page Title': {
      title: 'Add a descriptive <title> element',
      code: '<head>\n  <title>Page Name – Site Name</title>\n</head>',
      explanation: 'Every page needs a unique, descriptive title. Screen readers announce it when the page loads.'
    },
    'Missing Main Landmark': {
      title: 'Wrap primary content in <main>',
      code: '<body>\n  <header>...</header>\n  <nav>...</nav>\n  <main>\n    <!-- Primary page content here -->\n  </main>\n  <footer>...</footer>\n</body>',
      explanation: 'The <main> element (or role="main") helps screen reader users jump directly to the primary content.'
    },
    'Missing Navigation Landmark': {
      title: 'Wrap navigation links in <nav>',
      code: '<nav aria-label="Main navigation">\n  <ul>\n    <li><a href="/">Home</a></li>\n    <li><a href="/about">About</a></li>\n  </ul>\n</nav>',
      explanation: 'Use <nav> for groups of navigation links. Add aria-label when there are multiple navs.'
    },
    'Multiple Main Landmarks': {
      title: 'Use only one <main> landmark per page',
      code: '<!-- Only one <main> allowed -->\n<main>\n  <!-- All primary content -->\n</main>\n\n<!-- Use <section> or <article> for other regions -->\n<section aria-label="Secondary content">\n  ...\n</section>',
      explanation: 'Pages should have exactly one <main> landmark. Use <section> or <article> for additional content regions.'
    },
    'Positive Tabindex': {
      title: 'Remove positive tabindex values',
      code: '<!-- Avoid -->\n<button tabindex="3">Submit</button>\n\n<!-- Use instead -->\n<button>Submit</button>\n<!-- Or if needed -->\n<button tabindex="0">Submit</button>',
      explanation: 'Positive tabindex values (1, 2, 3…) override the natural tab order and create confusing keyboard navigation. Use 0 or -1 only.'
    },
    'Keyboard Inaccessible Element': {
      title: 'Make interactive elements keyboard accessible',
      code: '<!-- Avoid -->\n<div onclick="doSomething()">Click me</div>\n\n<!-- Use a button instead -->\n<button onclick="doSomething()">Click me</button>\n\n<!-- Or add role and tabindex -->\n<div role="button" tabindex="0"\n  onclick="doSomething()"\n  onkeydown="handleKey(event)">Click me</div>',
      explanation: 'Elements with click handlers must also be reachable and operable via keyboard. Native <button> and <a> elements handle this automatically.'
    },
    'Low Color Contrast': {
      title: 'Increase text color contrast',
      code: '/* WCAG requires 4.5:1 for normal text, 3:1 for large text */\n\n/* Failing example */\n.text { color: #999999; background: #ffffff; } /* ~2.8:1 */\n\n/* Passing example */\n.text { color: #595959; background: #ffffff; } /* 7:1 */\n\n/* Use a contrast checker:\n   https://webaim.org/resources/contrastchecker/ */',
      explanation: 'Normal text needs a contrast ratio of at least 4.5:1. Large text (18pt+ or 14pt+ bold) needs 3:1. Use a contrast checker to find compliant color pairs.'
    },
    'Suspicious Empty Alt Text': {
      title: 'Check if decorative alt="" is correct',
      code: '<!-- Decorative image (correct use of empty alt) -->\n<img src="divider.png" alt="">\n\n<!-- Informative image (needs real alt text) -->\n<img src="chart-q3-revenue.png"\n  alt="Q3 revenue chart showing 40% growth">\n\n<!-- Linked image (always needs alt) -->\n<a href="/report">\n  <img src="report-icon.png" alt="Download Q3 report">\n</a>',
      explanation: 'Images with alt="" are treated as decorative and hidden from screen readers. If the image conveys information or is inside a link, it needs descriptive alt text.'
    },
    'Focusable Element Removed from Tab Order': {
      title: 'Avoid tabindex="-1" on interactive elements',
      code: '<!-- Avoid removing native elements from tab order -->\n<button tabindex="-1">Submit</button> <!-- ❌ -->\n\n<!-- Only use tabindex="-1" for programmatic focus -->\n<button>Submit</button> <!-- ✅ naturally focusable -->\n\n<!-- Valid use: dialog managed via JS -->\n<div role="dialog">\n  <button tabindex="-1" id="first-focus">Close</button>\n</div>\n<!-- Then in JS: document.getElementById("first-focus").focus() -->',
      explanation: 'tabindex="-1" removes an element from the natural tab order. It\'s valid when you manage focus programmatically (e.g., modals), but applied to buttons or links it makes them unreachable by keyboard.'
    },
    'Custom Widget Missing Tabindex': {
      title: 'Add tabindex="0" to custom interactive widgets',
      code: '<!-- Missing tabindex -->\n<div role="tab">Tab One</div> <!-- ❌ -->\n\n<!-- Correct: focusable and keyboard operable -->\n<div role="tab" tabindex="0"\n  onkeydown="handleTabKey(event)">Tab One</div> <!-- ✅ -->\n\n<!-- For composite widgets use roving tabindex -->\n<div role="tablist">\n  <div role="tab" tabindex="0">Tab 1</div>  <!-- active -->\n  <div role="tab" tabindex="-1">Tab 2</div> <!-- inactive -->\n</div>',
      explanation: 'Elements with interactive ARIA roles (tab, menuitem, option, treeitem) must be keyboard focusable. Use tabindex="0" or implement the roving tabindex pattern for composite widgets.'
    },
    'Missing aria-expanded on Toggle': {
      title: 'Add aria-expanded to toggle buttons',
      code: '<!-- Missing state -->\n<button onclick="toggleMenu()">Menu</button> <!-- ❌ -->\n\n<!-- Correct: announces open/closed state -->\n<button aria-expanded="false"\n        aria-controls="main-menu"\n        onclick="toggleMenu(this)">Menu</button> <!-- ✅ -->\n\n<ul id="main-menu" hidden>...</ul>\n\n<script>\nfunction toggleMenu(btn) {\n  const expanded = btn.getAttribute("aria-expanded") === "true";\n  btn.setAttribute("aria-expanded", !expanded);\n  document.getElementById("main-menu").hidden = expanded;\n}\n</script>',
      explanation: 'Buttons that show/hide content must communicate their state via aria-expanded="true/false". Screen readers announce this so users know whether the controlled region is open or closed.'
    },
    'Dialog Missing Focus Management': {
      title: 'Add focus management attributes to dialogs',
      code: '<!-- Native dialog (recommended) -->\n<dialog id="myDialog" aria-labelledby="dialog-title">\n  <h2 id="dialog-title">Confirm Action</h2>\n  <p>Are you sure?</p>\n  <button autofocus>Confirm</button>\n  <button onclick="document.getElementById(\'myDialog\').close()">Cancel</button>\n</dialog>\n\n<!-- Custom dialog (role-based) -->\n<div role="dialog"\n     aria-modal="true"\n     aria-labelledby="dialog-title"\n     tabindex="-1">\n  <h2 id="dialog-title">Confirm Action</h2>\n  ...\n</div>',
      explanation: 'Dialogs must trap focus inside when open and return focus to the trigger when closed. Use the native <dialog> element with autofocus, or add aria-modal="true" and tabindex="-1" to custom dialogs and manage focus via JavaScript.'
    },
    'Custom Dropdown Missing Keyboard Support': {
      title: 'Implement keyboard pattern for custom dropdowns',
      code: '<!-- Custom listbox needs keyboard support -->\n<div role="combobox"\n     aria-expanded="false"\n     aria-haspopup="listbox"\n     aria-controls="options-list">\n  <input type="text" aria-autocomplete="list">\n</div>\n<ul role="listbox" id="options-list">\n  <li role="option" tabindex="-1">Option 1</li>\n  <li role="option" tabindex="-1">Option 2</li>\n</ul>\n<!-- Implement: Enter selects, Escape closes,\n     Arrow keys move focus between options -->',
      explanation: 'Custom dropdowns with role="listbox" or role="combobox" must implement the ARIA keyboard interaction pattern: Enter/Space to select, Escape to close, Arrow keys to navigate options.'
    },
    'Missing Keyboard Handler on Interactive Element': {
      title: 'Add keyboard event handlers alongside click handlers',
      code: '<!-- Click-only (keyboard users cannot activate) -->\n<div onclick="doAction()">Activate</div> <!-- ❌ -->\n\n<!-- With keyboard support -->\n<div role="button" tabindex="0"\n     onclick="doAction()"\n     onkeydown="if(event.key===\'Enter\'||event.key===\' \')doAction()">Activate</div>\n\n<!-- Best: use a native element instead -->\n<button onclick="doAction()">Activate</button> <!-- ✅ -->',
      explanation: 'Custom interactive elements need both click and keyboard handlers. Native elements like <button> and <a> handle this automatically — prefer them over divs and spans with event listeners.'
    }
  };

  // ── WCAG criteria mapping ───────────────────────────────────────
  const wcagMapping = {
    'Missing Alt Text': { criterion: '1.1.1 Non-text Content', level: 'A', weight: 10 },
    'Empty Link': { criterion: '2.4.4 Link Purpose (In Context)', level: 'A', weight: 9 },
    'Misplaced Accessible Name': { criterion: '4.1.2 Name, Role, Value', level: 'A', weight: 7 },
    'Input Without Label': { criterion: '1.3.1 Info and Relationships', level: 'A', weight: 10 },
    'Missing Language Attribute': { criterion: '3.1.1 Language of Page', level: 'A', weight: 8 },
    'Button Without Accessible Name': { criterion: '4.1.2 Name, Role, Value', level: 'A', weight: 9 },
    'Missing H1': { criterion: '2.4.6 Headings and Labels', level: 'AA', weight: 6 },
    'Multiple H1s': { criterion: '1.3.1 Info and Relationships', level: 'A', weight: 5 },
    'Skipped Heading Level': { criterion: '1.3.1 Info and Relationships', level: 'A', weight: 6 },
    'Missing Page Title':    { criterion: '2.4.2 Page Titled', level: 'A', weight: 9 },
    'Missing Main Landmark': { criterion: '1.3.6 Identify Purpose', level: 'AA', weight: 6 },
    'Missing Navigation Landmark': { criterion: '1.3.6 Identify Purpose', level: 'AA', weight: 5 },
    'Multiple Main Landmarks':     { criterion: '1.3.6 Identify Purpose', level: 'AA', weight: 5 },
    'Positive Tabindex':           { criterion: '2.4.3 Focus Order', level: 'A', weight: 7 },
    'Keyboard Inaccessible Element': { criterion: '2.1.1 Keyboard', level: 'A', weight: 9 },
    'Low Color Contrast':          { criterion: '1.4.3 Contrast (Minimum)', level: 'AA', weight: 8 },
    'Suspicious Empty Alt Text':   { criterion: '1.1.1 Non-text Content', level: 'A', weight: 7 },
    'Focusable Element Removed from Tab Order': { criterion: '2.1.1 Keyboard', level: 'A', weight: 8 },
    'Custom Widget Missing Tabindex':           { criterion: '2.1.1 Keyboard', level: 'A', weight: 8 },
    'Missing aria-expanded on Toggle':          { criterion: '4.1.2 Name, Role, Value', level: 'A', weight: 7 },
    'Dialog Missing Focus Management':          { criterion: '2.1.2 No Keyboard Trap', level: 'A', weight: 9 },
    'Custom Dropdown Missing Keyboard Support': { criterion: '2.1.1 Keyboard', level: 'A', weight: 8 },
    'Missing Keyboard Handler on Interactive Element': { criterion: '2.1.1 Keyboard', level: 'A', weight: 9 }
  };

  // ── Theme toggle ────────────────────────────────────────────────
  const savedTheme = localStorage.getItem('a11y-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggle.setAttribute('data-theme', savedTheme);

  themeToggle.addEventListener('click', function() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    themeToggle.setAttribute('data-theme', next);
    localStorage.setItem('a11y-theme', next);
  });

  // ── Criteria modal ──────────────────────────────────────────────
  const criteriaModal = document.getElementById('criteriaModal');
  const closeModal    = document.getElementById('closeModal');

  if (closeModal && criteriaModal) {
    closeModal.addEventListener('click', function() {
      criteriaModal.classList.add('hidden');
    });

    criteriaModal.addEventListener('click', function(e) {
      if (e.target === criteriaModal) {
        criteriaModal.classList.add('hidden');
      }
    });
  }

  // ── Score modal ─────────────────────────────────────────────────
  const scoreModal      = document.getElementById('scoreModal');
  const closeScoreModal = document.getElementById('closeScoreModal');

  if (closeScoreModal && scoreModal) {
    closeScoreModal.addEventListener('click', function() {
      scoreModal.classList.add('hidden');
    });
    scoreModal.addEventListener('click', function(e) {
      if (e.target === scoreModal) scoreModal.classList.add('hidden');
    });
  }

  // Tab switching inside the score modal
  document.querySelectorAll('.modal-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.modal-tab-panel').forEach(p => p.classList.add('hidden'));
      this.classList.add('active');
      document.getElementById('tab-' + this.dataset.tab).classList.remove('hidden');
    });
  });

  // Escape HTML so descriptions never render as live DOM nodes
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }


  // ── Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      renderIssues(allIssues, this.dataset.filter);
    });
  });

  // ── Scan button
  scanButton.addEventListener('click', async function () {
    loadingDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
    emptyDiv.classList.add('hidden');
    scanButton.disabled = true;
    statusPill.textContent = 'scanning';
    statusPill.className = 'status-pill scanning';

    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');

    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

      // Check if this is a page we can actually scan
      const url = tab.url || '';
      if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('about:')) {
        loadingDiv.classList.add('hidden');
        statusPill.textContent = 'error';
        statusPill.className = 'status-pill';
        issuesList.innerHTML = '<div class="issue-card error"><div class="severity-bar"></div><div class="issue-body"><div class="issue-type">Cannot Scan This Page</div><div class="issue-description">Browser and extension pages cannot be scanned. Navigate to a regular website and try again.</div></div></div>';
        resultsDiv.classList.remove('hidden');
        return;
      }

      // If tab is still loading, wait for it
      if (tab.status === 'loading') {
        await new Promise(function(resolve) {
          function onUpdated(tabId, info) {
            if (tabId === tab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(onUpdated);
              resolve();
            }
          }
          chrome.tabs.onUpdated.addListener(onUpdated);
          // Fallback timeout after 10s
          setTimeout(resolve, 10000);
        });
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scanPageForAccessibility
      });

      const scanResult = results[0].result;
      allIssues = scanResult.issues;

      loadingDiv.classList.add('hidden');
      statusPill.textContent = scanResult.totalIssues + ' issue' + (scanResult.totalIssues !== 1 ? 's' : '');
      statusPill.className = 'status-pill done';

      if (scanResult.totalIssues === 0) {
        emptyDiv.classList.remove('hidden');
      } else {
        const scoreData = calculateScore(scanResult.issues, scanResult.elementCounts);
        buildSummary(scanResult, scoreData);
        renderIssues(allIssues, 'all');
        resultsDiv.classList.remove('hidden');
        lastScanResult = scanResult;
        lastScoreData  = scoreData;
        document.getElementById('exportBar').classList.remove('hidden');
      }

    } catch (error) {
      console.error('Scan error:', error);
      loadingDiv.classList.add('hidden');
      statusPill.textContent = 'error';
      statusPill.className = 'status-pill';
      const msg = error && error.message
        ? error.message.includes('Cannot access') || error.message.includes('permissions')
          ? 'This page cannot be scanned due to browser restrictions. Try a regular website.'
          : error.message.includes('No tab')
          ? 'No active tab found. Click on a webpage first, then scan.'
          : 'Could not scan this page. Try refreshing and scanning again.'
        : 'Could not scan this page. Try refreshing and scanning again.';
      issuesList.innerHTML = '<div class="issue-card error"><div class="severity-bar"></div><div class="issue-body"><div class="issue-type">Scan Failed</div><div class="issue-description">' + msg + '</div></div></div>';
      resultsDiv.classList.remove('hidden');
    } finally {
      scanButton.disabled = false;
    }
  });

  // ── Calculate WCAG score ────────────────────────────────────────
  function calculateScore(issues, elementCounts) {
    if (issues.length === 0) return { score: 100, grade: 'A+', level: 'AA' };

    // ── New scoring model ────────────────────────────────────────
    // The old model divided by totalElements which made large pages always score ~100.
    // New model: start at 100, deduct points per unique criterion violated + per-instance
    // penalty that has diminishing returns (so 64 empty links doesn't score same as 6).

    // Step 1: Group issues by type and count unique criteria violated
    const byType = {};
    issues.forEach(function(issue) {
      if (!byType[issue.type]) byType[issue.type] = { severity: issue.severity, count: 0 };
      byType[issue.type].count++;
    });

    // Step 2: Deductions per issue type
    // Base deduction for the criterion being violated at all (presence penalty)
    // + scaled instance penalty with sqrt dampening so volume doesn't dominate
    let totalDeduction = 0;

    Object.keys(byType).forEach(function(type) {
      const mapping  = wcagMapping[type];
      if (!mapping) return;
      const group    = byType[type];
      const weight   = mapping.weight;           // 5–10
      const level    = mapping.level;            // 'A' or 'AA'
      const count    = group.count;
      const severity = group.severity;

      // Base deduction: how serious is it that this criterion is violated at all?
      // Level A errors: 8–12 pts, Level A warnings: 4–7 pts, Level AA errors: 5–9 pts
      let base;
      if (severity === 'error'   && level === 'A')  base = 4 + weight * 0.4;   // 7.6–8
      else if (severity === 'error'   && level === 'AA') base = 2 + weight * 0.3;   // 4.4–5
      else if (severity === 'warning' && level === 'A')  base = 1.5 + weight * 0.2; // 2.9–3.5
      else if (severity === 'warning' && level === 'AA') base = 1 + weight * 0.15;  // 1.9–2.5
      else base = 0.5;                                                               // info

      // Instance bonus: sqrt(count) with 0.22 factor so volume matters but doesn't dominate
      const instanceBonus = (weight * 0.22) * Math.sqrt(count);

      totalDeduction += base + instanceBonus;
    });

    // Normalise: cap total deduction at 100 so score never goes below 0
    const rawScore = Math.max(0, Math.round(100 - totalDeduction));

    // Determine WCAG level based on which criteria are violated.
    // Separate hard errors from advisory warnings/info within each level.
    const levelAErrors   = issues.filter(i => i.severity === 'error'  && wcagMapping[i.type] && wcagMapping[i.type].level === 'A').length;
    const levelAAErrors  = issues.filter(i => i.severity === 'error'  && wcagMapping[i.type] && wcagMapping[i.type].level === 'AA').length;
    const levelAAdvisory = issues.filter(i => i.severity !== 'error'  && wcagMapping[i.type] && wcagMapping[i.type].level === 'A').length;

    let level;
    if (levelAErrors === 0 && levelAAErrors === 0 && levelAAdvisory === 0) {
      level = 'AA';        // No violations → likely AA conformant
    } else if (levelAErrors === 0 && levelAAErrors === 0) {
      level = 'AA*';       // Only advisory warnings → probably AA with caveats
    } else if (levelAErrors === 0) {
      level = 'A';         // Level A clear, but AA errors exist → conforming at A only
    } else {
      level = 'Failing';   // Level A errors present → not conforming
    }

    // Graduated ceiling based on how many Level A errors exist.
    // 1 error → max 91 (A-), 2–3 → max 84 (B), 4–9 → max 79 (C+), 10+ → max 69 (D+)
    // Prevents a single minor issue from tanking an otherwise clean page to C+.
    let finalScore = rawScore;
    if      (levelAErrors >= 10) finalScore = Math.min(rawScore, 69);
    else if (levelAErrors >= 4)  finalScore = Math.min(rawScore, 79);
    else if (levelAErrors >= 2)  finalScore = Math.min(rawScore, 84);
    else if (levelAErrors === 1) finalScore = Math.min(rawScore, 91);
    else if (levelAAErrors > 0)  finalScore = Math.min(rawScore, 94);

    // Grade from final score
    let grade = 'F';
    if (finalScore >= 97) grade = 'A+';
    else if (finalScore >= 93) grade = 'A';
    else if (finalScore >= 90) grade = 'A-';
    else if (finalScore >= 87) grade = 'B+';
    else if (finalScore >= 83) grade = 'B';
    else if (finalScore >= 80) grade = 'B-';
    else if (finalScore >= 77) grade = 'C+';
    else if (finalScore >= 73) grade = 'C';
    else if (finalScore >= 70) grade = 'C-';
    else if (finalScore >= 60) grade = 'D';

    return { score: finalScore, grade, level };
  }

  // ── Open & populate the score modal ────────────────────────────
  function openScoreModal(scoreData, issues) {
    // Header hero
    const gradeEl = document.getElementById('sm-grade');
    gradeEl.textContent  = scoreData.grade;
    gradeEl.className    = 'score-hero-grade score-grade grade-' + scoreData.grade.replace('+','plus').replace('-','minus').toLowerCase();
    document.getElementById('sm-score').textContent = scoreData.score + '/100';
    document.getElementById('sm-level').textContent = 'WCAG Level: ' + scoreData.level;

    // Highlight active WCAG level row
    const levelMap = { 'AA': 'wl-aa', 'AA*': 'wl-aastar', 'A': 'wl-a', 'Failing': 'wl-fail' };
    ['wl-aa','wl-aastar','wl-a','wl-fail'].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active-level', id === levelMap[scoreData.level]);
    });

    // Build per-issue-type breakdown table
    const byType = {};
    issues.forEach(function(issue) {
      if (!byType[issue.type]) byType[issue.type] = { severity: issue.severity, count: 0 };
      byType[issue.type].count++;
    });

    let totalDeduction = 0;
    const rows = [];

    Object.keys(byType).sort().forEach(function(type) {
      const mapping = wcagMapping[type];
      if (!mapping) return;
      const { severity, count } = byType[type];
      const { weight, level } = mapping;

      let base;
      if (severity === 'error'   && level === 'A')  base = 4 + weight * 0.4;
      else if (severity === 'error'   && level === 'AA') base = 2 + weight * 0.3;
      else if (severity === 'warning' && level === 'A')  base = 1.5 + weight * 0.2;
      else if (severity === 'warning' && level === 'AA') base = 1 + weight * 0.15;
      else base = 0.5;
      const instanceBonus = (weight * 0.22) * Math.sqrt(count);
      const rowTotal      = base + instanceBonus;
      totalDeduction     += rowTotal;

      rows.push({
        type, count, severity, level,
        base: base.toFixed(1),
        bonus: instanceBonus.toFixed(1),
        total: rowTotal.toFixed(1)
      });
    });

    // Sort by total deduction descending
    rows.sort(function(a, b) { return parseFloat(b.total) - parseFloat(a.total); });

    let tableHtml =
      '<div class="breakdown-row breakdown-row-header">' +
        '<span>Issue type</span>' +
        '<span style="text-align:center">Count</span>' +
        '<span style="text-align:right">Base</span>' +
        '<span style="text-align:right">Total</span>' +
      '</div>';

    rows.forEach(function(r) {
      tableHtml +=
        '<div class="breakdown-row">' +
          '<span class="bdr-type">' + esc(r.type) + ' <small style="color:var(--muted);font-size:10px;">(' + r.level + ' ' + r.severity + ')</small></span>' +
          '<span class="bdr-count">×' + r.count + '</span>' +
          '<span class="bdr-base">−' + r.base + '</span>' +
          '<span class="bdr-total ' + r.severity + '">−' + r.total + '</span>' +
        '</div>';
    });

    document.getElementById('sm-breakdown-table').innerHTML = tableHtml;
    document.getElementById('sm-total-deduction').textContent =
      '−' + Math.min(totalDeduction, 100).toFixed(1) + ' pts → ' + scoreData.score + '/100';

    // Reset to breakdown tab
    document.querySelectorAll('.modal-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.tab === 'breakdown');
    });
    document.querySelectorAll('.modal-tab-panel').forEach(function(p) {
      p.classList.toggle('hidden', p.id !== 'tab-breakdown');
    });

    scoreModal.classList.remove('hidden');
  }

  // ── Summary strip
  function buildSummary(scanResult, scoreData) {
    const c = scanResult.elementCounts;
    const errors   = scanResult.issues.filter(i => i.severity === 'error').length;
    const warnings = scanResult.issues.filter(i => i.severity === 'warning').length;
    const total = c.images + c.links + c.inputs + c.buttons;
    
    summaryStrip.innerHTML = 
      '<div class="summary-section score-section">' +
        '<div class="score-header">' +
          '<span class="summary-label">Score</span>' +
          '<button class="info-btn-inline" id="criteriaBtn" aria-label="Score breakdown and what we check" title="Score breakdown">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
              '<circle cx="12" cy="12" r="10"/>' +
              '<line x1="12" y1="16" x2="12" y2="12"/>' +
              '<line x1="12" y1="8" x2="12.01" y2="8"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
        '<span class="summary-stats">' +
          '<span class="score-grade grade-' + scoreData.grade.replace('+', 'plus').replace('-', 'minus').toLowerCase() + '">' + scoreData.grade + '</span>' +
          '<span class="score-number">' + scoreData.score + '/100</span>' +
        '</span>' +
      '</div>' +
      '<div class="summary-divider"></div>' +
      '<div class="summary-section">' +
        '<span class="summary-label">WCAG Level</span>' +
        '<span class="summary-stats wcag-level wcag-level-' + scoreData.level.replace('*', 'star').toLowerCase() + '">' + scoreData.level + '</span>' +
      '</div>' +
      '<div class="summary-divider"></div>' +
      '<div class="summary-section">' +
        '<span class="summary-label">Issues</span>' +
        '<span class="summary-stats">' +
          '<span class="stat-error">' + errors + '</span>' +
          (warnings > 0 ? '<span class="stat-sep">·</span><span class="stat-warn">' + warnings + '</span>' : '') +
        '</span>' +
      '</div>';
    
    // Attach info button → opens score modal (with live data)
    setTimeout(function() {
      const criteriaBtn = document.getElementById('criteriaBtn');
      if (criteriaBtn) {
        criteriaBtn.addEventListener('click', function() {
          openScoreModal(scoreData, scanResult.issues);
        });
      }
    }, 10);
  }

  // ── Render issue cards (grouped by type)
  function renderIssues(issues, filter) {
    const filtered = filter === 'all' ? issues : issues.filter(i => i.severity === filter);

    if (filtered.length === 0) {
      issuesList.innerHTML = '<div style="text-align:center;padding:30px 20px;color:var(--muted);font-family:var(--font-mono);font-size:11px;letter-spacing:0.04em;">No ' + filter + ' issues found</div>';
      return;
    }

    // Group by type
    const groups = {};
    filtered.forEach(function(issue) {
      if (!groups[issue.type]) groups[issue.type] = { severity: issue.severity, items: [] };
      groups[issue.type].items.push(issue);
    });

    let html = '';
    Object.keys(groups).forEach(function(type) {
      const group    = groups[type];
      const severity = group.severity;
      const items    = group.items;
      const count    = items.length;
      const groupId  = 'group-' + type.replace(/\s+/g, '-').toLowerCase();

      if (count === 1) {
        const issue     = items[0];
        const clickable = issue.tag ? 'clickable' : '';
        const dataTag   = issue.tag ? 'data-tag="' + issue.tag + '"' : '';
        const fixId     = 'fix-' + type.replace(/\s+/g, '-').toLowerCase() + '-0';
        const hasFix    = fixSuggestions[type];
        
        html += '<div class="issue-card ' + severity + ' ' + clickable + '" ' + dataTag + '>' +
          '<div class="severity-bar"></div>' +
          '<div class="issue-body">' +
            '<div class="issue-type">' + esc(type) + '</div>' +
            '<div class="issue-description">' + esc(issue.description) + '</div>' +
            (hasFix ? '<button class="fix-toggle" data-fix-id="' + fixId + '">💡 How to fix</button>' : '') +
            (hasFix ? '<div class="fix-panel hidden" id="' + fixId + '">' +
              '<div class="fix-title">' + esc(fixSuggestions[type].title) + '</div>' +
              '<div class="fix-explanation">' + esc(fixSuggestions[type].explanation) + '</div>' +
              '<pre class="fix-code"><code>' + esc(fixSuggestions[type].code) + '</code></pre>' +
            '</div>' : '') +
            (issue.tag ? '<div class="click-hint">&#x2197; Click to highlight on page</div>' : '') +
          '</div></div>';
      } else {
        const hasFix = fixSuggestions[type];
        let childCards = '';
        items.forEach(function(issue, idx) {
          const clickable = issue.tag ? 'clickable' : '';
          const dataTag   = issue.tag ? 'data-tag="' + issue.tag + '"' : '';
          const fixId     = 'fix-' + type.replace(/\s+/g, '-').toLowerCase() + '-' + idx;
          
          childCards += '<div class="issue-card ' + severity + ' ' + clickable + ' child-card" ' + dataTag + '>' +
            '<div class="severity-bar"></div>' +
            '<div class="issue-body">' +
              '<div class="issue-description">' + esc(issue.description) + '</div>' +
              (hasFix && idx === 0 ? '<button class="fix-toggle" data-fix-id="' + fixId + '">💡 How to fix</button>' : '') +
              (hasFix && idx === 0 ? '<div class="fix-panel hidden" id="' + fixId + '">' +
                '<div class="fix-title">' + esc(fixSuggestions[type].title) + '</div>' +
                '<div class="fix-explanation">' + esc(fixSuggestions[type].explanation) + '</div>' +
                '<pre class="fix-code"><code>' + esc(fixSuggestions[type].code) + '</code></pre>' +
              '</div>' : '') +
              (issue.tag ? '<div class="click-hint">&#x2197; Click to highlight on page</div>' : '') +
            '</div></div>';
        });

        html += '<div class="issue-group ' + severity + '">' +
          '<button class="group-header" data-group="' + groupId + '">' +
            '<div class="group-left">' +
              '<div class="severity-bar"></div>' +
              '<div class="group-info">' +
                '<span class="issue-type">' + esc(type) + '</span>' +
                '<span class="group-count">' + count + ' instances</span>' +
              '</div>' +
            '</div>' +
            '<span class="group-chevron">&#x25BE;</span>' +
          '</button>' +
          '<div class="group-body hidden" id="' + groupId + '">' + childCards + '</div>' +
        '</div>';
      }
    });

    issuesList.innerHTML = html;

    // Toggle group open/close
    document.querySelectorAll('.group-header').forEach(function(btn) {
      btn.addEventListener('click', function () {
        const body    = document.getElementById(this.dataset.group);
        const chevron = this.querySelector('.group-chevron');
        const isOpen  = !body.classList.contains('hidden');
        body.classList.toggle('hidden');
        chevron.innerHTML = isOpen ? '&#x25BE;' : '&#x25B4;';
        this.classList.toggle('open', !isOpen);
      });
    });

    // Fix toggle listeners
    document.querySelectorAll('.fix-toggle').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation(); // Don't trigger card click
        const fixPanel = document.getElementById(this.dataset.fixId);
        const isOpen   = !fixPanel.classList.contains('hidden');
        fixPanel.classList.toggle('hidden');
        this.textContent = isOpen ? '💡 How to fix' : '✕ Close';
        this.classList.toggle('active', !isOpen);
      });
    });

    attachClickListeners();
  }

  // ── Click-to-highlight
  function attachClickListeners() {
    document.querySelectorAll('.issue-card.clickable').forEach(function(item) {
      item.addEventListener('click', async function () {
        const tag = this.getAttribute('data-tag');
        if (!tag) return;
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: highlightElement,
            args: [tag]
          });
        } catch (error) {
          console.error('Highlight error:', error);
        }
      });
    });
  }

  // ── Close panel on tab switch ───────────────────────────────────
  chrome.tabs.onActivated.addListener(function() {
    window.close();
  });

  // ── Focus Order Visualiser ──────────────────────────────────────
  focusOrderBtn.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

      if (!focusOrderActive) {
        // Inject badges
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: injectFocusOrderBadges
        });
        focusOrderActive = true;
        focusOrderBtn.classList.add('active');
        focusOrderBtn.querySelector('.btn-label').textContent = 'Clear Focus Order';
        focusOrderBtn.querySelector('.focus-order-nums').textContent = '✕';
      } else {
        // Clear badges
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: clearFocusOrderBadges
        });
        focusOrderActive = false;
        focusOrderBtn.classList.remove('active');
        focusOrderBtn.querySelector('.btn-label').textContent = 'Show Focus Order';
        focusOrderBtn.querySelector('.focus-order-nums').textContent = '1\u20092\u20093';
      }
    } catch (err) {
      console.error('Focus order error:', err);
    }
  });

  // ── Export PDF ──────────────────────────────────────────────────
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', function() {
      if (!lastScanResult || !lastScoreData) return;
      exportPdfBtn.classList.add('exporting');
      exportPdfBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg> Preparing…';
      setTimeout(function() {
        generatePdfReport(lastScanResult, lastScoreData);
        exportPdfBtn.classList.remove('exporting');
        exportPdfBtn.innerHTML = 'Export Report';
      }, 80);
    });
  }

  function generatePdfReport(scanResult, scoreData) {
    const now      = new Date();
    const dateStr  = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr  = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const pageTitle = scanResult.pageTitle || '(untitled)';
    const errors    = scanResult.issues.filter(function(i) { return i.severity === 'error'; }).length;
    const warnings  = scanResult.issues.filter(function(i) { return i.severity === 'warning'; }).length;
    const infos     = scanResult.issues.filter(function(i) { return i.severity === 'info'; }).length;

    const gradeColors = {
      'A+': '#10b981', 'A': '#22c55e', 'A-': '#84cc16',
      'B+': '#eab308', 'B': '#f59e0b', 'B-': '#f97316',
      'C+': '#ef4444', 'C': '#dc2626', 'C-': '#b91c1c',
      'D':  '#991b1b', 'F': '#7f1d1d'
    };
    const gradeColor  = gradeColors[scoreData.grade] || '#6b7280';
    const levelColors = { 'AA': '#10b981', 'AA*': '#22c55e', 'A': '#f59e0b', 'Failing': '#ef4444' };
    const levelColor  = levelColors[scoreData.level] || '#6b7280';

    // Build per-type breakdown (mirrors scoring logic)
    const byType = {};
    scanResult.issues.forEach(function(issue) {
      if (!byType[issue.type]) byType[issue.type] = { severity: issue.severity, count: 0 };
      byType[issue.type].count++;
    });

    const breakdownRows = [];
    let totalDeductionPdf = 0;
    Object.keys(byType).forEach(function(type) {
      const mapping = wcagMapping[type];
      if (!mapping) return;
      const severity = byType[type].severity;
      const count    = byType[type].count;
      const weight   = mapping.weight;
      const level    = mapping.level;
      let base;
      if (severity === 'error'   && level === 'A')  base = 4 + weight * 0.4;
      else if (severity === 'error'   && level === 'AA') base = 2 + weight * 0.3;
      else if (severity === 'warning' && level === 'A')  base = 1.5 + weight * 0.2;
      else if (severity === 'warning' && level === 'AA') base = 1 + weight * 0.15;
      else base = 0.5;
      const instanceBonus = (weight * 0.22) * Math.sqrt(count);
      const rowTotal      = base + instanceBonus;
      totalDeductionPdf  += rowTotal;
      breakdownRows.push({ type: type, count: count, severity: severity, level: level, criterion: mapping.criterion || '', base: base.toFixed(1), total: rowTotal.toFixed(1) });
    });
    breakdownRows.sort(function(a, b) { return parseFloat(b.total) - parseFloat(a.total); });

    const sevDotColor = { error: '#ff4d6a', warning: '#ffb547', info: '#60a5fa' };

    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // Build grouped issues HTML
    const groups = {};
    scanResult.issues.forEach(function(issue) {
      if (!groups[issue.type]) groups[issue.type] = { severity: issue.severity, items: [] };
      groups[issue.type].items.push(issue);
    });

    const sortedTypes = Object.keys(groups).sort(function(a, b) {
      const order = { error: 0, warning: 1, info: 2 };
      return (order[groups[a].severity] || 9) - (order[groups[b].severity] || 9);
    });

    let issuesSectionHtml = '';
    sortedTypes.forEach(function(type) {
      const group    = groups[type];
      const severity = group.severity;
      const items    = group.items;
      const mapping  = wcagMapping[type] || {};
      const fix      = fixSuggestions[type];
      const dotColor = sevDotColor[severity] || '#6b7280';
      const badgeMap = {
        error:   { bg: '#fff1f3', text: '#ff4d6a', border: '#fecdd3' },
        warning: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
        info:    { bg: '#eff6ff', text: '#3b82f6', border: '#bfdbfe' }
      };
      const badge = badgeMap[severity] || badgeMap.info;

      issuesSectionHtml +=
        '<div style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;break-inside:avoid;">' +
          '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">' +
            '<div style="width:10px;height:10px;border-radius:50%;background:' + dotColor + ';flex-shrink:0;"></div>' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:13px;font-weight:700;color:#111827;">' + escHtml(type) + '</div>' +
              (mapping.criterion ? '<div style="font-size:11px;color:#6b7280;margin-top:1px;">WCAG ' + escHtml(mapping.criterion) + ' · Level ' + escHtml(mapping.level || '') + '</div>' : '') +
            '</div>' +
            '<span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:' + badge.bg + ';color:' + badge.text + ';border:1px solid ' + badge.border + ';white-space:nowrap;">' + severity + ' · ' + items.length + ' instance' + (items.length !== 1 ? 's' : '') + '</span>' +
          '</div>' +
          '<div style="padding:12px 16px;">' +
            '<ul style="margin:0;padding:0 0 0 16px;list-style:disc;">' +
              items.map(function(i) { return '<li style="font-size:12px;color:#374151;line-height:1.6;margin-bottom:2px;">' + escHtml(i.description) + '</li>'; }).join('') +
            '</ul>' +
            (fix ?
              '<div style="margin-top:12px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;border-left:3px solid ' + dotColor + ';">' +
                '<div style="font-size:12px;font-weight:700;color:#111827;margin-bottom:4px;">💡 ' + escHtml(fix.title) + '</div>' +
                '<div style="font-size:11px;color:#4b5563;line-height:1.6;margin-bottom:8px;">' + escHtml(fix.explanation) + '</div>' +
                '<pre style="margin:0;padding:10px 12px;background:#1e2128;border-radius:5px;font-family:\'DM Mono\',monospace;font-size:10.5px;color:#eceff4;line-height:1.6;overflow-x:auto;white-space:pre-wrap;word-break:break-all;">' + escHtml(fix.code) + '</pre>' +
              '</div>' : '') +
          '</div>' +
        '</div>';
    });

    // Score breakdown table rows
    let breakdownTableRows = '';
    breakdownRows.forEach(function(r) {
      const dotColor = sevDotColor[r.severity] || '#6b7280';
      breakdownTableRows +=
        '<tr style="border-bottom:1px solid #f3f4f6;">' +
          '<td style="padding:8px 12px;font-size:12px;color:#111827;">' + escHtml(r.type) + ' <span style="font-size:10px;color:#9ca3af;">(' + r.level + ' ' + r.severity + ')</span></td>' +
          '<td style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:center;">×' + r.count + '</td>' +
          '<td style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:right;">−' + r.base + '</td>' +
          '<td style="padding:8px 12px;font-size:12px;font-weight:700;color:' + dotColor + ';text-align:right;">−' + r.total + '</td>' +
        '</tr>';
    });

    const metaCards = [
      ['Images',  scanResult.elementCounts.images],
      ['Links',   scanResult.elementCounts.links],
      ['Inputs',  scanResult.elementCounts.inputs],
      ['Buttons', scanResult.elementCounts.buttons]
    ].map(function(pair) {
      return '<div style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;text-align:center;">' +
        '<div style="font-family:\'DM Mono\',monospace;font-size:18px;font-weight:600;color:#111827;">' + pair[1] + '</div>' +
        '<div style="font-size:11px;color:#9ca3af;margin-top:2px;">' + pair[0] + '</div>' +
      '</div>';
    }).join('');

    const html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
      '<meta charset="UTF-8">\n' +
      '<title>Accessibility Report \u2014 ' + escHtml(pageTitle) + '</title>\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
      '<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">\n' +
      '<style>\n' +
      '* { margin:0; padding:0; box-sizing:border-box; }\n' +
      'body { font-family:\'Plus Jakarta Sans\',sans-serif; background:#fff; color:#111827; font-size:13px; line-height:1.5; }\n' +
      '.page { max-width:780px; margin:0 auto; padding:48px 40px; }\n' +
      '@media print {\n' +
      '  body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }\n' +
      '  .no-print { display:none !important; }\n' +
      '  .page { padding:24px 28px; }\n' +
      '  h2 { break-after:avoid; }\n' +
      '}\n' +
      'h2 { font-family:\'Plus Jakarta Sans\',sans-serif; font-size:15px; font-weight:700; color:#111827; margin:32px 0 14px; padding-bottom:8px; border-bottom:1.5px solid #e5e7eb; }\n' +
      'table { width:100%; border-collapse:collapse; }\n' +
      'th { font-family:\'DM Mono\',monospace; font-size:10px; letter-spacing:0.06em; text-transform:uppercase; color:#9ca3af; font-weight:600; padding:8px 12px; text-align:left; background:#f9fafb; border-bottom:1px solid #e5e7eb; }\n' +
      'th:nth-child(2) { text-align:center; }\n' +
      'th:nth-child(3), th:nth-child(4) { text-align:right; }\n' +
      '</style>\n</head>\n<body>\n' +
      '<div class="no-print" style="position:sticky;top:0;z-index:999;background:#111827;color:#d1fae5;padding:11px 24px;font-family:\'Plus Jakarta Sans\',sans-serif;font-size:12.5px;letter-spacing:0.01em;border-bottom:1px solid #00e5a033;">' +
        '🖨&nbsp; To save as PDF: press <strong style="color:#00e5a0;">Cmd+P</strong> (Mac) or <strong style="color:#00e5a0;">Ctrl+P</strong> (Windows) → set destination to <strong style="color:#fff;">Save as PDF</strong>' +
      '</div>\n' +
      '<div class="page">\n\n' +

      // ── Header
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #111827;">' +
        '<div>' +
          '<div style="font-family:\'DM Mono\',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">a11y · Accessibility Report</div>' +
          '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:26px;font-weight:800;color:#111827;line-height:1.1;max-width:480px;word-break:break-word;">' + escHtml(pageTitle) + '</div>' +
          '<div style="margin-top:8px;font-size:12px;color:#6b7280;font-family:\'DM Mono\',monospace;">' + escHtml(dateStr) + ' at ' + escHtml(timeStr) + '</div>' +
        '</div>' +
        '<div style="text-align:right;flex-shrink:0;margin-left:20px;">' +
          '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:52px;font-weight:800;line-height:1;color:' + gradeColor + ';">' + escHtml(scoreData.grade) + '</div>' +
          '<div style="font-family:\'DM Mono\',monospace;font-size:16px;font-weight:600;color:#374151;margin-top:2px;">' + scoreData.score + '/100</div>' +
          '<div style="display:inline-block;margin-top:6px;padding:4px 12px;border-radius:20px;background:' + levelColor + '22;color:' + levelColor + ';font-family:\'DM Mono\',monospace;font-size:11px;font-weight:700;letter-spacing:0.05em;border:1.5px solid ' + levelColor + ';">' + escHtml(scoreData.level) + '</div>' +
        '</div>' +
      '</div>\n\n' +

      // ── Metadata
      '<h2>Page Metadata</h2>\n' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px;">' + metaCards + '</div>\n' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">' +
        '<div style="padding:12px;background:#fff1f3;border:1px solid #fecdd3;border-radius:8px;text-align:center;"><div style="font-family:\'DM Mono\',monospace;font-size:22px;font-weight:700;color:#ff4d6a;">' + errors + '</div><div style="font-size:11px;color:#9ca3af;margin-top:2px;">Errors</div></div>' +
        '<div style="padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;text-align:center;"><div style="font-family:\'DM Mono\',monospace;font-size:22px;font-weight:700;color:#d97706;">' + warnings + '</div><div style="font-size:11px;color:#9ca3af;margin-top:2px;">Warnings</div></div>' +
        '<div style="padding:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;text-align:center;"><div style="font-family:\'DM Mono\',monospace;font-size:22px;font-weight:700;color:#3b82f6;">' + infos + '</div><div style="font-size:11px;color:#9ca3af;margin-top:2px;">Info</div></div>' +
      '</div>\n\n' +

      // ── Score Breakdown
      '<h2>Score Breakdown</h2>\n' +
      '<div style="padding:16px 20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:14px;font-size:12px;color:#6b7280;line-height:1.7;">' +
        'The score starts at <strong style="color:#111827;">100</strong> and deducts points for each violated criterion. ' +
        'Each type carries a <strong style="color:#111827;">base deduction</strong> (Level A errors: 8–12 pts, AA errors: 4–5 pts, warnings: 2–4 pts) ' +
        'plus a <strong style="color:#111827;">volume penalty</strong> using diminishing returns (√count × weight × 0.22). ' +
        'Pages with Level A errors have a score ceiling: 1 → max 91, 2–3 → max 84, 4–9 → max 79, 10+ → max 69.' +
      '</div>\n' +
      (breakdownRows.length > 0
        ? '<div style="border:1px solid #e5e7eb;border-radius:8px 8px 0 0;overflow:hidden;">' +
            '<table><thead><tr><th>Issue type</th><th>Count</th><th>Base</th><th>Total deduction</th></tr></thead>' +
            '<tbody>' + breakdownTableRows + '</tbody></table></div>' +
            '<div style="display:flex;justify-content:space-between;padding:10px 12px;background:#f3f4f6;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;font-family:\'DM Mono\',monospace;font-size:12px;font-weight:700;color:#111827;">' +
              '<span>Total deduction</span><span>−' + Math.min(totalDeductionPdf, 100).toFixed(1) + ' pts \u2192 ' + scoreData.score + '/100</span>' +
            '</div>'
        : '<div style="padding:12px;color:#9ca3af;font-size:12px;">No deductions.</div>') + '\n\n' +

      // ── Issues
      '<h2 style="margin-top:36px;">Issues (' + scanResult.issues.length + ')</h2>\n' +
      (issuesSectionHtml || '<div style="padding:16px;color:#9ca3af;font-size:12px;text-align:center;">No issues found.</div>') + '\n\n' +

      // ── Footer
      '<div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">' +
        '<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:#9ca3af;letter-spacing:0.05em;">Generated by a11y Accessibility Scanner</div>' +
        '<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:#9ca3af;">25 automated WCAG checks · Manual testing required for full audit</div>' +
      '</div>\n\n' +

      '</div>\n' +
      '</body>\n</html>';

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
  }

});

// ================================================================
// PAGE-CONTEXT FUNCTIONS
// ================================================================

function scanPageForAccessibility() {
  function tagElement(element, index) {
    const tag = 'a11y-' + index + '-' + Date.now();
    element.setAttribute('data-a11y-tag', tag);
    return tag;
  }

  function isVisible(element) {
    const rect  = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    if (rect.width === 0 || rect.height === 0) return false;
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
    if (style.opacity === '0') return false;
    if (rect.bottom < -200 || rect.right < -200) return false;
    if (rect.top > document.documentElement.scrollHeight + 200) return false;
    return true;
  }

  const issues = [];
  let elementIndex = 0;

  // Check 1: Images without alt text
  const images = document.querySelectorAll('img');
  images.forEach(function(img, index) {
    if (!img.hasAttribute('alt') && isVisible(img)) {
      const tag = tagElement(img, elementIndex++);
      issues.push({ type: 'Missing Alt Text', severity: 'error', description: 'Image #' + (index + 1) + ' is missing alt text', tag: tag });
    }
  });

  // Check 2: Links with no accessible name
  const links = document.querySelectorAll('a');
  links.forEach(function(link, index) {
    const text           = link.textContent.trim();
    const ariaLabel      = link.getAttribute('aria-label');
    const ariaLabelledby = link.getAttribute('aria-labelledby');

    if (!text && !ariaLabel && !ariaLabelledby && isVisible(link)) {
      const childWithLabel = link.querySelector('[aria-label], [aria-labelledby], [title]');
      if (childWithLabel) {
        const childLabel = (childWithLabel.getAttribute('aria-label') || childWithLabel.getAttribute('title') || childWithLabel.getAttribute('aria-labelledby') || '').trim().replace(/\s+/g, ' ');
        const childTag   = childWithLabel.tagName.toLowerCase();
        const tag = tagElement(link, elementIndex++);
        issues.push({ type: 'Misplaced Accessible Name', severity: 'warning', description: ('Link #' + (index + 1) + ' has accessible name "' + childLabel + '" on a child <' + childTag + '> — move it to the <a> tag.').trim(), tag: tag });
      } else {
        const tag = tagElement(link, elementIndex++);
        issues.push({ type: 'Empty Link', severity: 'error', description: 'Link #' + (index + 1) + ' has no accessible text, aria-label, or aria-labelledby', tag: tag });
      }
    }
  });

  // Check 3: Form inputs without labels
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(function(input, index) {
    const hasLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby') || document.querySelector('label[for="' + input.id + '"]');
    if (!hasLabel && input.type !== 'hidden' && input.type !== 'submit' && isVisible(input)) {
      const tag = tagElement(input, elementIndex++);
      issues.push({ type: 'Input Without Label', severity: 'error', description: 'Form input #' + (index + 1) + ' is missing a label', tag: tag });
    }
  });

  // Check 4: Missing page language
  if (!document.documentElement.getAttribute('lang')) {
    issues.push({ type: 'Missing Language Attribute', severity: 'warning', description: 'Page is missing lang attribute on <html> element', tag: null });
  }

  // Check 5: Buttons without accessible names
  const buttons = document.querySelectorAll('button');
  buttons.forEach(function(button, index) {
    const text           = button.textContent.trim();
    const ariaLabel      = button.getAttribute('aria-label');
    const ariaLabelledby = button.getAttribute('aria-labelledby');
    const title          = button.getAttribute('title');
    if (!text && !ariaLabel && !ariaLabelledby && !title && isVisible(button)) {
      const tag = tagElement(button, elementIndex++);
      issues.push({ type: 'Button Without Accessible Name', severity: 'error', description: 'Button #' + (index + 1) + ' has no accessible name for screen readers', tag: tag });
    }
  });

  // Check 6: Heading hierarchy
  const headings    = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const headingList = Array.from(headings).filter(function(h) { return isVisible(h); });

  const h1s = headingList.filter(function(h) { return h.tagName === 'H1'; });
  if (h1s.length === 0) {
    issues.push({ type: 'Missing H1', severity: 'error', description: 'Page has no H1 heading. Every page should have one main heading.', tag: null });
  } else if (h1s.length > 1) {
    h1s.forEach(function(h1, index) {
      const tag = tagElement(h1, elementIndex++);
      issues.push({ type: 'Multiple H1s', severity: 'warning', description: 'Page has ' + h1s.length + ' H1 headings (H1 #' + (index + 1) + ': "' + h1.textContent.trim().substring(0, 50) + '"). There should only be one.', tag: tag });
    });
  }

  for (let i = 1; i < headingList.length; i++) {
    const prevLevel = parseInt(headingList[i - 1].tagName[1]);
    const currLevel = parseInt(headingList[i].tagName[1]);
    const currText  = headingList[i].textContent.trim().substring(0, 50);
    if (currLevel > prevLevel + 1) {
      const tag = tagElement(headingList[i], elementIndex++);
      issues.push({ type: 'Skipped Heading Level', severity: 'warning', description: 'Heading jumps from H' + prevLevel + ' to H' + currLevel + ' ("' + currText + '"). H' + (prevLevel + 1) + ' is missing.', tag: tag });
    }
  }

  // Check 7: Missing page title
  if (!document.title || document.title.trim() === '') {
    issues.push({ type: 'Missing Page Title', severity: 'error', description: 'Page has no <title> element. Screen readers announce the title when the page loads.', tag: null });
  }

  // Check 8: Landmark regions
  const hasMain = document.querySelector('main, [role="main"]');
  if (!hasMain) {
    issues.push({ type: 'Missing Main Landmark', severity: 'warning', description: 'Page has no <main> landmark. Screen reader users rely on landmarks to navigate quickly.', tag: null });
  }

  const hasNav = document.querySelector('nav, [role="navigation"]');
  if (!hasNav && links.length > 3) {
    issues.push({ type: 'Missing Navigation Landmark', severity: 'info', description: 'Page has multiple links but no <nav> landmark to group navigation.', tag: null });
  }

  // Check 9: Multiple <main> landmarks
  const allMains = document.querySelectorAll('main, [role="main"]');
  if (allMains.length > 1) {
    allMains.forEach(function(el, idx) {
      const tag = tagElement(el, elementIndex++);
      issues.push({ type: 'Multiple Main Landmarks', severity: 'warning', description: 'Page has ' + allMains.length + ' <main> landmarks (instance ' + (idx + 1) + '). There should be exactly one.', tag: tag });
    });
  }

  // Check 10: Positive tabindex
  const posTabElements = document.querySelectorAll('[tabindex]');
  posTabElements.forEach(function(el) {
    const val = parseInt(el.getAttribute('tabindex'), 10);
    if (val > 0 && isVisible(el)) {
      const tag = tagElement(el, elementIndex++);
      const label = el.textContent.trim().substring(0, 40) || el.tagName.toLowerCase();
      issues.push({ type: 'Positive Tabindex', severity: 'warning', description: '<' + el.tagName.toLowerCase() + '> "' + label + '" has tabindex="' + val + '". Positive values break natural tab order.', tag: tag });
    }
  });

  // Check 11: Click handlers on non-interactive elements (keyboard inaccessible)
  const clickableNonInteractive = document.querySelectorAll('div[onclick], span[onclick], li[onclick], td[onclick], p[onclick]');
  clickableNonInteractive.forEach(function(el) {
    const hasTabindex = el.hasAttribute('tabindex');
    const hasRole     = el.hasAttribute('role');
    if (!hasTabindex && !hasRole && isVisible(el)) {
      const tag = tagElement(el, elementIndex++);
      const label = el.textContent.trim().substring(0, 40) || el.tagName.toLowerCase();
      issues.push({ type: 'Keyboard Inaccessible Element', severity: 'error', description: '<' + el.tagName.toLowerCase() + '> "' + label + '" has an onclick handler but is not keyboard accessible (no tabindex or role).', tag: tag });
    }
  });

  // Check 12: Color contrast (approximation using computed styles)
  // We sample visible text elements and check contrast ratio
  function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(function(c) {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  function parseColor(color) {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null;
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
    return null;
  }

  function getEffectiveBackground(el) {
    let node = el;
    while (node && node !== document.documentElement) {
      const bg = window.getComputedStyle(node).backgroundColor;
      const parsed = parseColor(bg);
      if (parsed) return parsed;
      node = node.parentElement;
    }
    return [255, 255, 255]; // fallback white
  }

  function contrastRatio(l1, l2) {
    const lighter = Math.max(l1, l2);
    const darker  = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // Sample text-bearing elements (limit to 60 to keep scan fast)
  const textSelectors = 'p, li, td, th, h1, h2, h3, h4, h5, h6, label, span, a, button';
  const textEls = Array.from(document.querySelectorAll(textSelectors))
    .filter(function(el) {
      return isVisible(el) && el.textContent.trim().length > 2 && el.children.length === 0;
    })
    .slice(0, 60);

  const contrastIssues = new Set();

  textEls.forEach(function(el) {
    const style    = window.getComputedStyle(el);
    const fgParsed = parseColor(style.color);
    if (!fgParsed) return;

    const bgParsed = getEffectiveBackground(el);
    const fgLum    = getLuminance(...fgParsed);
    const bgLum    = getLuminance(...bgParsed);
    const ratio    = contrastRatio(fgLum, bgLum);

    // Determine if large text (18pt = 24px, or 14pt bold = ~18.67px bold)
    const fontSize  = parseFloat(style.fontSize);
    const fontWeight = parseInt(style.fontWeight, 10);
    const isLarge   = fontSize >= 24 || (fontSize >= 18.67 && fontWeight >= 700);
    const threshold = isLarge ? 3.0 : 4.5;

    if (ratio < threshold && ratio > 1) {
      const sig = fgParsed.join(',') + '|' + bgParsed.join(',');
      if (!contrastIssues.has(sig)) {
        contrastIssues.add(sig);
        const tag = tagElement(el, elementIndex++);
        const textSnippet = el.textContent.trim().substring(0, 40);
        issues.push({
          type: 'Low Color Contrast',
          severity: 'error',
          description: '"' + textSnippet + '" has a contrast ratio of ' + ratio.toFixed(2) + ':1 (needs ' + threshold + ':1). Text: rgb(' + fgParsed.join(',') + '), Background: rgb(' + bgParsed.join(',') + ').',
          tag: tag
        });
      }
    }
  });

  // Check 13: Suspicious empty alt text (alt="" on linked or complex images)
  images.forEach(function(img, index) {
    if (img.getAttribute('alt') === '' && isVisible(img)) {
      const isLinked  = img.closest('a') !== null;
      const hasTitle  = img.getAttribute('title');
      const src       = (img.getAttribute('src') || '').toLowerCase();
      // Flag if inside a link (must have alt) or src suggests content (photo, chart, graph, etc.)
      const looksInformational = /photo|chart|graph|diagram|banner|hero|product|screenshot|logo/.test(src);
      if (isLinked) {
        const tag = tagElement(img, elementIndex++);
        issues.push({ type: 'Suspicious Empty Alt Text', severity: 'error', description: 'Image #' + (index + 1) + ' is inside a link but has alt="". Linked images must have descriptive alt text.', tag: tag });
      } else if (looksInformational && !hasTitle) {
        const tag = tagElement(img, elementIndex++);
        issues.push({ type: 'Suspicious Empty Alt Text', severity: 'warning', description: 'Image #' + (index + 1) + ' has alt="" but its filename suggests it may be informational: "' + src.split('/').pop() + '".', tag: tag });
      }
    }
  });

  // ── KEYBOARD NAVIGATION CHECKS ─────────────────────────────────

  // Check 14: Native interactive elements removed from tab order without justification
  const nativeInteractive = document.querySelectorAll('a[href], button, input, select, textarea');
  nativeInteractive.forEach(function(el) {
    if (el.getAttribute('tabindex') === '-1' && isVisible(el)) {
      const inDialog = el.closest('[role="dialog"], dialog, [aria-modal="true"]');
      if (!inDialog) {
        const tag = tagElement(el, elementIndex++);
        const label = (el.getAttribute('aria-label') || el.textContent.trim() || el.getAttribute('type') || el.tagName.toLowerCase()).substring(0, 40);
        issues.push({
          type: 'Focusable Element Removed from Tab Order',
          severity: 'error',
          description: '<' + el.tagName.toLowerCase() + '> "' + label + '" has tabindex="-1", making it unreachable by keyboard navigation.',
          tag: tag
        });
      }
    }
  });

  // Check 15: Custom ARIA widgets missing tabindex (not keyboard reachable)
  const interactiveRoles = ['tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'treeitem', 'gridcell', 'row', 'columnheader', 'rowheader'];
  const customWidgets = document.querySelectorAll(interactiveRoles.map(r => '[role="' + r + '"]').join(','));
  customWidgets.forEach(function(el) {
    const hasTabindex = el.hasAttribute('tabindex');
    const parent = el.parentElement;
    const parentHasRovingTabindex = parent && parent.querySelector('[tabindex="0"]');
    if (!hasTabindex && !parentHasRovingTabindex && isVisible(el)) {
      const tag = tagElement(el, elementIndex++);
      const roleVal = el.getAttribute('role');
      const label = (el.getAttribute('aria-label') || el.textContent.trim()).substring(0, 40);
      issues.push({
        type: 'Custom Widget Missing Tabindex',
        severity: 'error',
        description: 'Element with role="' + roleVal + '" ("' + label + '") has no tabindex — it cannot be reached by keyboard.',
        tag: tag
      });
    }
  });

  // Check 16: Toggle buttons missing aria-expanded
  const toggleCandidates = document.querySelectorAll('button[aria-controls], button[data-toggle], button[data-bs-toggle], button[data-target]');
  toggleCandidates.forEach(function(el) {
    if (!el.hasAttribute('aria-expanded') && isVisible(el)) {
      const tag = tagElement(el, elementIndex++);
      const label = (el.getAttribute('aria-label') || el.textContent.trim()).substring(0, 40);
      issues.push({
        type: 'Missing aria-expanded on Toggle',
        severity: 'warning',
        description: 'Button "' + label + '" controls another element but is missing aria-expanded to announce its open/closed state.',
        tag: tag
      });
    }
  });

  // Also catch buttons whose text suggests they are toggles
  const toggleKeywords = /\b(menu|nav|dropdown|collapse|expand|toggle|accordion|drawer|sidebar)\b/i;
  document.querySelectorAll('button').forEach(function(btn) {
    const label = (btn.getAttribute('aria-label') || btn.textContent.trim()).substring(0, 80);
    if (toggleKeywords.test(label) && !btn.hasAttribute('aria-expanded') && !btn.hasAttribute('aria-controls') && isVisible(btn)) {
      const tag = tagElement(btn, elementIndex++);
      issues.push({
        type: 'Missing aria-expanded on Toggle',
        severity: 'info',
        description: 'Button "' + label.substring(0, 40) + '" may toggle content but has no aria-expanded. Add it if this button shows/hides a region.',
        tag: tag
      });
    }
  });

  // Check 17: Dialog/modal elements missing focus management attributes
  const dialogs = document.querySelectorAll('dialog, [role="dialog"], [role="alertdialog"]');
  dialogs.forEach(function(el) {
    const hasAriaModal   = el.getAttribute('aria-modal') === 'true';
    const hasAriaLabel   = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
    const isNativeDialog = el.tagName.toLowerCase() === 'dialog';
    const hasTabindex    = el.hasAttribute('tabindex');

    const missingAttrs = [];
    if (!isNativeDialog && !hasAriaModal) missingAttrs.push('aria-modal="true"');
    if (!hasAriaLabel) missingAttrs.push('aria-label or aria-labelledby');
    if (!isNativeDialog && !hasTabindex) missingAttrs.push('tabindex="-1"');

    if (missingAttrs.length > 0 && isVisible(el)) {
      const tag = tagElement(el, elementIndex++);
      issues.push({
        type: 'Dialog Missing Focus Management',
        severity: 'error',
        description: 'Dialog is missing: ' + missingAttrs.join(', ') + '. Without these, keyboard focus may escape the dialog.',
        tag: tag
      });
    }
  });

  // Check 18: Custom dropdowns missing keyboard support signals
  const customDropdowns = document.querySelectorAll('[role="listbox"], [role="combobox"]');
  customDropdowns.forEach(function(el) {
    const roleVal       = el.getAttribute('role');
    const hasExpanded   = el.hasAttribute('aria-expanded');
    const hasControls   = el.hasAttribute('aria-controls') || el.hasAttribute('aria-owns');
    const hasActiveDesc = el.hasAttribute('aria-activedescendant');

    const missingAttrs = [];
    if (roleVal === 'combobox' && !hasExpanded) missingAttrs.push('aria-expanded');
    if (!hasControls && !hasActiveDesc) missingAttrs.push('aria-controls or aria-activedescendant');

    if (missingAttrs.length > 0 && isVisible(el)) {
      const tag = tagElement(el, elementIndex++);
      const label = (el.getAttribute('aria-label') || el.textContent.trim().substring(0, 40));
      issues.push({
        type: 'Custom Dropdown Missing Keyboard Support',
        severity: 'warning',
        description: 'role="' + roleVal + '" ("' + label + '") is missing: ' + missingAttrs.join(', ') + '. Keyboard users may not be able to operate this widget.',
        tag: tag
      });
    }
  });

  // Check 19: onclick handlers on non-native elements without keyboard equivalents
  const onclickElements = document.querySelectorAll('[onclick]');
  onclickElements.forEach(function(el) {
    const tagName = el.tagName.toLowerCase();
    const isNativelyKeyboardOperable = ['a', 'button', 'input', 'select', 'textarea'].includes(tagName);
    if (isNativelyKeyboardOperable) return;

    const hasKeyHandler = el.hasAttribute('onkeydown') || el.hasAttribute('onkeyup') || el.hasAttribute('onkeypress');
    const hasRole       = el.hasAttribute('role');
    const hasTabindex   = el.hasAttribute('tabindex');

    // Skip elements already caught by check 11 (div/span/li/td/p with no role or tabindex)
    const alreadyCaught = ['div', 'span', 'li', 'td', 'p'].includes(tagName) && !hasTabindex && !hasRole;
    if (alreadyCaught) return;

    if (!hasKeyHandler && isVisible(el)) {
      const eleTag = tagElement(el, elementIndex++);
      const label = (el.getAttribute('aria-label') || el.textContent.trim()).substring(0, 40);
      issues.push({
        type: 'Missing Keyboard Handler on Interactive Element',
        severity: 'warning',
        description: '<' + tagName + '> "' + label + '" has onclick but no keyboard handler (onkeydown/onkeyup). Keyboard users cannot activate it.',
        tag: eleTag
      });
    }
  });

  return {
    totalIssues: issues.length,
    issues: issues,
    pageTitle: document.title,
    elementCounts: { images: images.length, links: links.length, inputs: inputs.length, buttons: buttons.length }
  };
}

function highlightElement(tag) {
  // Clear previous highlights
  document.querySelectorAll('[data-a11y-highlight]').forEach(function(el) {
    el.style.outline = el.getAttribute('data-a11y-original-outline') || '';
    el.style.boxShadow = el.getAttribute('data-a11y-original-shadow') || '';
    el.removeAttribute('data-a11y-highlight');
    el.removeAttribute('data-a11y-original-outline');
    el.removeAttribute('data-a11y-original-shadow');
  });
  // Also clear any highlighted parents
  document.querySelectorAll('[data-a11y-parent-highlight]').forEach(function(el) {
    el.style.boxShadow = el.getAttribute('data-a11y-parent-original-shadow') || '';
    el.style.outline = el.getAttribute('data-a11y-parent-original-outline') || '';
    el.removeAttribute('data-a11y-parent-highlight');
    el.removeAttribute('data-a11y-parent-original-shadow');
    el.removeAttribute('data-a11y-parent-original-outline');
  });

  const oldLabel = document.getElementById('a11y-label');
  if (oldLabel) oldLabel.remove();

  const element = document.querySelector('[data-a11y-tag="' + tag + '"]');
  if (!element) return;

  // Check if element is clipped by an overflow:hidden parent
  function isClipped(el) {
    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      const style = window.getComputedStyle(parent);
      if (style.overflow === 'hidden' || style.overflow === 'clip' ||
          style.overflowX === 'hidden' || style.overflowY === 'hidden') {
        return parent;
      }
      parent = parent.parentElement;
    }
    return null;
  }

  const clippingParent = isClipped(element);
  const targetForLabel = clippingParent || element;

  // Apply outlines immediately
  element.setAttribute('data-a11y-original-outline', element.style.outline || '');
  element.setAttribute('data-a11y-original-shadow', element.style.boxShadow || '');
  element.setAttribute('data-a11y-highlight', 'true');
  element.style.outline = '3px solid #ff4d6a';
  element.style.outlineOffset = '2px';

  if (clippingParent) {
    clippingParent.setAttribute('data-a11y-parent-highlight', 'true');
    clippingParent.setAttribute('data-a11y-parent-original-shadow', clippingParent.style.boxShadow || '');
    clippingParent.setAttribute('data-a11y-parent-original-outline', clippingParent.style.outline || '');
    clippingParent.style.outline = '3px solid #ff4d6a';
    clippingParent.style.outlineOffset = '2px';
  }

  // Create label but don't position it yet
  const label = document.createElement('div');
  label.id = 'a11y-label';
  label.textContent = '⚠ Accessibility Issue';
  label.style.cssText = 'position:fixed;background:#ff4d6a;color:white;padding:4px 12px;border-radius:4px;font-size:11px;font-weight:700;z-index:999999;pointer-events:none;font-family:monospace;letter-spacing:0.04em;box-shadow:0 4px 12px rgba(255,77,106,0.4);top:-999px;left:-999px;';
  document.body.appendChild(label);

  // Update label position — called repeatedly so it tracks the element after scroll
  function updateLabelPos() {
    const r = targetForLabel.getBoundingClientRect();
    const top = r.top - 30;
    label.style.top  = Math.max(top, 8) + 'px';
    label.style.left = Math.max(r.left, 8) + 'px';
  }

  // Scroll then reposition once scroll settles
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Poll position while scroll animates (~600ms), then lock in
  let positionTicks = 0;
  const positionInterval = setInterval(function() {
    updateLabelPos();
    positionTicks++;
    if (positionTicks > 12) clearInterval(positionInterval); // stop after ~600ms
  }, 50);

  // Pulse both element and parent
  let pulse = 0;
  const pulseInterval = setInterval(function() {
    pulse++;
    const color = pulse % 2 === 0 ? '3px solid #ff4d6a' : '3px solid #ffb3bf';
    element.style.outline = color;
    if (clippingParent) clippingParent.style.outline = color;
    updateLabelPos(); // keep label synced during pulse too
  }, 500);

  setTimeout(function() {
    clearInterval(pulseInterval);
    clearInterval(positionInterval);
    element.style.outline = element.getAttribute('data-a11y-original-outline') || '';
    element.style.boxShadow = element.getAttribute('data-a11y-original-shadow') || '';
    element.removeAttribute('data-a11y-highlight');
    element.removeAttribute('data-a11y-original-outline');
    element.removeAttribute('data-a11y-original-shadow');
    if (clippingParent) {
      clippingParent.style.outline = clippingParent.getAttribute('data-a11y-parent-original-outline') || '';
      clippingParent.style.boxShadow = clippingParent.getAttribute('data-a11y-parent-original-shadow') || '';
      clippingParent.removeAttribute('data-a11y-parent-highlight');
      clippingParent.removeAttribute('data-a11y-parent-original-shadow');
      clippingParent.removeAttribute('data-a11y-parent-original-outline');
    }
    label.remove();
  }, 5000);
}

// ── PAGE-CONTEXT: Inject focus order badges ──────────────────────
function injectFocusOrderBadges() {
  // Clear any existing badges first
  document.querySelectorAll('[data-a11y-focus-badge]').forEach(function(b) { b.remove(); });

  // Collect all focusable elements in DOM order
  var candidates = Array.from(document.querySelectorAll(
    'a[href], button, input, select, textarea, details, [tabindex],' +
    '[contenteditable="true"], audio[controls], video[controls]'
  ));

  // Filter to visible + not explicitly removed from tab order by tabindex="-1"
  // BUT include tabindex="-1" elements that are custom widgets — they still appear
  // in the visual order even if unreachable; flag them differently
  function isVisible(el) {
    if (!el.offsetParent && el.tagName !== 'BODY') return false;
    var s = window.getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
  }

  var focusable = candidates.filter(function(el) {
    return isVisible(el);
  });

  // Sort: elements with positive tabindex come first (in tabindex order),
  // then everything else in DOM order (tabindex 0 / no tabindex)
  var withPositive = focusable.filter(function(el) {
    return parseInt(el.getAttribute('tabindex'), 10) > 0;
  }).sort(function(a, b) {
    return parseInt(a.getAttribute('tabindex'), 10) - parseInt(b.getAttribute('tabindex'), 10);
  });

  var withoutPositive = focusable.filter(function(el) {
    var ti = parseInt(el.getAttribute('tabindex'), 10);
    return isNaN(ti) || ti <= 0;
  });

  var ordered = withPositive.concat(withoutPositive);

  // Inject stylesheet once
  if (!document.getElementById('a11y-focus-order-styles')) {
    var style = document.createElement('style');
    style.id = 'a11y-focus-order-styles';
    style.textContent =
      '[data-a11y-focus-badge]{' +
        'position:absolute;z-index:2147483647;' +
        'width:22px;height:22px;border-radius:50%;' +
        'background:#1d4ed8;color:#fff;' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
        'font-size:10px;font-weight:700;line-height:22px;text-align:center;' +
        'box-shadow:0 2px 8px rgba(29,78,216,0.55),0 0 0 2px #fff;' +
        'pointer-events:none;' +
        'transition:opacity 0.15s;' +
      '}' +
      '[data-a11y-focus-badge].removed{' +
        'background:#6b7280;' +
        'box-shadow:0 2px 8px rgba(107,114,128,0.4),0 0 0 2px #fff;' +
        'opacity:0.65;' +
      '}' +
      '[data-a11y-focus-badge].positive{' +
        'background:#7c3aed;' +
        'box-shadow:0 2px 8px rgba(124,58,237,0.55),0 0 0 2px #fff;' +
      '}';
    document.head.appendChild(style);
  }

  ordered.forEach(function(el, i) {
    var tabindex  = parseInt(el.getAttribute('tabindex'), 10);
    var isRemoved = tabindex === -1;
    var isPositive = tabindex > 0;

    var rect = el.getBoundingClientRect();
    var scrollX = window.scrollX;
    var scrollY = window.scrollY;

    var badge = document.createElement('div');
    badge.setAttribute('data-a11y-focus-badge', 'true');
    badge.textContent = i + 1;
    if (isRemoved) badge.classList.add('removed');
    if (isPositive) badge.classList.add('positive');

    // Position relative to document
    badge.style.top  = (rect.top  + scrollY - 11) + 'px';
    badge.style.left = (rect.left + scrollX - 11) + 'px';

    // Tooltip
    var tag = el.tagName.toLowerCase();
    var label = el.getAttribute('aria-label') || el.textContent.trim().slice(0, 30) || el.getAttribute('placeholder') || el.getAttribute('type') || '';
    badge.title = '#' + (i + 1) + ' <' + tag + '>' +
      (label ? ' "' + label + '"' : '') +
      (isRemoved  ? ' — tabindex="-1" (removed from tab order)' : '') +
      (isPositive ? ' — tabindex="' + tabindex + '" (explicit order)' : '');

    document.body.appendChild(badge);
  });

  // Add legend
  if (!document.getElementById('a11y-focus-legend')) {
    var legend = document.createElement('div');
    legend.id = 'a11y-focus-legend';
    legend.style.cssText =
      'position:fixed;bottom:16px;right:16px;z-index:2147483647;' +
      'background:#111827;color:#f9fafb;border-radius:10px;padding:12px 16px;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:11px;line-height:1.8;' +
      'box-shadow:0 8px 24px rgba(0,0,0,0.4);min-width:190px;pointer-events:none;';
    legend.innerHTML =
      '<div style="font-weight:700;font-size:12px;margin-bottom:6px;letter-spacing:0.02em;">Focus Order</div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
        '<div style="width:16px;height:16px;border-radius:50%;background:#1d4ed8;flex-shrink:0;box-shadow:0 0 0 2px #fff2;"></div>' +
        '<span>Normal tab order</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
        '<div style="width:16px;height:16px;border-radius:50%;background:#7c3aed;flex-shrink:0;box-shadow:0 0 0 2px #fff2;"></div>' +
        '<span>Positive tabindex</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<div style="width:16px;height:16px;border-radius:50%;background:#6b7280;flex-shrink:0;opacity:0.65;box-shadow:0 0 0 2px #fff2;"></div>' +
        '<span>tabindex="-1" (skip)</span>' +
      '</div>';
    document.body.appendChild(legend);
  }
}

// ── PAGE-CONTEXT: Clear focus order badges ───────────────────────
function clearFocusOrderBadges() {
  document.querySelectorAll('[data-a11y-focus-badge]').forEach(function(b) { b.remove(); });
  var style = document.getElementById('a11y-focus-order-styles');
  if (style) style.remove();
  var legend = document.getElementById('a11y-focus-legend');
  if (legend) legend.remove();
}