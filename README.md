# Universal Video Alarm Clock

A versatile web application designed to function as a video/audio player alarm clock. Perfect for waking up to your favorite YouTube videos or local media files. Optimized for mobile use and can be added to your home screen as a web app.

## Features

- **Multi-Source Support**: Play YouTube videos or upload local video/audio files (MP4, MP3, etc.).
- **Smart Alarm**: Set multiple alarms that trigger media playback automatically.
- **Precision Looping**: Set A-B and C-D points for focused study or practice.
- **Loop Settings**: Configure repeat counts and pause durations between loops.
- **Soft Volume Start**: Gradually increases volume when the alarm triggers for a gentle wake-up.
- **Night Mode**: A dim, clock-only interface that prevents the screen from sleeping (using Wake Lock API).
- **Mobile Optimized**: Designed for touch interaction and "Add to Home Screen" functionality.
- **Local Persistence**: Saves your alarms and settings automatically.

## How to use as a Mobile App

1. Open the App URL in your mobile browser (Safari on iOS, Chrome on Android).
2. Tap the **Share** button (iOS) or **Menu** button (Android).
3. Select **Add to Home Screen**.
4. The app will now appear on your home screen with its own icon and run in standalone mode.

## Tech Stack

- React 19
- Tailwind CSS 4
- Lucide Icons
- Framer Motion (motion/react)
- YouTube IFrame Player API
- Screen Wake Lock API

## License

Apache-2.0

## Getting Started

### Installation & Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open the provided local URL in your browser.

### Deployment

This project is configured to be automatically deployed to GitHub Pages.
1. Push your code to the `main` or `master` branch on GitHub.
2. The GitHub Action (configured in `.github/workflows/deploy.yml`) will automatically build and deploy the app.
3. Make sure to enable GitHub Pages in your repository settings:
   - Go to **Settings** -> **Pages**
   - Under **Build and deployment**, select **GitHub Actions** as the source.
