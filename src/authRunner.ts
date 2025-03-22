import { authorize } from './googleAuth';

(async () => {
  try {
    await authorize();
    console.log('gogle calendar authorization complete! ');
  } catch (error) {
    console.error('authorization failed :', error);
  }
})();
