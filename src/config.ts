import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  zaloBotToken: process.env.ZALO_BOT_TOKEN || process.env.ZALO_ACCESS_TOKEN || '',
  webhookSecretToken: process.env.ZALO_WEBHOOK_SECRET_TOKEN || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  mode: process.env.MODE || 'polling', // 'polling' or 'webhook'
  port: parseInt(process.env.PORT || '3000', 10),
};

if (!config.zaloBotToken) {
  console.warn('WARNING: ZALO_BOT_TOKEN is not set in environment variables.');
}

if (!config.geminiApiKey) {
  console.warn('WARNING: GEMINI_API_KEY is not set in environment variables.');
}
