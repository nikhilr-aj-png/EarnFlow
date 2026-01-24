# Firebase Optimization & Security Guide

To make your platform professional and secure, please follow these steps in your [Firebase Console](https://console.firebase.google.com/):

## 1. Security Rules Deployment
I have updated your `firestore.rules` file to:
- **Protect Coins**: Users can no longer manually update their own coin balance via the browser console.
- **Admin Access**: Most sensitive write operations now require an `isAdmin: true` flag on the user profile.
- **Card Games**: Added protection for the new card game collection.

> [!IMPORTANT]
> Run `firebase deploy --only firestore:rules` in your terminal to apply these changes.

## 2. Mandatory Firestore Indexes
Some of our "Recent Activity" and "Games List" queries require indexes to work fast. Please go to **Firestore -> Indexes** and ensure these are created:

| Collection | Fields | Query Type |
|------------|--------|------------|
| `taskSubmissions` | `userId (Ascending)`, `completedAt (Descending)` | Composite |
| `cardGames` | `status (Ascending)`, `createdAt (Descending)` | Composite |

## 3. Storage Setup (Optional)
If you want to host your own game images instead of using Unsplash links:
1. Enable **Firebase Storage**.
2. Update rules to allow public read but restrict write to Admins.

## 4. Authentication Security
Go to **Authentication -> Settings -> User actions**:
- Uncheck "Enable create (sign-up)" if you ever want to make the platform invite-only.
- **Recommended**: Enable Google Sign-in for better trust and easier onboarding.

## 5. App Check
Highly recommended for a production app. Enable **App Check** (with reCAPTCHA Enterprise) to prevent bots from spending your credits or scraping your tasks.
