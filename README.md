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

Your weight and food log stay on the phone for guests. Once someone signs in with Apple or Google, a private backup goes to their account (table `user_data`) so it comes back on a new phone.

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
   supabase secrets set REVENUECAT_SECRET_KEY=sk_...   # RevenueCat › API keys › secret key, so the server knows who has Pro
   supabase functions deploy ai --no-verify-jwt
   ```
   The function itself checks that every request comes from a signed-in Snapspoon account and counts the free plan's weekly uses (table `ai_usage`), so nobody can use your AI credit from outside the app.
6. Put the function URL, project URL and anon key in `.env`.

The Anthropic key only lives in the Edge Function, never in the app.

## Subscriptions (RevenueCat)

1. Create products in App Store Connect and Google Play Console (for example `pro_monthly` at $4.99 and `pro_yearly` at $29.99, with a 7-day free trial).
2. In RevenueCat, add both apps, create an entitlement named `pro`, attach the products, and put them in the current offering.
3. Copy the public iOS and Android SDK keys into `.env`.

The free-plan limit is enforced by the AI function on the server. The app logs in to RevenueCat with the Supabase user id, so Pro follows the account to a new phone.

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

Before submitting: fill in the store listings. Google Play's account deletion link is `https://avivloya.github.io/BiteBoard/delete-account.html`. New Google Play personal accounts must run a closed test with 12 testers for 14 days before production.

## Checks

```bash
npm run typecheck
npm run lint
```
