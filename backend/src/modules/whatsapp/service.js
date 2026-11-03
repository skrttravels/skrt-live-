const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const P = require('pino');

let sock = null;
let isConnected = false;
let qrCode = null;
let connectionStatus = 'disconnected';
let retryCount = 0;
let statusMessage = '';
let initialWipeDone = false;
let reconnectTimer = null;
const logger = P({ level: 'silent' });

function scheduleReconnect(reason) {
  if (reconnectTimer) return;

  const delayMs = Math.min(5000 * (2 ** retryCount), 60000);
  retryCount++;
  statusMessage = `WhatsApp reconnecting in ${Math.ceil(delayMs / 1000)} seconds`;
  console.warn(`WhatsApp reconnect scheduled in ${delayMs}ms: ${reason || 'connection closed'}`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    exports.initialize();
  }, delayMs);
}

function wipeSession(authDir) {
  const sessionDir = path.join(authDir, 'session');
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
    console.log('Wiped stale WhatsApp session.');
  }
}

exports.initialize = async () => {
  try {
    const authDir = path.join(process.cwd(), '.baileys_auth');

    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    // Only honor WHATSAPP_FRESH on the very first call, not on retries
    if (!initialWipeDone && process.env.WHATSAPP_FRESH === 'true') {
      wipeSession(authDir);
      initialWipeDone = true;
      console.log('WHATSAPP_FRESH=true: Cleared stored WhatsApp session.');
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    sock = makeWASocket({
      logger,
      printQRInTerminal: false,
      auth: state,
      browser: ['SKRT Corp Dashboard', 'Chrome', '10.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: false,
      shouldSyncHistory: false,
      connectTimeoutMs: 30000,
      keepAliveIntervalMs: 15000,
      defaultQueryTimeoutMs: 30000,
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCode = qr;
        statusMessage = '';
        console.log('WhatsApp QR code generated. Ready for scan.');
      }

      if (connection === 'close') {
        const error = lastDisconnect?.error;
        const shouldReconnect = error &&
          error instanceof Error &&
          !error.message.includes('Please wait') &&
          !error.message.includes('QUOTIENT_EXCEEDED') &&
          !error.message.includes('Disconnected');

        console.log(`WhatsApp connection closed. Reconnecting: ${shouldReconnect}. Reason: ${error?.message || 'unknown'}`);

        isConnected = false;
        connectionStatus = 'disconnected';

        if (shouldReconnect) {
          scheduleReconnect(error.message);
        }
      } else if (connection === 'open') {
        isConnected = true;
        qrCode = null;
        connectionStatus = 'connected';
        retryCount = 0;
        statusMessage = '';
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        console.log('WhatsApp client connected successfully.');
      }

      if (update.isConnecting) {
        connectionStatus = 'connecting';
        console.log('WhatsApp client is connecting...');
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
      console.log('Received message:', m.type, m.messages.length);
    });

    console.log('WhatsApp client initialization started.');
  } catch (error) {
    console.error('Failed to initialize WhatsApp client:', error.message);
    connectionStatus = 'error';
    scheduleReconnect(error.message);
  }
};

exports.getStatus = () => ({
  connected: isConnected,
  qrCode: qrCode || null,
  status: connectionStatus,
  message: statusMessage || undefined,
});

exports.sendMedia = async (phone, base64Data, filename = 'document.pdf') => {
  if (!sock || !isConnected) {
    throw new Error('WhatsApp client is not connected');
  }

  const cleanPhone = phone.replace(/\D/g, '');

  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    throw new Error('Invalid phone number format');
  }

  const jid = `${cleanPhone}@s.whatsapp.net`;

  try {
    await sock.sendMessage(jid, {
      document: Buffer.from(base64Data, 'base64'),
      mimetype: 'application/pdf',
      fileName: filename
    });

    console.log(`PDF sent to ${jid}`);
    return { success: true, phone: cleanPhone };
  } catch (error) {
    console.error(`Failed to send PDF to ${jid}:`, error.message);
    throw new Error(`Failed to send message: ${error.message}`);
  }
};

exports.sendMessage = async (phone, text) => {
  if (!sock || !isConnected) {
    throw new Error('WhatsApp client is not connected');
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const jid = `${cleanPhone}@s.whatsapp.net`;

  try {
    await sock.sendMessage(jid, { text });
    console.log(`Message sent to ${jid}`);
    return { success: true, phone: cleanPhone };
  } catch (error) {
    console.error(`Failed to send message to ${jid}:`, error.message);
    throw new Error(`Failed to send message: ${error.message}`);
  }
};

exports.getSocket = () => sock;
