import express from 'express';
import { twiml } from 'twilio';

const app = express();

app.post('/voice', (req, res) => {
  const response = new twiml.VoiceResponse();
  response.say('Hello, this is a test call from Twilio.');

  res.type('text/xml');
  res.send(response.toString());
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
