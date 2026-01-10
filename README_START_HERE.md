# 🚀 Welcome to Your First App!

Congratulations! You've just built a modern, mobile-ready CPA Revenue Tracker. Since this is your first time, here is exactly how to get it running on your screen.

## 1. Get the "Engine" Ready (Installing Dependencies)

Every app needs local tools to run. You need to tell your computer to download these tools.

- Look for the **Terminal** in your IDE (usually at the bottom).
- Type this exactly and press Enter:
  ```bash
  npm install
  ```
- _Wait for it to finish. You'll see a lot of text, that's normal!_

## 2. Start the App

Now that the engine is ready, let's start it up.

- In the same terminal, type this and press Enter:
  ```bash
  npm run dev
  ```
- You will see a link like `http://localhost:5173`. **Click it** (or hold Ctrl and click).
- **BOOM!** Your app is now running in your browser.

## 3. See it like a Phone

Since this is a mobile app, you want to see how it looks on a phone.

- In your browser (Chrome or Edge), press **F12** to open Developer Tools.
- Click the **Device Toggle** icon (looks like a small phone/tablet icon) at the top left of the tools window.
- Select a phone (like "iPhone 12" or "Pixel 7") from the dropdown.

## 4. How to use the App

- **Track**: Enter your revenue. The app automatically knows what time it is and which "Slot" is active.
- **List**: See the full 18-slot schedule for the day.
- **Config**: Set your daily goal ($35 for Net-7, $15 for Net-15) and switch to Dark Mode.

## 📂 Where is everything?

- `src/App.jsx`: This is the **brain**. If you want to change how the app works or looks, this is where you go.
- `public/`: This is where the **skin** (icons and PWA settings) lives.

**Have fun! You are officially an app builder now. 🚀**
