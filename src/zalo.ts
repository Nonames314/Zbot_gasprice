import axios from 'axios';
import { config } from './config';

export async function replyToUser(chatId: string, text: string): Promise<void> {
    if (!config.zaloBotToken) {
        console.error('Missing ZALO_BOT_TOKEN. Cannot send message to Zalo Bot API.');
        return;
    }

    const ZALO_API_URL = `https://bot-api.zaloplatforms.com/bot${config.zaloBotToken}/sendMessage`;

    try {
        const payload = {
            chat_id: chatId,
            text: text
        };

        const response = await axios.post(ZALO_API_URL, payload, {
            headers: {
                // The new API uses the token in the URL, no access_token header needed but we send JSON
                'Content-Type': 'application/json'
            }
        });

        if (!response.data.ok) {
            console.error('Zalo API Error:', response.data);
        }
    } catch (error: any) {
        console.error('Error sending message to Zalo:', error?.response?.data || error.message);
    }
}
