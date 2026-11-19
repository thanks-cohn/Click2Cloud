// Disposable Node test worker only. Never imported by the extension.
import {workerData} from 'node:worker_threads';
const duration=Math.min(8000,Math.max(0,workerData.durationMs)),end=performance.now()+duration;
let value=1;while(performance.now()<end)value=Math.sqrt(value+1);
