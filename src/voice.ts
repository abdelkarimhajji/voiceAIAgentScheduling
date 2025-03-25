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
    timeout: 15,
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

              - your job is to assist users with hospital-related and anotherthings, such as scheduling, appointments, doctor availability, visiting hours, or booking.
              - always keep the conversation going — never end the call.
              - after every answer, ask: "do you need anything else?"
              - if the user asks to check appointment availability, respond using this format: "calendar|YYYY-MM-DD|HH:mm"
              - if the user does not mention a year, always assume the current year is 2025.
              - if the user says "next year" or mentions a specific year (like 2026), use that instead.

              examples:

              user: "can i book an appointment on march 22 at 3 pm?"
              ai: "calendar|2025-03-22|15:00"

              user: "can i book on march 22 next year at 3 pm?"
              ai: "calendar|2026-03-22|15:00"

            `

        },
        { role: 'user', content: userSpeech }
      ],
    });

    const aiResponse = aiReply.choices[0].message?.content?.toLowerCase() || "";
    console.log("ai response:", aiResponse);

    // if (aiResponse.trim() === "end_call") {
    //   response.say("okay, thank you. have a nice day!");
    //   response.hangup(); 
    //   res.type('text/xml').send(response.toString());
    //   return;
    // }

    if (aiResponse.startsWith("calendar|")) {
      const cleanLine = aiResponse.split("\n")[0]; // ✅ get only the first line
      const parts = cleanLine.split("|");
    
      if (parts.length === 3) {
        const date = parts[1];
        let time = parts[2];
    
        // ✅ If time has a range (like "15:00-16:00"), pick the start time
        if (time.includes("-")) {
          time = time.split("-")[0];
        }
    
        const hour = parseInt(time.split(":")[0]);
        const minute = time.split(":")[1];
        const nextHour = (hour + 1).toString().padStart(2, '0');
    
        const start = `${date}T${time}:00+00:00`;
        const end = `${date}T${nextHour}:${minute}:00+00:00`;
    
        console.log(`checking availability for: ${start} -> ${end}`);
    
        const auth = await authorize();
        const isAvailable = await checkAvailability(auth, start, end);
    
        answer = isAvailable
          ? "yes, that time is available."
          : "no, that time is already booked.";
      }
    }
     else {
      // if the question dosnt have relation with the calander
      answer = aiResponse;
    }

    // here answer and ask if still more questions
    const gather = response.gather({
      input: ['speech'],
      timeout: 10,
      speechTimeout: 'auto',
      action: '/process-speech',
    });
    
    gather.say(answer);
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

