# Accessibility Scanner

A Chrome extension that scans web pages for common accessibility issues and provides actionable fix suggestions.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![WCAG](https://img.shields.io/badge/WCAG-2.1-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- 🔍 **Automated WCAG Scanning** - Detects 9 common accessibility issues across Level A and AA
- 💡 **Fix Suggestions** - Shows code examples for each issue type
- 📊 **Compliance Score** - Grades pages A+ to F with estimated WCAG level
- 🎨 **Light & Dark Mode** - Toggle between themes for comfortable viewing
- 🔄 **Grouped Issues** - Organizes repeated issues for easy navigation
- 🎯 **Visual Highlighting** - Click any issue to highlight it on the page

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the extension folder
6. Click the extension icon to open the side panel

## What We Check

### WCAG Level A
- **1.1.1** Non-text Content — Images have alt text
- **1.3.1** Info and Relationships — Proper heading hierarchy, form labels
- **2.4.4** Link Purpose — Links have descriptive text
- **3.1.1** Language of Page — HTML lang attribute present
- **4.1.2** Name, Role, Value — Form inputs and buttons have accessible names

### WCAG Level AA
- **2.4.6** Headings and Labels — Page has one H1

## Usage

1. Navigate to any web page
2. Click the extension icon in your toolbar
3. Click **Scan This Page**
4. Review the issues found
5. Click any issue to highlight it on the page
6. Click **💡 How to fix** to see code examples

## Scoring System

The extension calculates a weighted score (0-100) based on:
- **Issue severity** - Errors weighted more than warnings
- **WCAG level** - Level A issues are weighted higher
- **Impact** - Number of affected elements

Scores translate to letter grades and estimated WCAG conformance levels.

## Limitations

This scanner only checks **automated criteria**. A complete accessibility audit requires manual testing for:
- Color contrast ratios
- Keyboard navigation
- Screen reader compatibility
- Focus management
- Touch target sizes
- Motion and animations
- And 40+ additional WCAG criteria

**This tool is a starting point, not a certification of accessibility.**

## Tech Stack

- Vanilla JavaScript (no frameworks)
- Chrome Extension Manifest V3
- Chrome Side Panel API
- Content Scripts for page analysis

## License

MIT License - See LICENSE file for details

## Contributing

Issues and pull requests are welcome! Please feel free to contribute improvements.