import express from 'express';
import { twiml } from 'twilio';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { Request, Response } from 'express';

dotenv.config();



const app = express();
app.use(express.urlencoded({ extended: false }));



const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});



app.post('/voice', (req: Request, res: Response) => {

  const response = new twiml.VoiceResponse();

  const gather = response.gather({
    input: ['speech'], // <-- must be an array now
    timeout: 5,
    speechTimeout: 'auto',
    action: '/process-speech',
  });

  gather.say('hello how can i help you today? ');

  res.type('text/xml');
  res.send(response.toString());
});



app.post('/process-speech', async (req: Request, res: Response) => {
  const userSpeech = req.body.SpeechResult;
  const response = new twiml.VoiceResponse();

  if (!userSpeech) {
    response.say("sorry, i didnt hear anything.");
    res.type('text/xml').send(response.toString());
    return;
  }

  try {
    const aiReply = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: userSpeech },
      ],
    });

    let answer = "Sorry, can you repeat please!";
      if (aiReply.choices[0].message?.content) {
        answer = aiReply.choices[0].message.content;
      }


    response.say(answer);
    const gather = response.gather({
      input: ['speech'],
      timeout: 5,
      speechTimeout: 'auto',
      action: '/process-speech',
    });
    gather.say("Do you have another question?");

    res.type('text/xml').send(response.toString());

  } catch (error) {
    console.error('OpenAI error:', error);
    response.say("Sorry, there was an error.");
    res.type('text/xml').send(response.toString());
  }
});


const port = 8080;
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
