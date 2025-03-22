import { authorize } from './googleAuth';
import { checkAvailability } from './checkAvailability';

(async () => {
  try {
    const auth = await authorize();
    const date = '2025-03-22';
    const startTime = `${date}T15:00:00+00:00`;
    const endTime = `${date}T16:00:00+00:00`;  
    const free = await checkAvailability(auth, startTime, endTime);

    if (free) {
      console.log('Time is available.');
    } else {
      console.log('Time is already booked.');
    }
  } catch (error) {
    console.error('Error checking calendar:', error);
  }
})();
