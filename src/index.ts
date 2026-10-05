import { config } from './config';
import { startPolling } from './polling';
import { startWebhook } from './webhook';

console.log('--- Zalo Gas Price Bot ---');
console.log(`Mode configured: ${config.mode.toUpperCase()}`);

if (config.mode === 'polling') {
    startPolling();
} else if (config.mode === 'webhook') {
    startWebhook();
} else {
    console.error('Invalid MODE passed. Use "polling" or "webhook".');
    process.exit(1);
}
