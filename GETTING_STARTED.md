# Getting Started Guide - Your First Chrome Extension

## 🎓 For the UX Designer Learning to Code

Welcome! This guide assumes you're coming from a design background and haven't coded in a while. Let's rebuild those programming muscles step by step.

## 📋 Prerequisites Setup

### 1. Install a Code Editor
**Download VS Code** (it's free and excellent):
- Go to https://code.visualstudio.com/
- Download and install for your OS
- Open VS Code and install the "Live Server" extension (optional but helpful)

### 2. Understand the File Structure

Think of a Chrome extension like an Android app:
- `manifest.json` = AndroidManifest.xml (declares what your app can do)
- `popup.html` = Your UI layout (like activity_main.xml)
- `popup.js` = Your logic (like MainActivity.java)
- `popup.css` = Styling (like styles.xml)

```
accessibility-scanner-extension/
├── manifest.json          ← "I'm a Chrome extension, here's what I do"
├── src/
│   ├── popup.html        ← "This is what users see"
│   ├── popup.css         ← "This is how it looks"
│   └── popup.js          ← "This is what it does"
└── icons/                ← Your extension's icons
```

## 🚀 Loading Your Extension (5 minutes)

### Step-by-Step:

1. **Open Chrome** (or any Chromium browser like Edge, Brave)

2. **Go to extensions page**:
   - Type `chrome://extensions/` in address bar, OR
   - Menu → Extensions → Manage Extensions

3. **Enable Developer Mode**:
   - Toggle switch in top-right corner
   - This unlocks the ability to load local extensions

4. **Load your extension**:
   - Click "Load unpacked" button (top-left)
   - Navigate to your `accessibility-scanner-extension` folder
   - Click "Select Folder"

5. **Pin it to toolbar** (optional):
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Accessibility Scanner"
   - Click the pin icon next to it

## ✅ Testing Your Extension (2 minutes)

1. **Navigate to any website** (try wikipedia.org or your portfolio site)

2. **Click your extension icon** in the toolbar

3. **Click "Scan This Page"**

4. **View results!** You should see accessibility issues found

### What to expect:
- If the page has images without alt text → You'll see issues
- If form inputs lack labels → You'll see issues
- If no issues → You'll see "No accessibility issues found!"

## 🔍 Understanding the Code

### The Key Concept: Message Passing

Chrome extensions work differently from regular websites:
- Your popup (popup.js) runs in the **extension context**
- The webpage runs in its own **page context**
- To scan a page, you need to **inject code** into that page

This is what happens when you click "Scan This Page":

```javascript
// 1. popup.js says: "Hey Chrome, run this function in the active tab"
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: scanPageForAccessibility  // This function runs IN THE PAGE
});

// 2. scanPageForAccessibility() runs on the actual webpage
// 3. It analyzes the DOM and returns issues
// 4. popup.js receives the results and displays them
```

## 🎯 Your Week 1 Tasks

### Day 1-2: Get Comfortable
- [ ] Load the extension successfully
- [ ] Test it on 5 different websites
- [ ] Make a small CSS change (try changing the button color)
- [ ] Refresh the extension and see your change

### Day 3-4: First Code Change
- [ ] Open `popup.js` in VS Code
- [ ] Find the `scanPageForAccessibility()` function
- [ ] Add a new check (I'll help you with this next!)
- [ ] Test your new check

### Day 5-7: Understand the Flow
- [ ] Add `console.log()` statements to see what's happening
- [ ] Open Chrome DevTools (F12) to view logs
- [ ] Experiment with the checks
- [ ] Read Chrome Extension docs (link below)

## 🛠️ How to Make Changes

### The Development Cycle:

1. **Edit code** in VS Code
2. **Save the file** (Ctrl+S / Cmd+S)
3. **Refresh extension**:
   - Go to chrome://extensions/
   - Click refresh icon on your extension
4. **Test** by clicking the extension icon
5. **Repeat**

**Pro tip**: Keep the extensions page open in a tab for quick refreshing!

## 🐛 When Things Go Wrong

### Extension won't load?
- Check manifest.json for syntax errors (missing commas, brackets)
- Look for red errors in chrome://extensions/

### Button doesn't work?
- Open DevTools (F12) on the popup itself:
  - Right-click the popup → "Inspect"
  - Check Console tab for errors

### No results showing?
- Try a different website
- Check if you have permissions for that site
- Look for errors in the DevTools console

## 📚 Essential Resources

### Bookmark These:
1. **Chrome Extension Docs**: https://developer.chrome.com/docs/extensions/mv3/
2. **JavaScript Refresher**: https://javascript.info/
3. **DOM Manipulation**: https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model
4. **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/

### When to Use Each:
- Chrome docs → Understanding extension-specific APIs
- JavaScript.info → Relearning JavaScript syntax
- MDN → How to work with HTML elements
- WCAG → What accessibility issues to check for

## 💪 Next Steps

Once you're comfortable with the basics, ping me and we'll:
1. Add more sophisticated accessibility checks
2. Improve the UI/UX (your strength!)
3. Add features like:
   - Export reports
   - Highlight issues on the page
   - Settings/preferences
   - Integration with axe-core library

## 🎉 You've Got This!

Remember:
- You have an engineering degree - the concepts are familiar
- JavaScript is similar to Java (just more flexible/forgiving)
- Chrome extensions are just web pages with special permissions
- Your UX background is an advantage - you'll build better tools!

The hardest part is starting. You've already done that. 🚀

---

**Questions?** Ask me anything as you go through this!
