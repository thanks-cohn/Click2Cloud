# Narrow rewrite — location-picker intent contract only (not implementation)

**Narrow is intentionally a later independent rewrite.** The shared setup picker may send a typed destination-selection intent to Narrow, but no Simple code calls Narrow, and Narrow owns its configuration.

When the user selects the circle beside a known folder `redown/Photos/Weddings/2026` and chooses **Narrow**, Narrow receives the exact target path and chosen menu title. It must express the **whole selected route**:

```text
REDOWN → Cloudflare → redown → Photos → Weddings → 2026
```

With a custom title `Wedding Archive`, only the **terminal selected folder's displayed label** changes:

```text
REDOWN → Cloudflare → redown → Photos → Weddings → Wedding Archive
```

The actual destination remains `redown/Photos/Weddings/2026`. All ancestors use their real names. If the user chooses **Use bucket name** for the terminal label, show `redown` at that terminal row, but retain its distinct internal action identity. Duplicate *display* labels require the user's explicit confirmation.

Narrow stores only its intentionally selected paths and aliases, not the whole Depth inventory. Unselected cloud branches are not auto-included. Nothing here changes Depth's settings, journal or menu behavior. Narrow shares only the neutral picker event format and finished menu registry interface.

Reference: `../../shared_destination_picker/`. This is a **contract**, not an implemented Narrow engine.
