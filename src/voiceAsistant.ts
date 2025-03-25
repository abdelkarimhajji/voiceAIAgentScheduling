
import WebSocket, { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const ASSEMBLYAI_TOKEN = process.env.ASSEMBLYAI_API_KEY!;
const AAI_REALTIME_URL = 'wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000';

wss.on('connection', (wsClient, req) => {
  console.log('Client connected');

  const aaiSocket = new WebSocket(AAI_REALTIME_URL, {
    headers: {
      authorization: ASSEMBLYAI_TOKEN,
    },
  });

  let isAssemblyReady = false;

  aaiSocket.on('open', () => {
    console.log('connected to assemblyAI');
    isAssemblyReady = true;
  });

  aaiSocket.on('message', (message) => {
    const res = JSON.parse(message.toString());
    const text = res.text;
    const isFinal = res.message_type === 'FinalTranscript';

    if (text) {
      console.log(isFinal ? `final: ${text}` : `partial: ${text}`);
      wsClient.send(JSON.stringify({ type: isFinal ? 'transcript' : 'partial', text }));
    }
  });

  aaiSocket.on('error', (err) => {
    console.error('assemblyAI Error:', err);
  });

  wsClient.on('message', (msg) => {
    if (!isAssemblyReady) {
      console.log('assemblyAI not ready yet, skipping audio chunk...');
      return;
    }

    try {
      const base64Audio = msg.toString('base64');
      aaiSocket.send(JSON.stringify({ audio_data: base64Audio }));
    } catch (err) {
      console.error("failed to send audio to AAI:', err");
    }
  });

  wsClient.on('close', () => {
    console.log('client disconnected');
    aaiSocket.close();
  });
});

server.listen(8080, () => {
  console.log('server running on http://localhost:8080');
});
