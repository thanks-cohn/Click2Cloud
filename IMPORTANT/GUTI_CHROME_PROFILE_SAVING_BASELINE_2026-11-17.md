# IMPORTANT — Guti Chrome profile: current ~90% saving baseline

**Recorded:** November 17, 2026  
**Owner observation:** Current Click2Cloud version is the one producing roughly **90% verified saves** in the **Guti Chrome profile/account**.  
**Status:** **PRESERVE AS A PROFILE-SPECIFIC WORKING BASELINE — NOT RELEASE CERTIFICATION.**

## What is known

- The **latest good saving results were obtained using the owner's “Guti” Chrome account/profile**. This identity matters when comparing future sessions and installations; do not pool different Chrome profiles without labeling them.
- The owner identifies the **currently tested Click2Cloud version** as the approximately **90%-saving** version. For this branch, the pinned source is `implement/explorer-aesthetic-foundation-2026-11-15` at **`e188dc7f86b522207226bf30f8f6c25fec2a0a1e`** (extension `0.3.19`).
- Previous analysis of two RAW recorder exports reported **161 recorded verified saves out of 178 recorded attempts (~90.45%)**, with 17 blocked attempts; the incremental 37 recorded attempts in the newer export were all verified. Treat these as **recorder-derived outcomes**, not proof that every unobserved attempt succeeded, every byte was independently checked, or the whole installation was healthy.
- **The owner is NOT certain whether all earlier errors originated in this same installed version/profile.** Do **not** attribute a historical error to the Guti profile, another branch, or this current version without identifying the original event/build/profile evidence. Export build metadata alone does not establish the Chrome profile or when any historical issue first arose.
- Problems previously discussed include intermittent Shelf/Explorer navigation, Worker readiness and repair prompts, recorder test failures, and storage errors. **Those issues remain open for diagnosis, but their relationship to this particular good-saving session is not proven.**

## Mandatory comparison and preservation rules

1. Use the **Guti Chrome profile** plus the exact build/commit as an explicitly labeled control when comparing new installations/profiles. Do not call cross-profile results equivalent.
2. Preserve the current observed save success and the existing right-click engine behavior; changes to Worker recovery, Destinations Manager approval, Shelf/Explorer, or diagnostics must not regress successful remote saves.
3. Record for each test: Chrome profile label, extension ID, exact commit/build, timestamp, right-click mode, account/bucket scope (redacted), attempted/verified/blocked counts, evidence coverage and failure reason. **Never publish credentials or raw private URL data.**
4. Distinguish **newly observed errors** from historical recorder entries, simulated fixtures, test-suite failures, and data carried over from earlier versions.
5. Do not mark the product fully stable or the old errors fixed solely because the current profile shows ~90% verified saves; nor should an unproven historical error be used to dismiss the current observed successes.

**Owner's central note:** “The latest good results are for my Guti Chrome account. I'm not sure whether the errors came from another version, but this is the version currently saving around 90%.”  
