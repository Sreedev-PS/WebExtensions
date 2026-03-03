# Naukri Profile Auto-Updater Browser Extension

A browser extension that automatically updates your Naukri resume headline every 10 seconds.

## Features

✅ **Auto-Update Headlines** - Rotates through multiple headlines every 10 seconds  
✅ **Easy Control** - Start/Stop with one click  
✅ **Custom Headlines** - Add, edit, and manage your headline list  
✅ **Background Execution** - Continues running even when popup is closed  
✅ **Real-time Status** - See current headline and update status  

## Installation

### For Chrome:

1. **Clone/Download the extension files** to your computer
2. Open Chrome and go to `chrome://extensions/`
3. Toggle **"Developer mode"** (top right corner)
4. Click **"Load unpacked"**
5. Select the `naukri-auto-update` folder
6. The extension is now installed! 🎉

### For Firefox:

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on"**
3. Select `manifest.json` from the `naukri-auto-update` folder
4. The extension is now loaded (until you restart Firefox)

## How to Use

1. **Navigate to your Naukri profile**: Go to https://www.naukri.com/mprofile/view
2. **Open the extension**: Click the extension icon in your browser toolbar
3. **Add Headlines** (optional):
   - Type a headline in the text area
   - Click "Add Headline" or press Enter
   - Your headlines will be saved automatically
4. **Start Updates**:
   - Click "Start Auto-Update" button
   - The status will show "🟢 Running"
   - Your headline will rotate every 10 seconds
5. **Stop Updates**: Click "Stop Auto-Update" button

## Default Headlines

If no headlines are added, these default headlines will be used:

- Experienced Developer III Software Engineer with expertise in Angular, JavaScript, TypeScript
- Full-stack Developer - Angular & Node.js Specialist
- Software Engineer - Web Development & Problem Solving Expert
- Developer III - Building scalable web applications with modern tech stack

## Files Explained

- **manifest.json** - Extension configuration and permissions
- **background.js** - Handles the 10-second interval logic
- **content.js** - Injects code into Naukri pages to update the headline
- **popup.html** - UI for the extension popup
- **popup.js** - Controls the popup interactions

## How It Works

1. The extension runs a background service that maintains a list of headlines
2. Every 10 seconds, it rotates to the next headline
3. It sends the headline to the content script on the active Naukri tab
4. The content script finds the resume headline field and updates it
5. The update cycles through all headlines in your list

## Tips

- Keep headlines between 100-500 characters for best results
- More headlines = longer rotation cycle (e.g., 5 headlines = 50 seconds to cycle)
- Make sure you're logged in to Naukri before starting
- The extension runs in the background, so you can close the popup and continue browsing
- Updates only happen when you have a Naukri tab open

## Troubleshooting

**Headlines not updating?**
- Make sure you're on a Naukri profile page
- Check that the extension status shows "Running"
- Try refreshing the page and starting again

**Can't see the extension icon?**
- Check if the extension is enabled in `chrome://extensions/`
- Pin the extension to your toolbar (click extensions icon, then pin)

## Privacy & Security

This extension:
- ✅ Only works on naukri.com
- ✅ Doesn't collect or send any of your data
- ✅ Runs locally on your browser
- ✅ No external API calls

Enjoy automated updates! 🚀
