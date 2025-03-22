import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });
const accountSid = process.env.TWILIO_ACCOUNT_SID as string;  
const authToken = process.env.TWILIO_AUTH_TOKEN as string; 
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER as string;
const client = twilio(accountSid, authToken);



client.calls
  .create({
    to: '+212665772823',  
    from: twilioPhoneNumber,
    url: 'https://8cd4-41-140-89-109.ngrok-free.app/voice',
  })
  .then((call: { sid: string }) => console.log('Call SID:', call.sid))
  .catch((err: Error) => console.log('Error:', err));
