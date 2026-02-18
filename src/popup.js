// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function() {
  const scanButton = document.getElementById('scanButton');
  const resultsDiv = document.getElementById('results');
  const issuesList = document.getElementById('issuesList');
  const loadingDiv = document.getElementById('loading');
  
  scanButton.addEventListener('click', async function() {
    loadingDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
    scanButton.disabled = true;
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scanPageForAccessibility
      });
      
      displayResults(results[0].result);
      
    } catch (error) {
      console.error('Scan error:', error);
      issuesList.innerHTML = '<p class="issue-item">Error scanning page. Please try again.</p>';
      resultsDiv.classList.remove('hidden');
    } finally {
      loadingDiv.classList.add('hidden');
      scanButton.disabled = false;
    }
  });
});

// This function runs IN THE PAGE CONTEXT (not in the extension)
function scanPageForAccessibility() {

  // Tags each element with a unique identifier so we can find it again later
  function tagElement(element, index) {
    const tag = `a11y-${index}-${Date.now()}`;
    element.setAttribute('data-a11y-tag', tag);
    return tag;
  }

  // Only report elements that are actually visible on the page
  // Invisible elements can't be highlighted, so we skip them
  function isVisible(element) {
    const rect = element.getBoundingClientRect();
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
  images.forEach((img, index) => {
    if (!img.hasAttribute('alt') && isVisible(img)) {
      const tag = tagElement(img, elementIndex++);
      issues.push({
        type: 'Missing Alt Text',
        severity: 'error',
        description: `Image #${index + 1} is missing alt text`,
        element: img.outerHTML.substring(0, 100),
        tag: tag
      });
    }
  });
  
  // Check 2: Links with no text
  const links = document.querySelectorAll('a');
  links.forEach((link, index) => {
    const text = link.textContent.trim();
    const ariaLabel = link.getAttribute('aria-label');
    const ariaLabelledby = link.getAttribute('aria-labelledby');

    // Has no accessible name at all
    if (!text && !ariaLabel && !ariaLabelledby && isVisible(link)) {

      // Sub-check: does ANY child element have the aria-label instead?
      // This catches svg, img, span, div, i, button, etc.
      const childWithLabel = link.querySelector('[aria-label], [aria-labelledby], [title]');

      if (childWithLabel) {
        // Get whichever label attribute exists on the child
        const childLabel = childWithLabel.getAttribute('aria-label') || 
                           childWithLabel.getAttribute('title') ||
                           childWithLabel.getAttribute('aria-labelledby');
        const childTag = childWithLabel.tagName.toLowerCase();
        const tag = tagElement(link, elementIndex++);
        issues.push({
          type: 'Misplaced Accessible Name',
          severity: 'warning',
          description: `Link #${index + 1} has accessible name "${childLabel}" on a child <${childTag}> instead of the <a> tag itself. Screen readers may not announce this correctly.`,
          element: link.outerHTML.substring(0, 150),
          tag: tag
        });
      } else {
        // Truly empty link with no accessible name anywhere
        const tag = tagElement(link, elementIndex++);
        issues.push({
          type: 'Empty Link',
          severity: 'error',
          description: `Link #${index + 1} has no accessible text, aria-label, or aria-labelledby`,
          element: link.outerHTML.substring(0, 100),
          tag: tag
        });
      }
    }
  });
  
  // Check 3: Form inputs without labels
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach((input, index) => {
    const hasLabel = input.hasAttribute('aria-label') || 
                     input.hasAttribute('aria-labelledby') ||
                     document.querySelector(`label[for="${input.id}"]`);
    
    if (!hasLabel && input.type !== 'hidden' && input.type !== 'submit' && isVisible(input)) {
      const tag = tagElement(input, elementIndex++);
      issues.push({
        type: 'Input Without Label',
        severity: 'error',
        description: `Form input #${index + 1} is missing a label`,
        element: input.outerHTML.substring(0, 100),
        tag: tag
      });
    }
  });
  
  // Check 4: Missing page language (whole page issue, no element to highlight)
  const htmlLang = document.documentElement.getAttribute('lang');
  if (!htmlLang) {
    issues.push({
      type: 'Missing Language Attribute',
      severity: 'warning',
      description: 'Page is missing lang attribute on <html> element',
      element: '<html>',
      tag: null
    });
  }

  // Check 5: Buttons without accessible names
  const buttons = document.querySelectorAll('button');
  buttons.forEach((button, index) => {
    const text = button.textContent.trim();
    const ariaLabel = button.getAttribute('aria-label');
    const ariaLabelledby = button.getAttribute('aria-labelledby');
    const title = button.getAttribute('title');
    
    const hasAccessibleName = text || ariaLabel || ariaLabelledby || title;
    
    if (!hasAccessibleName && isVisible(button)) {
      const tag = tagElement(button, elementIndex++);
      issues.push({
        type: 'Button Without Accessible Name',
        severity: 'error',
        description: `Button #${index + 1} has no accessible name for screen readers`,
        element: button.outerHTML.substring(0, 100),
        tag: tag
      });
    }
  });

// Check 6: Heading hierarchy
const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
const headingList = Array.from(headings).filter(h => isVisible(h));

// Check 6a: Page should have exactly one H1
const h1s = headingList.filter(h => h.tagName === 'H1');
if (h1s.length === 0) {
  issues.push({
    type: 'Missing H1',
    severity: 'error',
    description: 'Page has no H1 heading. Every page should have one main heading.',
    element: '<body>',
    tag: null
  });
} else if (h1s.length > 1) {
  h1s.forEach((h1, index) => {
    const tag = tagElement(h1, elementIndex++);
    issues.push({
      type: 'Multiple H1s',
      severity: 'warning',
      description: `Page has ${h1s.length} H1 headings (found H1 #${index + 1}: "${h1.textContent.trim().substring(0, 50)}"). There should only be one.`,
      element: h1.outerHTML.substring(0, 100),
      tag: tag
    });
  });
}

// Check 6b: Headings should not skip levels
for (let i = 1; i < headingList.length; i++) {
  const prevLevel = parseInt(headingList[i - 1].tagName[1]);
  const currLevel = parseInt(headingList[i].tagName[1]);
  const currText = headingList[i].textContent.trim().substring(0, 50);

  // A jump of more than 1 level is a skip (e.g. H1 → H3)
  if (currLevel > prevLevel + 1) {
    const tag = tagElement(headingList[i], elementIndex++);
    issues.push({
      type: 'Skipped Heading Level',
      severity: 'warning',
      description: `Heading jumps from H${prevLevel} to H${currLevel} ("${currText}"). H${prevLevel + 1} is missing between them.`,
      element: headingList[i].outerHTML.substring(0, 100),
      tag: tag
    });
  }
}
  
  return {
    totalIssues: issues.length,
    issues: issues,
    pageTitle: document.title,
    elementCounts: {
      images: images.length,
      links: links.length,
      inputs: inputs.length,
      buttons: buttons.length
    }
  };
}

function displayResults(scanResult) {
  const resultsDiv = document.getElementById('results');
  const issuesList = document.getElementById('issuesList');
  
  resultsDiv.classList.remove('hidden');
  
  if (scanResult.totalIssues === 0) {
    issuesList.innerHTML = '<p class="no-issues">✓ No accessibility issues found!</p>';
    return;
  }
  
  const counts = scanResult.elementCounts;
  let html = `
    <div class="scan-summary">
      <span class="total">Scanned ${counts.images + counts.links + counts.inputs + counts.buttons} elements:</span>
      ${counts.images} images, ${counts.links} links, ${counts.inputs} inputs, ${counts.buttons} buttons
    </div>
    <p style="margin-bottom: 15px; font-weight: 600;">Found ${scanResult.totalIssues} issue(s)</p>
  `;

  scanResult.issues.forEach((issue) => {
    const severityClass = issue.severity === 'error' ? '' : issue.severity;
    const clickable = issue.tag ? 'clickable' : '';
    const dataTag = issue.tag ? `data-tag="${issue.tag}"` : '';
    
    html += `
      <div class="issue-item ${severityClass} ${clickable}" ${dataTag}>
        <div class="issue-type">${issue.type}</div>
        <div class="issue-description">${issue.description}</div>
        ${issue.tag ? '<div class="click-hint">↗ Click to highlight on page</div>' : ''}
      </div>
    `;
  });
  
  issuesList.innerHTML = html;

  // Add click listeners
  setTimeout(() => {
    document.querySelectorAll('.issue-item.clickable').forEach(item => {
      item.addEventListener('click', async function() {
        const tag = this.getAttribute('data-tag');
        
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: highlightElement,
            args: [tag]
          });
        } catch (error) {
          console.error('Error highlighting:', error);
        }
      });
    });
  }, 100);
}

// This function runs IN THE PAGE to highlight an element
function highlightElement(tag) {
  // Remove previous highlights
  document.querySelectorAll('[data-a11y-highlight]').forEach(el => {
    el.style.outline = el.getAttribute('data-a11y-original-outline') || '';
    el.removeAttribute('data-a11y-highlight');
    el.removeAttribute('data-a11y-original-outline');
  });

  // Remove previous label
  const oldLabel = document.getElementById('a11y-label');
  if (oldLabel) oldLabel.remove();

  // Find element by its unique tag
  const element = document.querySelector(`[data-a11y-tag="${tag}"]`);
  if (!element) return;
  
  // Scroll into view
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Store original outline and apply highlight
  element.setAttribute('data-a11y-original-outline', element.style.outline || '');
  element.setAttribute('data-a11y-highlight', 'true');
  element.style.outline = '3px solid #e74c3c';
  element.style.outlineOffset = '3px';

  // Add a floating label above the element
  const rect = element.getBoundingClientRect();
  const label = document.createElement('div');
  label.id = 'a11y-label';
  label.textContent = '⚠ Accessibility Issue';
  label.style.cssText = `
    position: fixed;
    top: ${Math.max(rect.top - 30, 10)}px;
    left: ${rect.left}px;
    background: #e74c3c;
    color: white;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    z-index: 999999;
    pointer-events: none;
    font-family: sans-serif;
  `;
  document.body.appendChild(label);
  
  // Pulse the outline
  let pulse = 0;
  const pulseInterval = setInterval(() => {
    pulse++;
    element.style.outline = pulse % 2 === 0 
      ? '3px solid #e74c3c' 
      : '3px solid #ff8a80';
  }, 500);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    clearInterval(pulseInterval);
    element.style.outline = element.getAttribute('data-a11y-original-outline') || '';
    element.removeAttribute('data-a11y-highlight');
    element.removeAttribute('data-a11y-original-outline');
    label.remove();
  }, 5000);
}