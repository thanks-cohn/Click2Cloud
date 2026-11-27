# ReDown — The Customer Experience Vision

Owner direction • November 27, 2026

**The customer chooses what to save and where. ReDown takes responsibility for the machinery.**

This is the desired customer journey, not a claim that every capability has already passed acceptance. Read with the [Permanent Engineering Vision](PERMANENT_ENGINEERING_VISION.md), [original verification vision](README.md), [owner's intended implementation](../../11.25.2026/MY_INTENDED_IMPLEMENTATION.md) and active roadmap. It gives every engineer and agent a common behavioral target without requiring the owner to prescribe every internal decision. It does not authorize a new interface, change menu semantics or expand the active checkpoint.

# ReDown — The customer experience we are engineering toward

Imagine an ordinary customer who knows nothing about Cloudflare Workers, APIs, IndexedDB, service workers or software architecture.

They simply want to save things to their cloud.

## Day 1 — Installation

The customer installs ReDown.

They open it, connect their cloud account and choose a destination.

They find an image they like, right-click it and save it.

It works.

They save another image. It works again.

They close the Shelf. They continue saving.

They never encounter a Worker initialization screen, never need to understand Simple versus Depth to make saving work, and never have to repair infrastructure themselves.

**Their first impression is that ReDown is a natural extension of their browser.**

## Day 2 — Ordinary use

The customer uploads a folder containing hundreds of files.

ReDown prepares the operation, preserves the necessary source material and begins uploading.

Once the transfer has been durably accepted, where supported, the customer can close the Shelf.

They continue browsing.

ReDown handles temporary connection failures independently. Successful files are preserved. Unsuccessful files are retried without unnecessarily repeating completed work.

The customer does not have to supervise the process.

## Day 7 — Something goes wrong

The customer's internet connection temporarily disappears.

ReDown preserves the unfinished work.

When connectivity returns, eligible operations recover automatically.

If something genuinely cannot be recovered, the customer finds it in Queue.

### Queue

> **Photograph.png**
>
> Connection interrupted
>
> Retry
>
> Original source URLs

They press Retry.

It works.

They don't need to understand why the connection failed, how recovery operates or what internal state had to be restored.

## Day 14 — ReDown becomes invisible

The customer has grown accustomed to saving directly to their cloud.

They choose Silent feedback because they no longer want routine notifications.

ReDown quietly continues doing its work.

The customer trusts that their files are being verified. Queue and History remain available whenever they want to inspect the results.

The software does not constantly demand their attention.

**It has become a utility rather than an activity.**

## Day 21 — Three weeks after installation

- Right-click saving still works.
- Their original destinations remain configured.
- Their shortcuts still work.
- Uploads remain dependable.
- Failed operations remain recoverable.
- Their settings remain intact.
- No unnecessary infrastructure maintenance.

The customer has not needed to understand ReDown's internal architecture at any point.

They have simply used it.

## One year later

The customer returns after several months of inactivity.

They reconnect if their provider genuinely requires authorization.

Their saved configuration remains intact. ReDown inspects and recovers its existing infrastructure as necessary.

The customer right-clicks an image.

It saves.

# What this vision means for our engineers

Every architectural decision should be evaluated against this customer's experience.

| Engineering principle | Customer experiences |
| --- | --- |
| Durable execution | My work doesn't disappear. |
| Self-reconciliation | I don't have to repair anything. |
| Provider abstraction | Saving feels consistent across clouds. |
| Transactional integrity | My configuration remains intact. |
| Automatic recovery | Temporary problems rarely concern me. |
| Verified publication | I can trust that my files arrived. |
| Fault isolation | Other features continue working. |
| Architectural simplicity | The software remains dependable over time. |

The individual technologies are merely instruments for achieving this experience.

# The ultimate acceptance criterion

An agent should not merely ask whether its code compiles, whether its tests pass, or whether it satisfies one isolated instruction.

It should ask:

**Does this implementation bring us closer to a product that an ordinary customer can install, use every day for three weeks, and return to a year later without having to understand or maintain its machinery?**

That is the vision I understand.

Not the most elaborate cloud-saving software.

Not the software with the greatest number of recovery mechanisms.

**The software that quietly, consistently and reliably does what the customer asked it to do.**

---

# Companion — Detailed customer journey and engineering interpretation

The preceding narrative is the owner-selected vision, preserved in full. The following existing details clarify its implementation: customers may deliberately choose Simple, Narrow or Depth for their preferred menu presentation, but never need to switch modes to make saving work. The narrative describes desired outcomes for eligible, authorized operations, not an unconditional guarantee when original sources or provider access are genuinely unavailable.

## Day 1 — Installation, choosing locations and the first save

The customer installs ReDown, opens the Shelf and connects their chosen cloud account through normal authorization. They see familiar controls rather than an infrastructure setup procedure.

For Cloudflare R2, the customer opens File Explorer, finds the bucket or folder they want, right-clicks it and registers it as a save location using the existing destination controls. They can choose the menu presentation that suits their needs:

- **Simple:** select an exact location, such as Photos/ or Projects/References/, and make it available as a direct save destination. The customer chooses the specific location, not the entire directory tree.
- **Narrow:** choose an exact destination while retaining its useful ancestor hierarchy. For example, the customer selects Projects/References/ and can navigate the corresponding bucket and ancestor levels in the native menu. Preserve the established Save here actions at eligible levels, level visibility controls and restricted presentation where configured. Do not introduce unrelated sibling locations.
- **Depth:** select an authorized bucket scope and depth limit to expose its discovered hierarchy within that limit, with established direct-save and Save here behavior.

These are existing choices, not three separate transfer engines. Preserve their actual established configuration, visibility, Default and Quick Select semantics; the current product specifications control exact composition and provider availability. The implementation names Narrow as nested internally. The customer's choice of mode determines how locations are presented and selected, never whether an unrelated mode must first initialize the transfer infrastructure.

The customer may configure one or more locations and later edit, hide or remove assignments using existing controls. Preserve distinct assignments, exact account/bucket/prefix, explicit defaults and the customer's intended presentation. Do not delete remote files merely because a menu assignment is removed. Do not force a user to adopt a different mode, nor invent a new onboarding wizard just to explain these choices.

The customer returns to a webpage, finds an image and invokes the actual native save action for their chosen location. It saves to precisely that location and is verified. They repeat the operation with another image. They can close the Shelf and continue eligible right-click saving. Simple and Narrow must work independently from the first use, without an earlier Depth save, manual Worker setup, redundant consent, or an unnecessary second click. Depth must meet the same standard. If genuine permission or source limitations prevent a save, report the actual outcome and offer the necessary corrective action.

**The first impression: ReDown is a natural extension of the browser.**

## Day 2 — Everyday saving and uploading

The customer uses their chosen destinations repeatedly. They can choose a different configured location without rebuilding or repairing the transfer engine. They upload a folder of many files using the existing Upload controls. ReDown records the original selection, prepares it and transfers it through shared production capabilities.

When preparation genuinely depends on the Shelf, ReDown plainly asks the customer to keep it open. Once durable source ownership and independent background execution have actually been established for that route, ReDown can say the upload is accepted and the Shelf may close. The customer continues browsing. No premature success or unsupported safe-to-close claim.

ReDown handles recoverable interruptions automatically, preserves verified files and retries only outstanding work. A complete browser shutdown is not a promise of ongoing execution; recover eligible jobs on restart. Preserve exact destinations and contents.

## Day 7 — A temporary problem

The customer's internet connection disappears during an upload. ReDown preserves the intent, recoverable sources and verified progress, then automatically reconciles and resumes eligible work when conditions permit.

Suppose 41 of 43 files verify and two fail. The customer is not required to upload all 43 again. If automatic recovery cannot finish, Queue retains the two unsuccessful items, with Retry and Retry All Failed. Deliberate retries remain available without an arbitrary lifetime cutoff. When the original source bytes are still retained, a simple retry is sufficient. For web saves, expandable recorded Source URL and Host URL/original screenshot context where available allow the customer to return to the source; local files receive simple original-file reselection when genuinely necessary. These are secondary recovery aids, not a substitute for automatic recovery.

The original target and logical identity remain intact. Reconcile unknown publication before replay; do not duplicate confirmed files, charge again for the same logical save, or report the entire batch as successful prematurely.

## Day 14 — ReDown becomes an ordinary utility

The customer has grown accustomed to saving directly to their cloud. They can choose Silent or Normal transfer feedback in Settings. Silent suppresses routine unsolicited feedback, not the actual transfer, recovery, verification or persistent results. Normal provides concise progress and truthful outcomes without narrating every internal step. Essential instructions remain visible in either mode when genuinely needed.

Queue, History and receipts remain accessible as applicable. The customer can inspect progress or retry a failed job whenever they choose. They can change a destination, switch menu presentation, save by screenshot or a configured shortcut where the active release supports it, or keep their original configuration. These actions do not require them to understand internal machinery.

**The software has become a utility rather than an activity.**

## Day 21 — Three weeks of ordinary use

The customer can still save using their originally chosen Simple, Narrow or Depth locations. Their saved assignments, settings, available shortcuts, provider connections and legitimate defaults remain intact across ordinary lifecycle events. Their native menu continues to reflect the configured presentation. They can add another location without losing the first.

They can use ordinary manual uploads and other supported features without an unrelated optional feature becoming a prerequisite. Temporary faults recover automatically wherever possible. Unfinished work stays actionable, successful work stays verified, and unrelated providers or components remain usable when one fails.

The customer has not needed to learn Worker provisioning, service-worker lifecycles, storage schemas, recovery budgets or provider API differences. They have simply used the software.

## One year later — Returning after inactivity

The customer returns after several months away. If their provider genuinely requires reconnecting, they do so through the usual authorized flow. ReDown preserves their saved locations and preferences, reuses valid existing infrastructure and automatically repairs recoverable readiness issues.

The customer right-clicks an image, selects one of their familiar destinations and saves it. Actual verification, not optimistic feedback, establishes completion.

This is a longevity target to validate over time, not a claim that simulated lifecycles prove one year of real reliability.

## The engineer's behavioral target

| Engineering responsibility | Customer experience |
| --- | --- |
| Shared menu compiler and exact destination resolver | My Simple, Narrow and Depth choices behave as configured. |
| Shared Worker readiness and recovery | I do not have to prepare or repair infrastructure. |
| Existing durable IndexedDB source persistence, journal and scheduler | My admitted work does not unnecessarily disappear when I close the Shelf or restart. |
| Shared production API and provider adapters | The GUI and automation exercise the same dependable capabilities. |
| Persistent Queue and source recovery | I can easily finish the few items that could not recover automatically. |
| Transactional integrity and verification | My configuration is intact and I can trust the files actually arrived. |
| Feedback preference and fault isolation | I can use ReDown quietly and unrelated failures do not needlessly interrupt me. |

Use the established references and architecture from the Permanent Engineering Vision. Make ordinary implementation decisions independently within the authorized checkpoint; do not ask the owner to prescribe every timeout, module boundary or state transition. Respect genuine product, authorization, cost, resource and compatibility boundaries. Preserve and repair the existing working infrastructure rather than invent competing engines.

The practical acceptance target is the actual customer journey: install, connect, select a Simple or Narrow or Depth location, perform the first native save independently, repeat ordinary saves, upload, recover interruptions, change preferences, restart and return to the same dependable behavior. Cover all three modes independently and preserve exact configuration. The active execution index determines which pieces to implement and qualify in each session. Record actual fixture, packaged-browser, installed-browser and authorized live-provider evidence separately; never claim the whole journey passed when only parts have been verified.

**Not software that the customer must maintain. Software that quietly, consistently and reliably does what the customer asked it to do.**
