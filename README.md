# Snapspoon

An AI-powered weight-loss app for iPhone and Android, built with Expo.

- **Discover:** a Pinterest-style board of healthy recipes with calories and macros per serving. Create recipes with AI or write your own.
- **Snap meal:** take a photo of your plate and AI estimates each food's grams, calories, protein, carbs and fat.
- **Boards:** save recipes into your own collections.
- **Today:** calorie ring, macro bars, a 7-day chart and a daily streak.
- **Friends:** a public profile with your shared recipes, friend search and a feed of friends' recipes.
- **Weight tracker:** log weigh-ins and see your trend against your goal.
- **Barcode scanner:** scan packaged food and log it by grams (Open Food Facts data).
- **Reminders:** meal reminders, an 8pm streak saver on days you haven't logged, and a weekly weigh-in.
- **Snapspoon Pro:** a subscription for unlimited AI photo scans and AI recipes (free plan: 3 of each per week).
- **Sign-up:** gender, age, height, weight, goal and activity produce a personal calorie plan (Mifflin-St Jeor).

Your weight and food log stay on the phone. Only your public profile, friend list and the recipes you choose to share go to the server.

## Run it

```bash
npm install
cp .env.example .env   # fill in the values (see Backend below)
npx expo start         # scan the QR code with the Expo Go app
```

Subscriptions (RevenueCat) need a development build instead of Expo Go: `eas build --profile development`.

## Backend (Supabase)

1. Create a project at supabase.com.
2. Install the Supabase CLI and link it: `supabase link --project-ref YOUR-PROJECT`.
3. Create the tables and the `recipe-photos` storage bucket: `supabase db push` (runs `supabase/migrations`).
4. Turn on **Anonymous sign-ins** under Authentication → Sign In / Providers.
5. Add your Anthropic API key and deploy the AI function:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase functions deploy ai --no-verify-jwt
   ```
6. Put the function URL, project URL and anon key in `.env`.

The Anthropic key only lives in the Edge Function, never in the app.

## Subscriptions (RevenueCat)

1. Create products in App Store Connect and Google Play Console (for example `pro_monthly` at $4.99 and `pro_yearly` at $29.99, with a 7-day free trial).
2. In RevenueCat, add both apps, create an entitlement named `pro`, attach the products, and put them in the current offering.
3. Copy the public iOS and Android SDK keys into `.env`.

The free-plan limit is counted on the phone. Before launch, also enforce it in the AI function (for example with RevenueCat's REST API) so it can't be bypassed.

## Release to the App Store and Google Play

You need an Apple Developer account ($99/year) and a Google Play Console account ($25 once).

```bash
npm install -g eas-cli
eas login
eas init                                   # links the project to your Expo account
eas build --platform all --profile production
eas submit --platform ios                  # uploads to App Store Connect / TestFlight
eas submit --platform android              # uploads to Google Play
```

Before submitting: replace the placeholder icon and splash in `assets/images`, add a privacy policy URL, and fill in the store listings. New Google Play personal accounts must run a closed test with 12 testers for 14 days before production.

## Modern features (need a development or store build)

These use native code, so they do not run in Expo Go. Make a build with `npx eas-cli@latest build --profile development` (or a normal store build).

- **Dark mode**: Settings › Look and feel. Follows the phone by default; the app restarts to switch.
- **Vibrations, confetti, filling calorie ring**: when you log food, start a streak day or reach your goal.
- **Glass panels**: Liquid Glass on iOS 26, a blur on older phones and on the web.
- **Live camera calories** (`/live-snap`): checks the preview every 3.5 s. Each check is one AI call, capped at 6 per session on the free plan and 40 on Pro.
- **Voice logging** (`/voice-log`) and the **AI coach** (`/coach`), **fridge scan** (`/fridge`). New AI modes live in `supabase/functions/ai/extra.ts`; redeploy the function after pulling.
- **Face ID / fingerprint lock**: Settings › Privacy lock.
- **iPhone widgets and Live Activity** (Lock Screen, Dynamic Island, and Apple Watch Smart Stack): `src/widgets/calories.tsx`, configured by the `expo-widgets` plugin in `app.json`. EAS sets up the App Group `group.com.avivloya.snapspoon` the first time you build.
- **Shortcuts**: links like `snapspoon://voice-log` for Siri (Shortcuts app) and Android long-press shortcuts (`plugins/with-app-shortcuts.js`).
- **Progress photos** (`/progress`) and **share cards** (`/share-stats`).

## Checks

```bash
npm run typecheck
npm run lint
```
