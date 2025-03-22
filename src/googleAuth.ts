import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import express from 'express';
import open from 'open';

const link = ['https://www.googleapis.com/auth/calendar'];
const tokenPath = path.join(__dirname, '../token.json');
const credentialsPath = path.join(__dirname, '../credentials.json');
export async function authorize(): Promise<any> {
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  if (fs.existsSync(tokenPath)) {
    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }
  return getNewToken(oAuth2Client);
}
function getNewToken(oAuth2Client: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: link,
    });
    console.log('authorize this app by visit this link:', authUrl);
    open(authUrl);





    const app = express();
    app.get('/oauth2callback', async (req, res) => {
      const code = req.query.code as string;
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);
      fs.writeFileSync(tokenPath, JSON.stringify(tokens));

      res.send('authentication success ');
      console.log('authentication success token saved in the diractory');
      resolve(oAuth2Client);
      process.exit();
    });

    app.listen(8080, () => console.log('waiting for goole auth...'));
  });
}
