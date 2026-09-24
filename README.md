# Meera's Voice Bot

A Telegram bot: Meera sends a raw note as a text message, the bot sends it to
Gemini along with her voice/style instructions, and sends the drafted post
back to her in the same chat.

## How it works

```
Meera (Telegram) --> Telegram webhook --> api/telegram.js (Vercel function)
                                              |
                                              v
                                      lib/gemini.js -> Gemini API
                                    (system prompt = prompts/voice-instructions.md)
                                              |
                                              v
                                      lib/telegram.js -> sendMessage back to Meera
```

There's no polling loop — Telegram calls a webhook URL on Vercel every time
she sends a message, which is why this is a good fit for serverless hosting.

## Files

- `api/telegram.js` — the webhook endpoint Telegram calls on every message.
- `lib/gemini.js` — builds the prompt and calls Gemini.
- `lib/telegram.js` — sends messages back to the chat (handles Telegram's
  4096-character message limit by splitting long drafts).
- `lib/voice.js` — loads `prompts/voice-instructions.md` and caches it.
- `prompts/voice-instructions.md` — **put Meera's voice/style instructions
  here.** This file's contents get added to every Gemini request. It's just
  a placeholder right now — fill it in before going live.

## 1. Create the Telegram bot

1. Open a chat with [@BotFather](https://t.me/BotFather) on Telegram.
2. Send `/newbot` and follow the prompts to name it.
3. BotFather gives you a token like `123456789:AAExampleTokenValue`. Save it —
   this is `TELEGRAM_BOT_TOKEN`.

## 2. Get a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Create an API key. Save it — this is `GEMINI_API_KEY`.

## 3. Add Meera's voice instructions

Edit [`prompts/voice-instructions.md`](prompts/voice-instructions.md) and
replace the placeholder comment with her actual style guide (tone, sentence
rhythm, phrases to use/avoid, formatting habits, a few example posts she
likes). This file is read at request time, so you can update it later
without touching any code.

## 4. Install dependencies

```bash
npm install
```

## 5. Deploy to Vercel

```bash
npm install -g vercel   # if you don't have the CLI yet
vercel
```

Follow the prompts to link/create a project. Then set the environment
variables (either via the CLI or in the Vercel dashboard under
Project → Settings → Environment Variables):

```bash
vercel env add TELEGRAM_BOT_TOKEN
vercel env add GEMINI_API_KEY
vercel env add TELEGRAM_WEBHOOK_SECRET   # any random string you make up
vercel env add GEMINI_MODEL              # optional, defaults to gemini-2.5-flash
```

Deploy to production:

```bash
vercel --prod
```

Note your deployment URL, e.g. `https://meera-voice-bot.vercel.app`.

## 6. Register the webhook with Telegram

Tell Telegram where to send updates. Run this once (replace the placeholders):

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<your-deployment-url>/api/telegram" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Use the same value for `secret_token` here as you set for
`TELEGRAM_WEBHOOK_SECRET` in step 5 — that's what lets the bot verify a
request actually came from Telegram. If you skipped setting
`TELEGRAM_WEBHOOK_SECRET`, just omit `-d "secret_token=..."` here too.

Verify it registered correctly:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## 7. Try it

Open a chat with your bot on Telegram and send a note. You should get a
drafted post back in a few seconds.

## Local development

```bash
vercel dev
```

This runs the function locally, but Telegram can't reach `localhost`
directly — use a tunnel (e.g. `ngrok http 3000`) and point `setWebhook` at
the tunnel's URL if you want to test end-to-end locally. Otherwise, just
iterate by redeploying with `vercel` (preview deployments get their own URL
you can point the webhook at temporarily).

## Notes

- Gemini calls can take a few seconds; `vercel.json` sets the function's
  `maxDuration` to 60s. If you're on Vercel's Hobby plan and hit timeouts,
  either upgrade or switch to a faster model via `GEMINI_MODEL`.
- The bot ignores non-text messages (photos, voice notes, etc.) aside from
  replying with a prompt to send text.
