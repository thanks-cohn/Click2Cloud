/** Observer only: none of these methods confer provider or storage authority. */
export type AvailabilityReason = 'not_observed' | 'not_applicable' | 'unavailable' | 'unsupported' | 'interrupted' | 'redacted' | 'invalid_measurement';
export type Outcome = 'pending' | 'verified' | 'failed' | 'blocked' | 'cancelled' | 'uncertain' | 'interrupted';
export type Measurement = number | null;
export interface BasicAttemptV2 {
 schemaVersion: 2; attemptId: string; clickTimestampUtc: string | null;
 appId: 'click2cloud'; appVersion: string | null; build: string | null; workerEpoch: string;
 pageOrigin: string | null; websiteHost: string | null; sourceOrigin: string | null;
 sourceHost: string | null; sourceUrlSanitized: string | null;
 providerId: string; mode: 'simple' | 'narrow' | 'depth' | 'other';
 context: 'image' | 'link' | 'page' | 'video' | 'audio' | 'other';
 state: Outcome; reasonCode: string | null; proofLevel: string; evidenceClass: string;
 bytesObserved: Measurement; bytesVerified: Measurement;
 clickToDispatchMs: Measurement; sourceAcquireMs: Measurement;
 sourceReadThroughputBytesPerSecond: Measurement; providerRequestLatencyMs: Measurement;
 uploadElapsedMs: Measurement; uploadThroughputBytesPerSecond: Measurement;
 verificationElapsedMs: Measurement; clickToVerifiedMs: Measurement;
 endToEndEffectiveBytesPerSecond: Measurement;
 outcomeCompleteness: 'pending' | 'terminal' | 'interrupted'; missingFields: string[];
 dataLossFlag: boolean; availability: Record<string, {value: 'N/A'; reason: AvailabilityReason}>;
}
export interface ProviderObservationV2 {
 independent: boolean; bytes?: number; evidenceClass?: 'authoritative-receipt' | 'fixture-only';
 availability?: AvailabilityReason;
}
export interface ObservationV2 {
 attemptId: string; stage: string; monotonicMs?: number; workerEpoch?: string;
 outcome?: string; durationMs?: number; proof?: ProviderObservationV2;
 /** Directly observed allowlisted metadata only, only retained during consented rich runs. */
 raw?: Record<string, string | null>;
}
