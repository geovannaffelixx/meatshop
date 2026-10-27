import journey, { spikeThresholds, setup } from './journey.js';
export { setup };
export const options = { ...{ stages: [{ duration: '20s', target: 50 }, { duration: '10s', target: 500 }, { duration: '30s', target: 500 }, { duration: '20s', target: 0 }] }, thresholds: spikeThresholds };
export default journey;
