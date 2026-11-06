import {SPOOL_PART_BYTES} from '../../right2cloud-module/src/cloudflare-r2-writer.mjs';
// Bounded concurrent buffers within the documented 128 MiB Worker isolate.
export const JOB_MEMORY_BUDGET=Object.freeze({isolateBytes:128*1024*1024,reservedBytes:64*1024*1024,perJobBytes:4*SPOOL_PART_BYTES});
export const JOB_CAPACITY=Math.floor((JOB_MEMORY_BUDGET.isolateBytes-JOB_MEMORY_BUDGET.reservedBytes)/JOB_MEMORY_BUDGET.perJobBytes);
