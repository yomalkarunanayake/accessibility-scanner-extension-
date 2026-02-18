# Accessibility Scanner Chrome Extension

A Chrome extension to scan web pages for common accessibility issues.

## 🚀 Quick Start (Loading Your Extension)

### Step 1: Open Chrome Extensions Page
1. Open Google Chrome
2. Type `chrome://extensions/` in the address bar
3. Press Enter

### Step 2: Enable Developer Mode
1. Look for the toggle in the top-right corner
2. Turn ON "Developer mode"

### Step 3: Load Your Extension
1. Click "Load unpacked" button (top-left)
2. Navigate to this project folder
3. Select the `accessibility-scanner-extension` folder
4. Click "Select Folder"

### Step 4: Test It!
1. Navigate to any website (try wikipedia.org)
2. Click the extension icon in your Chrome toolbar
3. Click "Scan This Page" button
4. View the accessibility issues found!

## 📁 Project Structure

```
accessibility-scanner-extension/
├── manifest.json          # Extension configuration (like AndroidManifest.xml)
├── src/
│   ├── popup.html        # The UI that pops up when clicking the icon
│   ├── popup.css         # Styling for the popup
│   └── popup.js          # JavaScript logic for scanning
├── icons/                # Extension icons (you'll add these)
└── README.md            # This file
```

## 🎯 Current Features

The extension currently checks for:
- ✅ Images missing alt text
- ✅ Links with no accessible text
- ✅ Form inputs without labels
- ✅ Missing language attribute on page

## 🛠️ Development Setup

### Prerequisites
- Google Chrome browser
- A text editor (VS Code recommended)
- Basic understanding of HTML/CSS/JavaScript

### Making Changes
1. Edit any file in the project
2. Go to `chrome://extensions/`
3. Click the refresh icon on your extension card
4. Test your changes!

## 📚 Next Steps

### Week 1 Goals
- [x] Set up basic project structure
- [x] Create simple accessibility checks
- [ ] Add placeholder icons
- [ ] Test on multiple websites

### Week 2 Goals
- [ ] Add more accessibility checks (contrast, heading structure)
- [ ] Improve UI/UX design
- [ ] Add export functionality

### Week 3 Goals
- [ ] Integrate axe-core library for comprehensive checks
- [ ] Add highlighting of issues on the page
- [ ] Create options/settings page

### Week 4 Goals
- [ ] Polish and bug fixes
- [ ] Write documentation
- [ ] Prepare for Chrome Web Store

## 🤝 Need Help?

If you encounter issues:
1. Check the Chrome DevTools console (F12)
2. Look at the extension's background page errors in chrome://extensions
3. Review the Chrome Extension documentation

## 📖 Learning Resources

- [Chrome Extension Getting Started](https://developer.chrome.com/docs/extensions/mv3/getstarted/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Web Docs - Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
