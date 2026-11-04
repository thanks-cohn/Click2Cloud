// Statistical helpers kept separate so benchmark gates cannot silently change meaning.
export function distribution(samples) {
  if (!Array.isArray(samples) || !samples.length || samples.some(n => !Number.isFinite(n) || n < 0)) {
    throw new TypeError('A latency distribution needs finite non-negative samples.');
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = p => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
  return { samples: sorted.length, min: sorted[0], p50: percentile(.5), p95: percentile(.95), p99: percentile(.99), max: sorted.at(-1) };
}
export function overheadGate(disabled, enabled, { p95Floor, p95Fraction = 0, p99Floor } = {}) {
  const p95Delta = enabled.p95 - disabled.p95;
  const allowedP95 = Math.max(p95Floor, disabled.p95 * p95Fraction);
  const p99Delta = enabled.p99 - disabled.p99;
  return { status: p95Delta <= allowedP95 && (p99Floor === undefined || p99Delta <= p99Floor) ? 'PASS' : 'FAIL',
    p95DeltaMs: p95Delta, allowedP95DeltaMs: allowedP95, p99DeltaMs: p99Delta,
    ...(p99Floor === undefined ? {} : { allowedP99DeltaMs: p99Floor }) };
}
export async function measureAlternating({ samples = 120, warmup = 20, variants, execute, onSamples }) {
  const keys = Object.keys(variants);
  const values = Object.fromEntries(keys.map(key => [key, []]));
  for (let iteration = -warmup; iteration < samples; iteration++) {
    // Rotate every variant through each position, in both directions. A simple
    // reversal leaves the middle variant permanently in the same position.
    const cycle = ((iteration % (keys.length * 2)) + keys.length * 2) % (keys.length * 2);
    const rotated = [...keys.slice(cycle % keys.length), ...keys.slice(0, cycle % keys.length)];
    const order = cycle < keys.length ? rotated : rotated.reverse();
    for (const key of order) {
      const started = performance.now();
      await execute(variants[key], iteration, key);
      const elapsed = performance.now() - started;
      if (iteration >= 0) values[key].push(elapsed);
    }
  }
  onSamples?.(values);
  return Object.fromEntries(keys.map(key => [key, distribution(values[key])]));
}

export function pairedOverhead(samples, baseline = 'disabled') {
  const before = samples[baseline];
  return Object.fromEntries(Object.entries(samples).filter(([key]) => key !== baseline).map(([key, values]) => {
    if (!Array.isArray(before) || values.length !== before.length || values.some(n => !Number.isFinite(n))) throw new TypeError('Matched sample counts required.');
    const deltas = values.map((n, i) => n - before[i]).sort((a, b) => a - b);
    const at = p => deltas[Math.max(0, Math.ceil(p * deltas.length) - 1)];
    return [key, {samples:deltas.length,p50:at(.5),p95:at(.95),p99:at(.99),min:deltas[0],max:deltas.at(-1)}];
  }));
}
