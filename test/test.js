import { tests } from '../testamenta.js';

tests(['index'], {
  path: new URL('.', import.meta.url).href,
});
