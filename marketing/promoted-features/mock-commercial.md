# Click2Cloud — Mock Commercial Campaign

**Campaign:** “More than a download”  
**Parent brand:** Tinker & Co.  
**Format:** Two text-only mock commercials (scripts and shot directions)  
**Status:** Creative concepts for planned features, not a claim of currently shipped workflows.  
**Character continuity:** The same slightly hapless creator stars in both commercials. Cluddy can appear in end cards.

## Commercial 1 — “Only 500 MB Left”

**Approximate runtime:** 45–60 seconds  
**Pitch:** True remote saving lets you save a large supported source to your Cloudflare R2 bucket without downloading the file onto your laptop. Then turn authorized cloud objects into usable URLs and export a whole directory's links.

### Scene 1 — The tragedy (0:00–0:08)

**Visual:** A laptop fills the screen: **“Only 500 MB free.”** Cut to a browser page showing a 20 GB collection of media the creator wants to save. Cut back to the tiny red storage bar.

The creator sits in his chair, slumped forward as though all hope is lost. A single overdramatic violin note plays.

**Voiceover:** “Twenty gigabytes of media. Five hundred megabytes of space.”

**Creator:** “...Seriously?”

### Scene 2 — The revelation (0:08–0:15)

**Visual:** Over-the-shoulder view. He looks up. His eyes widen. An absurdly bright lightbulb turns on above his head with a cartoon **DING!** He makes a ridiculous, triumphant grin.

**Creator, whispering:** “Wait a minute.”

### Scene 3 — The right-click (0:15–0:27)

**Visual:** He right-clicks supported online media, chooses **Click2Cloud → Save Remotely → Cloudflare R2 → My Bucket**. A simple diagram shows **source → remote transfer service → R2 bucket**. The laptop is visibly *not* part of the file-byte transfer path.

**On-screen:** **20 GB saved remotely.**

Cut back to the computer's local storage display: **500 MB free.** It hasn't changed from the remote file transfer.

**Creator:** “HA!”

**Voiceover:** “Click2Cloud. Save remotely. Keep those files off your computer.”

### Scene 4 — The links (0:27–0:43)

**Visual:** His saved media is visible inside the bucket. A quick setup montage shows connecting an authorized domain or subdomain to Cloudflare R2, completing the required configuration and opting into public object access. He right-clicks an individual saved object: **Get URL → Copy**. Then he right-clicks a *directory/prefix*: **Export URLs**.

An impressive, clean list populates: **filename | object key | full URL**. He exports CSV / JSON. The links appear ready for use in a gallery, project or script.

**Voiceover:** “And when you need links? Connect your domain, copy one URL—or export the URLs for an entire directory.”

**On-screen:** **ONE RIGHT-CLICK. A WHOLE LIBRARY OF LINKS.**

### Scene 5 — The punchline (0:43–0:55)

**Visual:** He stares admiringly at the URL export. His laptop storage notification still says **500 MB free**. He leans toward the camera and gives a shamelessly pleased grin. Cluddy waves in the corner.

**Voiceover:** “Your hard drive didn't grow. Your options did.”

**End card:**  
**CLICK2CLOUD**  
**Save remotely. Make it linkable. Export it all.**  
*By Tinker & Co.*

---

## Commercial 2 — “I Need a Stupid Little Website”

**Approximate runtime:** 50–65 seconds  
**Pitch:** A creator already has a large, organized bucket of media. Connecting a domain and exporting its usable URLs makes it easy to populate a simple website without copying every asset URL individually.

### Scene 1 — An embarrassment of assets (0:00–0:10)

**Visual:** The same creator from Commercial 1. His desktop is clean, his Cloudflare R2 bucket is full of photos, illustrations, graphics and other assets. He's proud of his collection. He scrolls and nods at his own genius.

**Creator:** “Look at all this stuff.”

He stops, contemplating the screen.

**Creator:** “...Now I need a website.”

A pause.

**Creator, exasperated:** “Just a stupid little website!”

**Sound:** Dramatic sting, as though he has been handed an impossible quest.

### Scene 2 — The old domain (0:10–0:21)

**Visual:** He slumps again. Then his eyes drift toward an old email or registrar receipt: **“Your domain renewal — $8.99”** (illustrative fictional price). A cheap little domain he bought ages ago and never used.

A tiny lightbulb flickers, fails, and then turns on in an absurdly theatrical burst.

**Creator:** “Wait. I HAVE a domain!”

**Voiceover:** “That random domain you bought years ago? It might finally have a job.”

### Scene 3 — Connect it (0:21–0:34)

**Visual:** In **Click2Cloud**, he chooses an authorized Cloudflare R2 bucket, sets up his old domain or a suitable subdomain through the real Cloudflare R2 custom-domain flow, checks ownership and DNS requirements, and deliberately enables the desired public object access. The UI reports readiness only once the setup is complete.

**Creator:** “You. You're useful now.”

**On-screen:** **YOUR DOMAIN + YOUR MEDIA**

**Voiceover:** “Connect a domain you control to your bucket. Give supported public objects their own usable links.”

### Scene 4 — Export the whole directory (0:34–0:46)

**Visual:** He right-clicks his **Portfolio Assets** directory.

A tiny context menu appears: **Export URLs → CSV / JSON**.

Suddenly, hundreds of URLs organize themselves into a neat list. A visual flourish makes the result feel delightfully instant, but the interface can show progress for large exports.

**Creator:** “All of them?!”

**Voiceover:** “No more copying a hundred image links one by one. Export the entire directory in a few clicks.”

**On-screen:** **FROM BUCKET TO URL LIBRARY.**

### Scene 5 — The little website (0:46–1:00)

**Visual:** He opens a simple website template or builder. He imports or pastes the exported asset URL list and maps image fields into a gallery. Thumbnails snap into a clean portfolio grid. A quick click publishes the *site through the chosen site-hosting workflow*—not simply because a bucket domain was connected.

We now see the finished site: a clean, slightly silly portfolio, with all his media proudly displayed. He leans back like a man who has built the internet.

**Creator:** “I MADE A WEBSITE.”

A beat. The site title is hilariously unimpressive: **“My Stuff.”**

**Voiceover:** “Your media was already there. Now the links are ready to put it to work.”

### Scene 6 — End card (1:00–1:05)

Cluddy bounces into the corner and points at the finished webpage.

**End card:**  
**CLICK2CLOUD**  
**Your bucket. Your domain. Every URL.**  
**Save it. Link it. Build with it.**  
*By Tinker & Co.*

---

## Why the two commercials work together

**Commercial 1 sells the relief:** The source is much larger than the creator's remaining local disk space, yet a supported true-remote transfer saves it to authorized cloud storage without first downloading it to the laptop. The funny unchanged **500 MB free** notification lands the point.

**Commercial 2 sells the possibilities:** Having a media library is useful; being able to copy one URL or export a whole directory's URLs makes it readily reusable in website templates, content-management systems, developer tooling, and automated workflows.

**Shared visual joke:** Our hero repeatedly believes he's encountered a catastrophic technical problem. He looks up, a ridiculous lightbulb goes off, and he realizes the workflow can be much simpler.

## Product and truth-in-advertising notes

- These are **mock ads for planned Click2Cloud features**, not footage or assertions of implemented or verified release behavior.
- “20 GB remote save” is an *illustrative scenario*, contingent on supported sources, authorized provider accounts, remote-transfer infrastructure, file-size rules, and provider quotas/costs. The number is intentionally comic, not a currently published maximum or guarantee. The local disk number remains unchanged **by that transfer**; ordinary browser/cache/system activity can still use space.
- **Connecting a domain to R2 is not the same as publishing a website.** The object custom domain serves permitted bucket objects. A website may need separate hosting and typically a different hostname/subdomain, path arrangement or routing. The commercial's site is assembled with a template/builder from exported URLs.
- Domain registrar transfer to Cloudflare is *not* required just to set up an R2 custom domain; the domain must be controlled by the user and meet supported DNS/Cloudflare setup prerequisites.
- Bucket privacy is the default. The film's public URLs require explicit customer authorization and verified publication/configuration. Exporting a manifest does not itself make private files public.
- Objects are addressed using exact bucket keys and a configured, verified endpoint; exported URLs must be correctly encoded and actually resolvable where promised. Large prefix exports should paginate and handle errors rather than pretending everything always completes instantly.
- **Naming:** The creator's second-commercial idea referred conversationally to “adding it to ReDown.” However, the user explicitly designated remote saving, R2 URL connection, and bulk URL export as **Click2Cloud** goals. The scripts therefore use **Click2Cloud** consistently. ReDown and its standalone variants remain separately branded applications.
- Any $5/month membership, “unlimited free remote” promise, or bundled downloads needs a finalized, sustainable entitlement and a released implementation before being included as an actual purchase claim.

## Recommended campaign line

**Click2Cloud — Save it remotely. Make it linkable. Build something with it.**
