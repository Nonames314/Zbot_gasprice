# ZBot GasPrice ⛽

A Zalo chatbot that answers Vietnamese fuel price questions (Petrolimex & PVOil) using live price data + Google Gemini.

Users chat with the bot on Zalo, e.g. *"Giá xăng RON 95 hôm nay bao nhiêu?"*, and get a friendly, plain-text reply with current prices.

## Features

- 💬 Zalo OA Bot integration (`sendMessage` / `getUpdates` / webhook)
- ⛽ Live fuel prices from `vngas.chiraitori.io.vn` API (Petrolimex + PVOil, Zone 1 / Zone 2)
- 🤖 AI replies via Gemini (`gemini-3.1-flash-lite-preview`) with fuel-price context injected as system prompt
- 📵 Topic guardrail — refuses non-fuel / non-vehicle questions in Vietnamese
- 🧹 Zalo-safe formatting — strips Markdown, normalizes lists, uses plain text + emoji
- 🔁 Two run modes: `polling` (local dev) and `webhook` (production)
- 🔒 Optional webhook secret validation (`x-bot-api-secret-token`)
- 🧠 Duplicate message dedup in polling mode (2000-ID LRU set)

## Tech Stack

- Node.js + TypeScript
- Express 5 — local health server (polling) / webhook listener
- Axios — gas price API + Zalo Bot API calls
- `@google/genai` — Gemini responses
- `dotenv`, `cross-env`, `nodemon`, `ts-node` for dev

## Project Structure

```
.
├── src/
│   ├── index.ts     # entrypoint, selects polling vs webhook by MODE
│   ├── config.ts    # env loading (dotenv) + validation warnings
│   ├── gasPrice.ts  # fetchGasPrices() from vngas API
│   ├── gemini.ts    # system prompt + price context + Zalo sanitization
│   ├── zalo.ts      # replyToUser() -> POST /bot<token>/sendMessage
│   ├── polling.ts   # getUpdates loop + dedup + GET / -> 404
│   └── webhook.ts   # POST /webhook handler + secret check
├── dist/            # tsc build output (gitignored in most setups)
├── .env.template    # required env vars
├── package.json
└── tsconfig.json
```

## Prerequisites

- Node.js 18+
- A Zalo OA Bot token (`ZALO_BOT_TOKEN`)
- A Google Gemini API key (`GEMINI_API_KEY`)
- For webhook mode: a public HTTPS URL pointing to `/webhook`

## Installation

```bash
npm install
cp .env.template .env
```

Edit `.env`:

```env
ZALO_ACCESS_TOKEN=your_zalo_oa_access_token_here
GEMINI_API_KEY=your_gemini_api_key_here
MODE=polling
PORT=3000
```

> `config.ts` accepts `ZALO_BOT_TOKEN` (preferred) or `ZALO_ACCESS_TOKEN` (legacy fallback). For webhook production you should also set `ZALO_WEBHOOK_SECRET_TOKEN`.

Full env reference:

| Var | Required | Default | Description |
| --- | --- | --- | --- |
| `ZALO_BOT_TOKEN` / `ZALO_ACCESS_TOKEN` | yes | `''` | Zalo Bot API token used in `bot<token>/...` URLs |
| `GEMINI_API_KEY` | yes | `''` | Google GenAI API key |
| `MODE` | no | `polling` | `polling` or `webhook` |
| `PORT` | no | `3000` | Express listen port |
| `ZALO_WEBHOOK_SECRET_TOKEN` | webhook only | `''` | Validates `x-bot-api-secret-token` header |

## Running

Development (polling, default):

```bash
npm run dev:polling
```

Development (webhook):

```bash
npm run dev:webhook
```

Production:

```bash
npm run build
npm start
# control mode with MODE env: MODE=webhook node dist/index.js
```

### Polling mode

- Starts a dummy Express server (`GET / -> 404`) just to keep the port occupied.
- Loops `POST https://bot-api.zaloplatforms.com/bot<token>/getUpdates` with 30s timeout.
- Only handles `event_name === 'message.text.received'`.
- Skips already-seen `message_id`s, extracts `chat.id || from.id`, calls Gemini, replies via `replyToUser()`.

Good for local testing — no public URL needed.

### Webhook mode

- Listens on `POST /webhook` with `express.json()`.
- If `ZALO_WEBHOOK_SECRET_TOKEN` is set, rejects mismatched `x-bot-api-secret-token` with `403`.
- Immediately returns `200 OK` to Zalo, then processes async (Gemini → reply).
- `GET / -> 404` to handle browser probes.

Configure your Zalo OA dashboard to send events to:

```
http://<your_domain>:3000/webhook
```

## How It Works

1. `fetchGasPrices()` (`src/gasPrice.ts`) GETs `https://vngas.chiraitori.io.vn/api/v1/prices`.
2. `getGeminiResponse(userMessage)` (`src/gemini.ts`) injects that JSON as context into a Vietnamese system prompt.
3. Gemini is instructed to:
   - answer fuel/vehicle questions briefly in Vietnamese,
   - use `-` lists, plain text, and emoji (⛽ 🚗 ⬇️ ⬆️ 💰),
   - refuse off-topic with: `"Xin lỗi, tôi chỉ có thể hỗ trợ thông tin giá xăng dầu."`
4. Reply is sanitized (`**bold**` → `*bold*`, `* `/`- ` → `- `) and sent via `replyToUser()` (`src/zalo.ts`).

## Example

User:
```
Giá xăng RON 95 hôm nay bao nhiêu?
```

Bot:
```
- Xăng RON 95-III (Petrolimex): 21.500 đ/lít ⛽
- Xăng E5 RON 92-II: 20.100 đ/lít 💰
Giá cập nhật ngày ...
```

Off-topic:
```
Xin lỗi, tôi chỉ có thể hỗ trợ thông tin giá xăng dầu.
```

## Limitations / Notes

- Data source is a third-party wrapper (`vngas.chiraitori.io.vn`), not Petrolimex official — may be down or stale. Bot falls back to `"Dữ liệu giá xăng đang bị lỗi..."` in the prompt.
- No conversation memory — each message is independent + current price snapshot.
- Polling loop has a 5s backoff on `getUpdates` errors; no exponential backoff / offset handling.
- Webhook handler has no retry queue — if Gemini/Zalo fails, the message is dropped (error only logged).
- Missing `ZALO_BOT_TOKEN` or `GEMINI_API_KEY` only logs a warning at startup; requests will fail later with a Vietnamese fallback message.

## License

ISC — see `package.json`. No license file included.
