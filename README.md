# Biteboard

An AI-powered weight-loss app for iPhone and Android, built with Expo.

- **Discover:** a Pinterest-style board of healthy recipes with calories and macros per serving. Create recipes with AI or write your own.
- **Snap meal:** take a photo of your plate and AI estimates each food's grams, calories, protein, carbs and fat.
- **Boards:** save recipes into your own collections.
- **Today:** calorie ring, macro bars, a 7-day chart and a daily streak.
- **Friends:** a public profile with your shared recipes, friend search and a feed of friends' recipes.
- **Sign-up:** gender, age, height, weight, goal and activity produce a personal calorie plan (Mifflin-St Jeor).

Your weight and food log stay on the phone. Only your public profile, friend list and the recipes you choose to share go to the server.

## Run it

```bash
npm install
cp .env.example .env   # fill in the values (see Backend below)
npx expo start         # scan the QR code with the Expo Go app
```

## Backend (Supabase)

1. Create a project at supabase.com.
2. Install the Supabase CLI and link it: `supabase link --project-ref YOUR-PROJECT`.
3. Create the tables: `supabase db push` (runs `supabase/migrations`).
4. Turn on **Anonymous sign-ins** under Authentication → Sign In / Providers.
5. Add your Anthropic API key and deploy the AI function:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase functions deploy ai --no-verify-jwt
   ```
6. Put the function URL, project URL and anon key in `.env`.

The Anthropic key only lives in the Edge Function, never in the app.

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

## Checks

```bash
npm run typecheck
npm run lint
```
