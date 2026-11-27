# My Vision for ReDown

*Founder’s vision — November 26, 2026*

## Why I am building ReDown

I want to change the way people save files on the internet. I believe the computer should be a control panel, not a warehouse. When I see an image, capture a screenshot, or find a file I want to keep, I should be able to send it directly to a destination of my choosing without first filling up the storage on my computer.

The user should be able to sit at a computer with very little disk space and still make use of the enormous amount of storage available elsewhere. Whether that storage belongs to Google Drive, OneDrive, Dropbox, Cloudflare R2, or eventually another authorized machine, I want saving to feel like one simple action. The complexity of getting a file from one place to another should belong to the software, not to the person using it.

I want the three basic cloud providers to use a standard redown folder whenever possible. If ReDown cannot use or create that folder, it should simply save to the original authorized location in the same cloud account. No extra notification or confirmation for that fallback. The folder is a convenience, not a prerequisite for saving. I want V1 to focus on that simple behavior rather than inventing elaborate folder-creation features. Explicitly selected arbitrary folders and Cloudflare bucket/prefix routes retain their intended destination.

I also believe there is a security advantage to reducing unnecessary local downloads. People do not want suspicious files accumulating on their computers. I want ReDown to help reduce unnecessary local exposure while respecting browser security protections and keeping the user informed. Remote storage is not a cure for malware, and I do not want the product to make security promises it cannot keep.

## My ambition

My ambition is one billion paying ReDown customers. I want to build something of everyday usefulness, not a utility reserved for developers, system administrators, or people with powerful computers. I want ReDown to be affordable enough for ordinary people to buy and useful enough that they have a reason to keep using it.

My proposed price is twelve dollars a year for unlimited ReDown saving, subject to the user's cloud provider limits, alongside a one-time lifetime free allowance of thirty remote saves and thirty right-click saves. The allowance does not replenish daily, monthly or annually. Counting details and migration remain to be settled. I want the product to earn its place in people's lives through the quality of its service, not through unnecessary complexity. I also want a small, disclosed application usage record in each connected cloud so that simply uninstalling and reinstalling the extension does not automatically restore the allowance. I want this to be unobtrusive and privacy-respecting, without pretending that user-controlled records are tamper-proof or that unrelated accounts necessarily belong to the same person. I want a compact, versioned JSON allowance record, preferably in provider-native application storage, otherwise in a disclosed application file in an existing authorized redown or original cloud location. Its persistence should not depend on creating the standard folder. Integrity and rollback resistance should come from verified accounting and entitlement evidence, not disguising counters or filling files with irrelevant data.

One billion paying customers is my aspiration, not a prediction or a claim about the size of our present audience. I want our engineering and product decisions to leave room for that ambition rather than assuming that ReDown must always remain a small extension.

## The first release

The first version should be simple, compact, and immediately useful. A person should be able to connect their existing cloud storage, right-click a file and save it remotely. They should be able to press a keyboard shortcut to capture a screenshot and have it appear in their chosen cloud folder. They should also be able to activate a shortcut and click something they wish to save.

I believe Screenshot to Cloud, particularly Google Drive, and Shortcut + Click to Cloud are among our greatest opportunities to win users. Their usefulness can be understood without a lengthy explanation. Cloudflare has been our reference implementation because its accessible API made the original development practical. I want these same interactions to work with Google Drive, OneDrive and Dropbox in the very first commercial release, through one shared architecture rather than four independent systems.

I want the first release to support Cloudflare R2, Google Drive, OneDrive, and Dropbox. It should handle files and folders in both directions, allow users to choose their destinations and define saving rules, and provide an understandable Explorer, Queue, and History. When a cloud provider permits it, users should be able to obtain links to their saved files, with public access under their control.

I do not want the first release to wait for every imaginable feature. I want it to be a complete product with a clear purpose: make intentional remote saving as natural as downloading a file to a computer.

## The second release

I intend for the second version to be a major upgrade to ReDown, not an entirely separate product. I want to give customers a genuine reason to upgrade.

This is where I want to introduce automatic download rerouting, after it has been thoroughly tested, and expand compatibility to generic S3 providers. I also want to prepare for an independent native transfer engine, parallel processing, and the ability to continue authorized transfers even after Chrome has closed.

In that future architecture, the extension can become the orchestrator. The browser provides the controls and communicates what the user wants done; an optional native engine performs the heavy work. The same interface, operation identities, verification standards, and receipts should remain meaningful regardless of which engine is doing the work.

The first version must not be made unreliable or deliberately incomplete to sell the second. Essential security, access to one's files, and critical repairs belong to the foundation of ReDown.

## My standard for reliability

I want ReDown to feel like a working machine. When a person gives it a simple instruction, the software should carry it out reliably. The right-click menu should be there after login. Saving, uploading, downloading, and renaming files should not become recurring sources of frustration.

I want people to be able to use the software every day for a year without having to think about its internal machinery. It should be capable of handling substantial workloads, even on modest computers, and should recover honestly from failures rather than hiding them.

I want the system to keep receipts. I want to know what was requested, where it went, whether it arrived, and whether the result was verified. An uncertain operation must not be presented as a success. A beautiful notification is only meaningful when the software has actually done what it says it has done.

Our current live R2 campaign has demonstrated 578 production-confirmed uploads out of 578 eligible files, followed by independent retrieval and SHA-256 matches for all 578 files. That is encouraging, but the expected-count mismatch, location-audit verdict, pending retained-copy verification after restart, and earlier fault-recovery failures mean that we still have work to do. I want our claims about ReDown to follow the evidence.

## A machine that can be tested

I want ReDown to be designed so that both people and software agents can operate it through the same underlying application logic. I do not want an attractive graphical interface concealing an engine whose behavior cannot be inspected, exercised, or verified.

The Python Laboratory is part of that vision. I want to be able to place real or generated files in a directory, produce a manifest, run a workload, and receive independently checkable receipts. I want agents to be able to simulate the ordinary and extraordinary things people do with the software, including interruptions, large collections, and different cloud providers.

As our access to more powerful machines grows, the testing infrastructure and execution engine should be able to grow with us. A benchmark is not a permanent ceiling on the product. The architecture should accommodate greater workloads without sacrificing integrity or making existing users' computers struggle unnecessarily.

I want the engineering to be sophisticated enough for demanding professional and enterprise use, but the product itself to remain a simple twelve-dollar utility. Simplicity is the experience I want to deliver; it is not an excuse for weak engineering.

## The beauty of the machine

I do not want ReDown to feel like another anonymous piece of software. I want it to have a personality, to be compact and beautiful, and to feel like a physical machine that responds to the person using it.

I have found something important in the aesthetics of the games I remember from childhood: the colors, the animations, the anticipation, and the feeling of discovering a world that somebody made with care. I want some of that spirit to exist in ReDown. A small orb traveling from an image to its cloud destination, a satisfying success notification, or a beautifully designed control panel can make an ordinary task feel rewarding.

I want the Aesthetic API to give us room for different visual identities without changing the reliability of the underlying software. I want our themes to feel intentional rather than ornamental. The animations should complement the machine, not impede its operation.

I have experienced this myself while developing ReDown. A little animation inspired by the Nintendo 64 era made me look forward to testing the software in a way I had not before. I want to create something that other people can enjoy using for that same reason.

## Beyond the extension

ReDown is part of a larger vision for Tinker & Co. I want to develop an ecosystem of tools that make remote storage and the movement of files remarkably convenient. The smaller products, such as true-remote and ez-cloud, can offer simple, focused experiences, while ReDown brings the broader capabilities together. Chutey can explore a more natural drag-and-drop experience, and manyclouds can expand the range of storage services available.

At the center of this ecosystem, I want a universal file API that developers and agents can build upon. I want our applications to share dependable file-operation infrastructure rather than repeatedly inventing their own ways of moving and verifying files. I want to give people concrete reasons to choose our technology over established transfer utilities.

Eventually, I would like authorized computers in different locations to participate in the same system. A person could use one machine to direct where a file goes, while another machine receives or processes it. The computer in front of the user would no longer have to be the place where every file is stored.

I want to preserve the freedom to use different providers, different machines, and eventually different platforms. The ambition is not to replace everyone's existing cloud accounts. It is to make those accounts and authorized devices more useful.

## What I want ReDown to become

I want ReDown to be small enough to understand, beautiful enough to enjoy, dependable enough to trust, and powerful enough to grow into something much larger than its first release.

I want people to see a file, click it, and know that it has been saved where they wanted it to go. I want them to capture something important without thinking about where their browser put it. I want them to open ReDown and see a machine that works.

That is my vision: a future in which saving remotely is an ordinary part of computing, in which people have more control over where their files live, and in which the difficult work is carried out quietly and dependably beneath an elegant interface.

**ReDown. The future of downloading.**

**Your files. Your cloud. Your choice.**
