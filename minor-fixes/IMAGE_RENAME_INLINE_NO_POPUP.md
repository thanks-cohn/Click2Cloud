# Minor fix — instant inline image filename rename, with NO new popup

**Status:** Requested, not yet implemented.

When an image is open in the Explorer preview/gallery, **double-click its filename at the top** to turn that **same visible filename** into a focused inline editable input immediately. **No separate modal, popup, Rename dialog, prompt, secondary editor screen, or confirmation step.**

- Pre-fill the current basename; select the editable portion intelligently while preserving extension rules, exact source bucket/key and object identity. Typing edits in place.
- **Enter** submits directly to the existing authorized `fileAction` rename operation through the canonical File API; **Escape** cancels and restores the original name. Blur should cancel safely (never silently rename unless explicitly submitted).
- Show saving/pending/verified/conflict/failure status unobtrusively adjacent to the inline name. Do not show a success state until the cloud mutation is verified. A conflicted name stays editable with an inline error instead of opening a different popup.
- On verified rename, update the preview title, directory inventory and selection; preserve gallery navigation, image preview and folder context. If denied/uncertain, keep the original name and clearly reflect uncertainty.
- Reuse the existing rename validation/authorization/idempotency and `fileActionGUI('rename')` underlying API work where possible, but **do not invoke the existing `namedOperation('Rename',...)` popup** from this image-preview rename entrypoint.
- Focused test: double-click starts editing immediately; no new dialog opens; Enter commits, Escape cancels, conflicts show inline; original image bytes and browser UI remain intact.

This **overrides any older rename specification that allowed a separate name dialog**, but does not require replacing the existing right-click Rename interaction unless it is explicitly changed later.
