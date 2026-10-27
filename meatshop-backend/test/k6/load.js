import journey, { thresholds, setup } from './journey.js';
export { setup };
export const options = { ...{ vus: 50, duration: '2m' }, thresholds };
export default journey;
