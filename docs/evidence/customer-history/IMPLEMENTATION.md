# Customer History implementation

Base: a3a672754156f88bb572bfb4275d1471f0ccb4a6. Review branch:
implement/customer-history-ux-2026-11-15. Checkpoint tag preserved unchanged.

Phase 1: traced the Depth outcome channel: it always sent technical text,
including routine completion, independently of Debug Mode. Presentation now
reads the existing persistent preference and stays quiet on completed/pending
outcomes when OFF. Durable recording and actionable failures remain enabled.
24 Debug preference/feedback tests pass. Installed Windows cold login and live
R2 acceptance are NOT TESTED; managed Chromium blocks unpacked installation.
