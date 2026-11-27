# Engineering vision — November 25, 2026

This is the original standing design philosophy and verification strategy, not an independent feature request or authorization to rewrite production code. See the [Permanent Engineering Vision](PERMANENT_ENGINEERING_VISION.md) for the current overarching principles and reference architecture, including customer-selectable Silent/Normal feedback. The active execution index governs current Part 2/3 scope; preserve the verified Part 1 foundation and existing Python laboratories. The original Part 1 scope statement is historical, not a new assignment.

Companion: [Customer Experience Vision](CUSTOMER_EXPERIENCE_VISION.md) — the intended journey from installation and destination selection through three weeks of ordinary use and long-term return.

## Conceptual integrity

- NO BLOAT: every mechanism must justify its existence. Prefer existing proven services, eliminate competing implementations only where safely justified, and avoid speculative abstractions.
- API-first, agent-native engineering: make operations programmatically operable, observable and verifiable wherever technically feasible without unnecessary overhead. Human GUI and agent interfaces must invoke the same canonical business logic and state.
- Thin presentation, separation of concerns, information hiding, modularity, fault isolation, graceful degradation and recovery.
- Rule integrity: approved specifications must govern observable behavior, not just documentation. Map rules to implementation, tests, expected outcomes and prohibited outcomes. Identify stale handlers, duplicate owners, hidden fallbacks, race conditions and behavioral stragglers. Test rule composition, not merely isolated components. Surface unresolved conflicts instead of inventing behavior.
- Reuse the existing Worker, shortcut registry, Universal File API, diagnostics and V3+1 engine where relevant. REDOWN may serve as a read-only behavioral reference; do not import legacy competing engines.
- The objective is increasingly engineerable software: agents can operate, diagnose, develop and verify the machinery; humans enjoy a simple interface.

## Upload API: prove the machinery first

Use the existing upload API implementation for automated stress testing of individual files, multiple folders, nested folders, mixed batches, different file sizes, Unicode and spaces, duplicate basenames in different directories, empty files, concurrency, interrupted operations, recovery, repeated lifecycles and cumulative failures. Use deterministic seeds and manifests. Progress from small fixtures through existing owner regression cases and larger batches (up to 10,000 files when practical). Distinguish simulation from actual browser/provider execution; simulated hours are not proof of elapsed real-world reliability. Reuse existing lab tools rather than creating competing test frameworks.

Verify outcomes against expected paths, sizes and SHA-256 hashes; check missing, unexpected and duplicate objects, terminal operation state and consistency of receipts. Record failures and reproducible inputs. Use bounded configurable batches and isolated test destinations; do not touch unrelated user files. Test combinations of conditions and report unverified cases.

## Latest owner proposal: Python-assisted real GUI verification

The owner should not have to manufacture test files or inspect hundreds of objects manually. With the extension open at the appropriate screen, a local Python laboratory prepares test material and directs the owner to the next experiment.

1. Python generates a deterministic test corpus with configurable counts, sizes, formats, directory depths and multiple sibling folder roots. Include valid representative media/archive/document fixtures where supported. Respect a configurable local disk budget; start small.
2. Python writes an expected-results manifest outside the selected upload corpus, recording relative paths, byte sizes and SHA-256 hashes, run identifier, seed and selection instructions.
3. Python tells the owner precisely which files or folders to select. The owner's essential interaction is pressing the existing Upload Files or Upload Folders button and choosing the prepared material using the real browser picker. No new production UI is requested.
4. The extension runs its actual upload flow. Python observes through existing supported diagnostic/API interfaces or an explicitly supplied receipt/export, then compares actual cloud contents with the independent expected manifest using supported readback where available. Do not silently replace actual readback with mocked outcomes.
5. Python reports expected versus observed files, paths, sizes, checksums, omissions, unexpected objects, duplicate outcomes and useful failure details. Distinguish metadata-only verification from byte-integrity verification. If the existing interfaces cannot supply a result, report that limitation rather than guessing.
6. Repeat with increasingly challenging fixtures. Keep the user interaction minimal and reusable; the owner verifies real picker behavior, progress, responsiveness and aesthetic experience.

The three complementary layers are agent-driven API stress tests, Python-generated fixtures and outcome verification, and human GUI interaction. Keep test scripts and generated material outside the production extension bundle. Do not add a new production service merely to support this experiment.

**The agent exercises the machinery. The human experiences its fruits.**

## Acceptance philosophy

Evidence over claims: report rule-to-code-to-test mapping, relevant discrepancies, interaction conflicts, safeguards, regression results and remaining risks in proportion to the task. A successful build or isolated unit test is not proof of complete behavior. Preserve existing functionality unless an approved requirement explicitly changes it. No unrelated authentication redesign, feature additions or architecture migration is requested by this document.
