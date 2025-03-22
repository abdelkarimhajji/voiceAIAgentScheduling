// voice.ts
import express, { Request, Response } from 'express';
import { twiml as Twiml } from 'twilio';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { authorize } from './googleAuth';
import { checkAvailability } from './checkAvailability';

dotenv.config({ path: '../.env' });

const app = express();
app.use(express.urlencoded({ extended: false }));

// so here i initialize openAI with your api key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// and here i have endpoint come from twilio
app.post('/voice', (req: Request, res: Response) => {
  const response = new Twiml.VoiceResponse();

  // here waiting for the client to start talking
  const gather = response.gather({
    input: ['speech'],
    timeout: 5,
    speechTimeout: 'auto',
    action: '/process-speech',
  });

  gather.say('hello, how can i help you today ');

  res.type('text/xml');
  res.send(response.toString());
});

// handle users speech input
app.post('/process-speech', async (req: Request, res: Response) => {
  const userSpeech = req.body.SpeechResult;
  const response = new Twiml.VoiceResponse();

  if (!userSpeech) {
    response.say("sorry, i didnt hear anything i will end the call");
    response.hangup();
    res.type('text/xml').send(response.toString());
    return;
  }

  try {
    let answer = "sorry, can you repeat that please";

    // here  i configure the ai how it should be answer
    const aiReply = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `
            you are a helpful assistant working at a hospital.

            - if the user asks about hospital-related topics (like scheduling, appointments, doctors, availability, or booking), respond normally.
            - if the user says anything that indicates they want to end the call (like "thank you", "that's all", or "we're done"), reply with "end_call".
            - do not reply with anything else when the user wants to end the call.
            - otherwise, answer the user's question normally.

            examples:
            user: "can i book an appointment tomorrow at 3 pm?"
            ai: "calendar|2025-03-22|15:00"

            user: "thank you, that’s all for now"
            ai: "end_call"

            user: "what is openai?"
            ai: "i'm sorry, i can only help with hospital-related questions."
            `

        },
        { role: 'user', content: userSpeech }
      ],
    });

    const aiResponse = aiReply.choices[0].message?.content?.toLowerCase() || "";
    console.log("ai response:", aiResponse);

    if (aiResponse.trim() === "end_call") {
      response.say("okay, thank you. have a nice day!");
      response.hangup(); // 📞 End the call
      res.type('text/xml').send(response.toString());
      return;
    }

    if (aiResponse.startsWith("calendar|")) {
      const parts = aiResponse.split("|");

      if (parts.length === 3) {
        const date = parts[1];        
        const time = parts[2];        
        const hour = parseInt(time.split(":")[0]);
        const minute = time.split(":")[1];
        const nextHour = (hour + 1).toString().padStart(2, '0');

        const start = `${date}T${time}:00+00:00`;
        const end = `${date}T${nextHour}:${minute}:00+00:00`;

        console.log(`checking availability for: ${start} -> ${end}`);

        const auth = await authorize();
        const isAvailable = await checkAvailability(auth, start, end);

        answer = isAvailable
          ? "yes that time is available."
          : "no that time is already booked.";
      }
    } else {
      // if the question dosnt have relation with the calander
      answer = aiResponse;
    }

    // here answer and ask if still more questions
    response.say(answer);
 
    const gather = response.gather({
      input: ['speech'],
      timeout: 5,
      speechTimeout: 'auto',
      action: '/process-speech',
    });

    gather.say("do you have another question ");

    res.type('text/xml').send(response.toString());

  } catch (error) {
    console.error('error:', error);
    response.say("sorry, there was an error ");
    res.type('text/xml').send(response.toString());
  }
});

app.get('/test', (req: Request, res: Response) => {
  res.send(' server is working!');
});

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`server running in http://localhost:${port}`);
});
