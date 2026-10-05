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

type ZaloWebhookBody = {
    ok?: boolean;
    result?: {
        event_name?: string;
        message?: ZaloMessage;
    };
};

export function startWebhook() {
    const app = express();
    app.use(express.json());

    // Zalo Webhook endpoint
    app.post('/webhook', async (req, res) => {
        const incomingSecret = req.header('x-bot-api-secret-token');
        if (config.webhookSecretToken && incomingSecret !== config.webhookSecretToken) {
            res.status(403).json({ message: 'Unauthorized' });
            return;
        }

        // ALWAYS return 200 immediately to Zalo
        res.status(200).send('OK');

        try {
            const body = req.body as ZaloWebhookBody;
            console.log('[WEBHOOK] Received event from Zalo:', JSON.stringify(body, null, 2));

            // Check if it's a message event
            if (body && body.result && body.result.event_name === 'message.text.received') {
                const message = body.result.message;
                if (message) {
                    const chatId = message.chat?.id || message.from?.id;
                    const text = message.text;

                    if (text && chatId) {
                        console.log(`[WEBHOOK] Chat ${chatId} says: ${text}`);
                        const reply = await getGeminiResponse(text);
                        await replyToUser(chatId, reply);
                    }
                }
            }
        } catch (error) {
            console.error('[WEBHOOK] Error processing webhook event:', error);
        }
    });

    // Return HTTP 404 when connecting via browser (GET request)
    app.get('/', (req, res) => {
        res.status(404).send('404 Not Found');
    });

    app.listen(config.port, () => {
        console.log(`[WEBHOOK] Production webhook listener started on port ${config.port}`);
        console.log(`[WEBHOOK] Please configure your Zalo OA to send events to http://<your_domain>:${config.port}/webhook`);
        if (!config.webhookSecretToken) {
            console.warn('[WEBHOOK] ZALO_WEBHOOK_SECRET_TOKEN is not set. Incoming webhook signature validation is disabled.');
        }
    });
}
