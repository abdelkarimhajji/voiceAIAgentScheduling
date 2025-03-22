import { google } from 'googleapis';

export async function checkAvailability(auth: any, startTime: string, endTime: string) {
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: startTime,
      timeMax: endTime,
      timeZone: 'America/Los_Angeles',
      items: [{ id: 'primary' }],
    },
  });

  const busySlots = res.data.calendars?.primary?.busy || [];

  if (busySlots.length === 0) {
    console.log('time slot is available');
    return true;
  } else {
    console.log('time slot is busy: ', busySlots);
    return false;
  }
}
