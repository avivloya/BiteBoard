# Turning on accounts, Google sign-in and AI for the Snapspoon website

The website (this `docs/` folder, live at https://avivloya.github.io/BiteBoard/) works without any of this, but then it keeps data in one browser and has no AI. These steps connect it to Supabase, the same backend the phone app uses.

## 1. Supabase project
1. Go to supabase.com, sign in, and click **New project**. Name it Snapspoon and pick a region near you.
2. Open **SQL Editor**. For each file in `supabase/migrations`, in number order, paste its contents and click **Run**.
3. Go to **Project Settings › API** and copy the **Project URL** and the **anon public** key. Both are safe to share. Send them to Claude, or paste them into `docs/config.js`.

## 2. Sign in with Google
1. Go to console.cloud.google.com and create a project called Snapspoon.
2. Open **APIs & Services › OAuth consent screen**. Choose **External**, fill in the app name (Snapspoon) and your support email, and save.
3. Open **APIs & Services › Credentials › Create credentials › OAuth client ID**. Choose **Web application**.
4. Under **Authorized redirect URIs**, add `https://YOUR-PROJECT.supabase.co/auth/v1/callback` (your Project URL plus `/auth/v1/callback`). Click **Create** and copy the Client ID and Client secret.
5. In Supabase, open **Authentication › Sign In / Providers › Google**, turn it on, paste the Client ID and secret, and save.
6. In Supabase, open **Authentication › URL Configuration**. Set **Site URL** to `https://avivloya.github.io/BiteBoard/` and add the same address under **Redirect URLs**.

## 3. AI photo estimates
1. Go to console.anthropic.com, add billing, and create an API key.
2. In Supabase, open **Edge Functions › Secrets** and add `ANTHROPIC_API_KEY` with that key.
3. Deploy the `ai` function from `supabase/functions/ai` (Edge Functions › Deploy a new function, or `supabase functions deploy ai` from a computer).

The key stays inside Supabase. The website never sees it, and AI only works for people who are signed in.

## What the website does with it
- `docs/cloud.js` signs people in with Google, saves their data to the `web_docs` table (migration 0013) and calls the `ai` function.
- Food log, weight, boards and goals are private to each person. Profiles, likes and comments are public to signed-in people. Messages are only visible to the two people in the conversation.
- `docs/manifest.webmanifest` and `docs/sw.js` let people add Snapspoon to their home screen and open it full screen.
