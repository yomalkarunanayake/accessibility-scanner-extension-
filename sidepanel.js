document.addEventListener('DOMContentLoaded', function () {
  const scanButton   = document.getElementById('scanButton');
  const resultsDiv   = document.getElementById('results');
  const issuesList   = document.getElementById('issuesList');
  const loadingDiv   = document.getElementById('loading');
  const emptyDiv     = document.getElementById('empty');
  const summaryStrip = document.getElementById('summaryStrip');
  const statusPill   = document.getElementById('statusPill');
  const themeToggle  = document.getElementById('themeToggle');

  let allIssues = [];
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
    'Skipped Heading Level': { criterion: '1.3.1 Info and Relationships', level: 'A', weight: 6 }
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
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
      }

    } catch (error) {
      console.error('Scan error:', error);
      loadingDiv.classList.add('hidden');
      statusPill.textContent = 'error';
      statusPill.className = 'status-pill';
      issuesList.innerHTML = '<div class="issue-card error"><div class="severity-bar"></div><div class="issue-body"><div class="issue-type">Scan Failed</div><div class="issue-description">Could not scan this page. Try refreshing and scanning again.</div></div></div>';
      resultsDiv.classList.remove('hidden');
    } finally {
      scanButton.disabled = false;
    }
  });

  // ── Calculate WCAG score ────────────────────────────────────────
  function calculateScore(issues, elementCounts) {
    if (issues.length === 0) return { score: 100, grade: 'A+', level: 'AA' };

    // Calculate weighted penalty
    let totalPenalty = 0;
    let maxPossiblePenalty = 0;

    issues.forEach(function(issue) {
      const mapping = wcagMapping[issue.type];
      if (mapping) {
        totalPenalty += mapping.weight;
      }
    });

    // Max penalty is if every element had an issue
    const totalElements = elementCounts.images + elementCounts.links + 
                         elementCounts.inputs + elementCounts.buttons;
    maxPossiblePenalty = totalElements * 10; // Max weight is 10

    // Calculate score (0-100)
    const rawScore = Math.max(0, 100 - (totalPenalty / maxPossiblePenalty * 100));
    const score = Math.round(rawScore);

    // Determine grade
    let grade = 'F';
    if (score >= 97) grade = 'A+';
    else if (score >= 93) grade = 'A';
    else if (score >= 90) grade = 'A-';
    else if (score >= 87) grade = 'B+';
    else if (score >= 83) grade = 'B';
    else if (score >= 80) grade = 'B-';
    else if (score >= 77) grade = 'C+';
    else if (score >= 73) grade = 'C';
    else if (score >= 70) grade = 'C-';
    else if (score >= 60) grade = 'D';

    // Determine WCAG level (conservative estimate)
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const levelAIssues = issues.filter(i => wcagMapping[i.type] && wcagMapping[i.type].level === 'A').length;
    
    let level = 'Failing';
    if (errorCount === 0 && levelAIssues === 0) level = 'AA';
    else if (errorCount === 0) level = 'A';

    return { score, grade, level };
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
          '<button class="info-btn-inline" id="criteriaBtn" aria-label="What we check" title="What we check">' +
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
        '<span class="summary-stats wcag-level">' + scoreData.level + '</span>' +
      '</div>' +
      '<div class="summary-divider"></div>' +
      '<div class="summary-section">' +
        '<span class="summary-label">Issues</span>' +
        '<span class="summary-stats">' +
          '<span class="stat-error">' + errors + '</span>' +
          (warnings > 0 ? '<span class="stat-sep">·</span><span class="stat-warn">' + warnings + '</span>' : '') +
        '</span>' +
      '</div>';
    
    // Attach info button click listener
    setTimeout(function() {
      const criteriaBtn = document.getElementById('criteriaBtn');
      if (criteriaBtn) {
        criteriaBtn.addEventListener('click', function() {
          document.getElementById('criteriaModal').classList.remove('hidden');
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