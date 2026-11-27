# Experimental — Chrome as a Shortcut Multiplier

**Research proposal · November 26, 2026 · Not a V1 commitment**

## The idea

A computer and its applications already have many keyboard shortcuts. Some combinations are assigned to actions that a particular user rarely needs. Chrome's global extension commands can sometimes take precedence over those ordinary application-local shortcuts, even when Chrome is not the focused application.

Could Chrome serve as a second, user-controlled keyboard command layer? A person could deliberately assign existing combinations to ReDown actions, then restore normal application behavior when the layer is disabled. The aim is to expand the useful actions available from the same keyboard, not to create new physical key combinations.

The more ambitious hypothesis is that a persistent, explicitly enabled headless Chrome instance could provide this functionality without a visible browser window. This might make Chrome useful as a background command orchestrator, independently of its ordinary browsing role.

## What is established and what is not

| Capability | Evidence / status |
|---|---|
| Global extension commands while another application is focused | Documented Chrome capability, subject to platform and registration constraints |
| Taking precedence over ordinary application shortcuts | Chrome documentation explicitly recognizes this potential conflict |
| Overriding another application's registered global hotkey | Generally unavailable when the combination is already registered |
| Protected operating-system or reserved browser shortcuts | Do not attempt to override |
| Persistent headless Chrome receiving physical global shortcuts on Windows | Unverified hypothesis |
| Automatically switching shortcut profiles according to the active application | Separate research question; not a standard Commands API capability |
| Doubling the number of useful actions | Possible conceptual benefit of context-dependent layers; not a measured result |

Modern Chrome headless mode creates platform windows without displaying them. That alone does not establish physical global hotkey delivery or extension service-worker wake behavior. A minimized or background-running ordinary Chrome instance is a separate case and should be tested independently.

## Research plan

Use a disposable Chrome profile, a minimal test extension and a harmless local test application with known ordinary shortcuts. No cloud credentials, transfers, screenshots of private content, or production profile access are needed for the first experiment.

| Scenario | Evidence to record |
|---|---|
| Chrome focused, local command | Baseline extension dispatch |
| Chrome minimized, another test app focused | Whether registered global command dispatches |
| Test app has the same ordinary local shortcut | Whether Chrome or the app receives the action |
| Test app already owns a global hotkey | Whether registration fails or conflicts are reported |
| Chrome has no visible windows but is running | Physical shortcut delivery, browser process lifetime |
| Modern headless Chrome | Physical shortcut delivery, extension availability, service-worker wake |
| Idle service worker and repeated commands | Delivery rate, duplicate dispatch and latency |
| Disable layer or exit Chrome | Original test application behavior restored |
| Restart, sleep/wake and keyboard layout changes | Registration and release behavior |
| Resource-constrained Windows machine | Idle memory, CPU and responsiveness |

Record Chrome/OS versions, shortcut assignment, scope, mode, event count, latency, conflict outcome, and restoration result. A simulated page keyboard event is not proof of real system-wide hotkey delivery. Report unsupported or untested cases explicitly.

## Product boundaries

- Opt-in only, with clear active status and user-selected bindings.
- Warn about conflicts and provide an obvious way to disable or remove the layer; merely ignoring commands may not restore the original application shortcut while registration remains active.
- Use documented browser and OS mechanisms, respect protected shortcuts, and do not intercept arbitrary typing or store keystrokes.
- No hidden persistence, shared active Chrome profile, or bypass of browser permission requirements.
- Keep screenshot and transfer authorization separate from shortcut delivery. A global shortcut does not by itself grant access to another application's contents.
- If headless Chrome cannot meet reliability or resource targets, evaluate an optional native hotkey companion using normal OS registration APIs instead.
- Keep all experiments isolated from production ReDown until validated. V1 shortcut reliability takes precedence.

## Potential direction

A future ReDown Shortcut Engine could offer explicitly selected profiles, context-sensitive commands, sequential chords, cloud destination shortcuts, and browser-independent actions. The extension could orchestrate commands while an optional native companion executes authorized operations. Preserve a common command interface and verification semantics.

The original insight is not that Chrome creates extra keys, but that global registration may make an otherwise application-bound combination useful for a different purpose. Whether a persistent invisible-window instance can make that practical is the central experiment.

## References

- [Chrome Commands API](https://developer.chrome.com/docs/extensions/reference/api/commands) — global command scope, shortcut suggestions and conflict constraints.
- [Chrome Headless mode](https://developer.chrome.com/docs/automation-and-testing/headless/) — modern headless browser architecture.
- [Windows RegisterHotKey](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerhotkey) — system-wide hotkey registration and conflicts.
- [Windows UnregisterHotKey](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-unregisterhotkey) — release of registered hotkeys.

**Status: documented research idea only. No implementation or physical Windows headless shortcut test has been performed.**
