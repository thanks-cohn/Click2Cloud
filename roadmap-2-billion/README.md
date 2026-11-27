# ReDown — Roadmap to Two Billion

**V1 release roadmap · November 26, 2026**

**Commercial ambition:** One billion paying ReDown customers. This is an aspirational goal, not an adoption forecast. The folder name represents the broader long-term ambition.

**V1:** $12/year proposed; intentional remote saving. **V2:** a major upgrade to ReDown, including extensively tested automatic download rerouting and generic S3 support.

Build for global scale, validate with the first thousand customers, and expand based on evidence. V1 must be a complete product, not a deliberately incomplete version.

## Status legend

- 🟢 Demonstrated or established concept (see row for scope; not necessarily release-ready).
- 🟡 Existing foundation, partial implementation, or outstanding validation.
- 🔴 Not established.

This is a planning snapshot based on reported development progress and test results, not a fresh audit of every source file. All launch-critical behavior requires release acceptance testing.

## 1. Core functionality

| Feature | What we have | What we need to work on |
|---|---|---|
| Cloudflare R2 | 🟢 578/578 live uploads production-confirmed | Independent retrieval and restart verification |
| Google Drive | 🟡 Existing integration | Full live reliability testing |
| OneDrive | 🟡 Existing integration | Full live reliability testing |
| Dropbox | 🟡 Existing integration | Full live reliability testing |
| Right-click remote saving | 🟡 Implemented | Reliable availability after login and browser restart |
| Screenshot to Cloud | 🟡 Existing functionality | Support and verify all four providers |
| Shortcut + Click to Cloud | 🟡 Existing foundation | Intuitive, responsive, reliable interaction |
| Folder uploads | 🟡 Implemented and fixture-tested | Large live workloads across providers |
| File downloads | 🟡 Implemented | Independent SHA-256 verification |
| Folder downloads | 🟡 Existing implementation | Large live retrieval tests |
| File Explorer | 🟡 Implemented | Responsiveness and operation reliability |
| Get URL | 🟡 Existing R2 functionality | Reliable URL generation and appropriate provider support; public access only with explicit consent |
| Destination rules | 🟡 Existing foundation | Consistent behavior across providers |
| Default `redown` folder | 🟡 Planned or partially implemented | Uniform behavior across basic cloud providers |

## 2. Reliability and infrastructure

| Feature | What we have | What we need to work on |
|---|---|---|
| Transfer integrity | 🟢 Successful production upload campaign | Independent content verification across all providers |
| Receipts | 🟢 Working Laboratory receipts | Consistent consumer-facing receipts |
| Python Laboratory | 🟢 Operational on Windows | Expand provider coverage and repair fault failures |
| Low-memory operation | 🟡 Successful sustained 4 GB machine test | Resolve earlier MemoryError |
| Low-disk operation | 🟡 Successful constrained upload test | Graceful recovery from insufficient space |
| Network interruption recovery | 🟡 Partially demonstrated | Repair unresolved transport failures |
| Browser restart recovery | 🟡 Architecture exists | Verify interrupted transfers and subsequent retrieval |
| Authentication recovery | 🟡 Existing functionality | Reliable expiration detection and reconnection |
| Queue | 🟡 Implemented | Verify cancellation, progress and recovery |
| History | 🟡 Implemented | Eliminate delays and database failures |
| Parallel processing | 🟡 Limited concurrency | Prepare architecture for V2; maintain safe V1 limits |
| Engine separation | 🟡 Existing native bridge | Separate orchestration from execution for future native processing |

**Evidence boundary:** ReDown 0.3.32.4 confirmed 578/578 eligible live R2 uploads, 336,467,559 bytes, zero reported transfer errors and zero staging leftovers. The workload verdict was FAIL because 555 files were expected and 578 were discovered. The location audit also reported FAIL despite 578 unique matches; independent final-object SHA-256 verification and restart retrieval remained pending at this snapshot. Earlier fault-injection and resource-pressure failures remain open. Do not describe this as a complete release acceptance pass.

## 3. Consumer appeal and security

| Feature | What we have | What we need to work on |
|---|---|---|
| Remote saving without permanent local copies | 🟢 Core concept demonstrated | Verify behavior and communicate accurately |
| Suspicious file warnings | 🔴 Not established | Respect browser security protections and warn appropriately |
| Secure credential management | 🟡 Existing authentication architecture | Independent security audit |
| Privacy | 🟡 Architectural foundation | Publish and verify data-handling guarantees |
| Minimal permissions | 🟡 Existing extension configuration | Audit and remove unnecessary permissions |
| Nostalgic animations | 🟢 Implemented | Preserve performance and provide disable options |
| Themes | 🟢 Existing aesthetic system | Final visual polish |
| Installation experience | 🟡 Development installation works | Chrome Web Store distribution |
| Easy onboarding | 🟡 Existing Remotes interface | First successful save within one minute |
| International languages | 🔴 Not established | Localization for major global markets |
| Accessibility | 🔴 Not established | Keyboard navigation, screen readers, reduced motion |
| Customer support | 🔴 Not established | Self-service diagnostics and troubleshooting |

Remote saving reduces certain forms of local exposure; it does not neutralize malware. Do not promise virus-free downloads or bypass browser security protections. Essential security, integrity, recovery, access to users' own files and bug fixes must not be withheld for V2.

## 4. Commercial infrastructure

| Feature | What we have | What we need to work on |
|---|---|---|
| Annual pricing | 🟢 $12/year concept | Validate willingness to pay |
| Free tier | 🟢 Seven daily remote saves proposed | Test whether the limit encourages adoption or discourages it |
| Unlimited premium saves | 🟢 Product concept | Dependable licensing and entitlements |
| Payment processing | 🔴 Not established | Secure purchasing and renewal |
| License recovery | 🔴 Not established | Restore purchases across devices |
| Product website | 🟡 Brand and domain concepts | Professional landing page with demonstrations |
| Marketing | 🟡 Strong feature concepts | Short demos, creator partnerships and organic distribution |
| International pricing | 🔴 Not established | Affordable regional pricing and payment methods |
| Referral system | 🔴 Not established | Optional privacy-respecting referral incentives |

Seven free saves daily equals 2,555 per 365-day year. Test whether users have a meaningful reason to upgrade; do not make the free experience artificially unreliable.

## 5. Development order

1. **Reliability foundation:** Complete independent retrieval and restart testing for the current 578-file campaign; repair outstanding faults.
2. **Universal cloud compatibility:** Dependable uploads, downloads and retrieval across R2, Google Drive, OneDrive and Dropbox.
3. **Screenshot to Cloud:** Effortless capture across all supported providers.
4. **Shortcut + Click to Cloud:** Fast, intuitive signature interaction with verified completion.
5. **Security, onboarding and commercialization:** Security audit, licensing, payments, privacy, accessibility and installation.
6. **Public V1 release:** Staged rollout, real customer feedback and continuous reliability improvements.

## 6. Reserve for V2 — major ReDown upgrade

| Feature | V1 disposition | Reason for V2 |
|---|---|---|
| Automatic download rerouting | Defer consumer release | Requires extensive compatibility and safety testing |
| Generic S3 compatibility | Defer | Significant provider expansion |
| Independent native transfer engine | Prepare interfaces only | Major architectural upgrade |
| Transfers while Chrome is closed | Defer | Requires independent execution ownership |
| Adaptive parallel processing | Prepare interfaces only | Significant performance upgrade |
| Advanced cloud-side malware scanning | Defer advanced functionality; retain basic protections | Additional security infrastructure |
| Cloud-to-cloud transfers | Defer | Expands beyond browser downloads |
| Advanced file automation | Defer | Additional upgrade value |

V2 is an upgrade to ReDown itself, not a separate product. No V2 capability should destabilize V1.

## 7. Commercial scale

| Paying customers | Annual price | Annualized gross revenue |
|---:|---:|---:|
| 10,000 | $12 | $120,000 |
| 100,000 | $12 | $1,200,000 |
| 1 million | $12 | $12 million |
| 10 million | $12 | $120 million |
| 100 million | $12 | $1.2 billion |
| 1 billion | $12 | $12 billion |

Hypothetical gross revenue, not profit or a forecast; excludes expenses, taxes, refunds, churn and regional pricing differences. A billion paying customers is extraordinarily ambitious and unlikely for a standalone browser extension. Pursuing that scale requires distribution beyond the Chrome Web Store, mobile and cross-platform reach, international affordability, and potential integration partnerships. Validate adoption, retention and conversion before scaling.

## V1 marketing proposition

**ReDown — The future of downloading.**

**Capture. Click. Save remotely.**

Your files. Your cloud. More space on your computer.

Proposed price: **$12 a year.**

Design for a billion. Validate with the first thousand. Scale with evidence.
