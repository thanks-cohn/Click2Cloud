# CURRENT loss and agent reliability ratchet

Development branch `dev/p0-agent-reliability-ratchet`, based on `08703cd` main. Original physical CURRENT deletion remains UNKNOWN. Owner reports empty CURRENT (zero records/journal/checkpoints), native583, no accessible complete backup. No original-profile copy or owner recovery has been performed here. No cloud resources or REDOWN were changed.

Implementation and final evidence receipts are being assembled on this branch. Runtime contracts and failure/invariant coverage are queryable through existing `describeCapabilities({section:'reliability'})` and `getEngineHealth({view:'trace'|'support'})`; coverage remains explicitly PARTIAL. Assisted reconstruction uses existing recovery APIs and returns REBUILT_WITH_OWNER_CONFIRMATION, never original historical restoration.
