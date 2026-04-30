# App Store Submission & Update Guide

This guide covers the full process for submitting the LandinGit iOS app to the App Store and releasing updates.

## Prerequisites

1. **Apple Developer Account** ($99/year) — [developer.apple.com](https://developer.apple.com)
2. **Expo Account** (free) — [expo.dev](https://expo.dev)
3. **EAS CLI** installed globally:
   ```bash
   npm install -g eas-cli
   eas login
   ```

## One-Time Setup

### 1. Configure App Identity

Update `mobile/app.json` with your App Store details:

```json
{
  "expo": {
    "name": "LandinGit",
    "slug": "landingit",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.github.adamsilverstein.landingit",
      "buildNumber": "1",
      "supportsTablet": true
    }
  }
}
```

### 2. Initialize EAS

From the `mobile/` directory:

```bash
cd mobile
eas build:configure
```

This creates `eas.json` with build profiles. The recommended configuration is already provided in this repo (see `mobile/eas.json`).

### 3. Create App Store Connect Entry

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** > **+** > **New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: LandinGit
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: Select the one matching your `bundleIdentifier`
   - **SKU**: `landingit-ios`
4. Save

### 4. Generate Apple Credentials

EAS handles credentials automatically on first build. When prompted:
- **Distribution Certificate**: Let EAS generate one
- **Provisioning Profile**: Let EAS generate one

Or manage manually:
```bash
eas credentials
```

## First Submission

### Step 1: Build for App Store

```bash
cd mobile
eas build --platform ios --profile production
```

This builds a `.ipa` file signed for App Store distribution. The build runs on Expo's cloud infrastructure (takes ~15-20 minutes).

### Step 2: Submit to App Store

```bash
eas submit --platform ios
```

When prompted:
- Select the build you just created
- Enter your Apple ID and app-specific password (or use ASC API key — see Automation section below)

Or combine build + submit in one step:
```bash
eas build --platform ios --profile production --auto-submit
```

### Step 3: Complete App Store Listing

In [App Store Connect](https://appstoreconnect.apple.com):

1. **App Information**
   - Category: Developer Tools
   - Subcategory: (none)

2. **Pricing and Availability**
   - Price: Free
   - Availability: All territories (or select specific ones)

3. **App Privacy**
   - Data types collected: None (all data stays on-device; GitHub token stored in Keychain)
   - Privacy policy URL: Link to your privacy policy

4. **Version Information**
   - Screenshots (required sizes):
     - 6.7" (iPhone 15 Pro Max): 1290 x 2796
     - 6.5" (iPhone 14 Plus): 1284 x 2778
     - 5.5" (iPhone 8 Plus): 1242 x 2208 (optional but recommended)
     - iPad Pro 12.9": 2048 x 2732 (if supporting iPad)
   - Description:
     ```
     Monitor your GitHub pull requests on the go. LandinGit brings
     your PR workflow to iOS with real-time CI status, review tracking,
     and powerful filtering — all from one screen.

     Features:
     • Multi-repo PR monitoring
     • Color-coded CI status indicators
     • Review tracking (approvals, changes requested, comments)
     • Filter by ownership, status, labels, and more
     • Sort by updated, created, repo, status, author, or reviews
     • Secure token storage in iOS Keychain
     • Auto-refresh with configurable intervals
     • Dark theme matching GitHub's design
     ```
   - Keywords: `github, pull requests, code review, ci, developer tools, git`
   - Support URL: `https://github.com/adamsilverstein/landingit/issues`

5. **Review Information**
   - Notes for reviewer:
     ```
     This app requires a GitHub Personal Access Token to function.
     For review purposes, you can create a token at:
     https://github.com/settings/tokens/new?scopes=repo

     The app displays pull requests and issues from GitHub repositories
     the user configures. No user data is collected or transmitted to
     any server other than GitHub's API.
     ```

### Step 4: Submit for Review

Click **Submit for Review** in App Store Connect. Apple's review typically takes 24-48 hours.

## Releasing Updates

### Version Bumps

1. Update version in `mobile/app.json`:
   ```json
   {
     "expo": {
       "version": "1.1.0",
       "ios": {
         "buildNumber": "2"
       }
     }
   }
   ```

   - `version`: Semantic version shown to users (e.g., 1.0.0 → 1.1.0)
   - `buildNumber`: Incremented for every build submitted to Apple (must be unique)

2. Build and submit:
   ```bash
   eas build --platform ios --profile production --auto-submit
   ```

3. In App Store Connect, add release notes under **What's New in This Version**

4. Submit for review

### OTA Updates (No App Store Review)

For JavaScript-only changes (no native module changes), you can push updates instantly using EAS Update:

```bash
eas update --branch production --message "Fix filter bug"
```

Users receive the update next time they open the app. No App Store review required.

**When OTA works:** UI changes, bug fixes, new screens, style changes
**When OTA doesn't work:** New native modules, Expo SDK upgrades, new permissions

## Automated Builds via GitHub Actions

This repo includes a GitHub Actions workflow (`.github/workflows/build-ios.yml`) that automatically:

1. **On push to `main`** (affecting `mobile/` or `shared/`): Builds an iOS preview for internal testing
2. **On version tag** (`v*-ios`): Builds and submits to App Store

### Setup for CI

1. Create an Expo token:
   ```bash
   eas login
   # Go to https://expo.dev/settings/access-tokens and create a robot token
   ```

2. Create an App Store Connect API key:
   - Go to [App Store Connect > Users and Access > Integrations > App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api)
   - Generate a new key with **App Manager** role
   - Download the `.p8` file
   - Note the **Key ID** and **Issuer ID**

3. Add GitHub repository secrets:
   - `EXPO_TOKEN`: Your Expo robot token
   - `ASC_KEY_ID`: App Store Connect API Key ID
   - `ASC_ISSUER_ID`: App Store Connect Issuer ID
   - `ASC_API_KEY_P8`: Contents of the `.p8` file (base64 encoded)

### Triggering a Release

```bash
# Tag a release
git tag v1.1.0-ios
git push origin v1.1.0-ios
```

The workflow will build, submit to App Store Connect, and you just need to add release notes and click "Submit for Review" in ASC.

## TestFlight (Beta Testing)

All builds submitted via `eas submit` automatically appear in TestFlight.

1. In App Store Connect, go to **TestFlight**
2. Add internal testers (up to 100, no review needed)
3. Add external testers (up to 10,000, requires brief review)
4. Testers install via the TestFlight app

### Internal Testing Workflow

```bash
# Build and submit for TestFlight
eas build --platform ios --profile production --auto-submit

# Or use the preview profile for faster dev builds
eas build --platform ios --profile preview
```

## Troubleshooting

### Build Fails

```bash
# Check build logs
eas build:list
eas build:view <build-id>

# Clear credentials and retry
eas credentials --platform ios
```

### Rejection Common Reasons

1. **Missing privacy policy** — Add a URL in App Store Connect
2. **Crashes on launch** — Test on real device via TestFlight first
3. **Incomplete metadata** — Ensure all required screenshots and descriptions are filled
4. **Guideline 4.2 (Minimum Functionality)** — Ensure the app provides enough value beyond a website wrapper

### Credential Issues

```bash
# Reset all iOS credentials
eas credentials --platform ios

# Sync with Apple Developer Portal
eas credentials --platform ios --type provisioning-profile
```

## Cost Summary

| Item | Cost | Frequency |
|------|------|-----------|
| Apple Developer Program | $99 | Annual |
| Expo / EAS Build | Free (30 builds/mo) | Monthly |
| EAS Submit | Free | Per submission |
| EAS Update (OTA) | Free (up to limits) | Per update |
