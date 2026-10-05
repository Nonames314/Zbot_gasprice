import axios from 'axios';
import express from 'express';
import { config } from './config';
import { replyToUser } from './zalo';
import { getGeminiResponse } from './gemini';

type ZaloMessage = {
    text?: string;
    from?: { id?: string };
    chat?: { id?: string };
    message_id?: string;
};

type ZaloEvent = {
    event_name?: string;
    message?: ZaloMessage;
};

type ZaloResultEnvelope = {
    ok?: boolean;
    result?: unknown;
};

const handledMessageIds = new Set<string>();

export function startPolling() {
    console.log('[POLLING] Starting Zalo Bot in local POLLING mode...');

    const app = express();

    app.get('/', (req, res) => {
        res.status(404).send('404 Not Found');
    });

    app.listen(config.port, () => {
        console.log(`[POLLING] local server is listening on port ${config.port}`);
    });

    if (!config.zaloBotToken) {
        console.error('[POLLING] Cannot start polling without ZALO_BOT_TOKEN');
        return;
    }

    const zaloPollUrl = `https://bot-api.zaloplatforms.com/bot${config.zaloBotToken}/getUpdates`;

    console.log('[POLLING] Calling getUpdates loop...');
    poll(zaloPollUrl);
}

async function poll(url: string) {
    while (true) {
        try {
            const response = await axios.post<ZaloResultEnvelope>(url, { timeout: 30 });
            const events = normalizeEvents(response.data?.result);

            for (const eventData of events) {
                if (eventData.event_name !== 'message.text.received' || !eventData.message) {
                    continue;
                }

                const message = eventData.message;
                const messageId = message.message_id;
                if (messageId && handledMessageIds.has(messageId)) {
                    continue;
                }

                if (messageId) {
                    handledMessageIds.add(messageId);
                    if (handledMessageIds.size > 2000) {
                        const oldestId = handledMessageIds.values().next().value;
                        if (oldestId) {
                            handledMessageIds.delete(oldestId);
                        }
                    }
                }

                const chatId = message.chat?.id || message.from?.id;
                const text = message.text;

                if (chatId && text) {
                    console.log(`[POLLING] Chat ${chatId} says: ${text}`);
                    const reply = await getGeminiResponse(text);
                    await replyToUser(chatId, reply);
                }
            }
        } catch (error: any) {
            console.error('[POLLING] Error calling getUpdates:', error?.response?.data || error.message);
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }
}

function normalizeEvents(result: unknown): ZaloEvent[] {
    if (!result) {
        return [];
    }

    if (Array.isArray(result)) {
        return result.flatMap((entry) => unwrapEvent(entry));
    }

    return unwrapEvent(result);
}

function unwrapEvent(entry: unknown): ZaloEvent[] {
    if (!entry || typeof entry !== 'object') {
        return [];
    }

    const candidate = entry as ZaloEvent & { result?: ZaloEvent };
    if (candidate.event_name || candidate.message) {
        return [candidate];
    }

    if (candidate.result && (candidate.result.event_name || candidate.result.message)) {
        return [candidate.result];
    }

    return [];
}
