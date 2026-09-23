---
name: Qoot localization
description: Qoot language and coach-response localization behavior
---

Qoot defaults to English, persists the selected `en` or `ar` language in localStorage, switches document direction, and sends the selected language with coach context so response language matches the UI.

**Why:** Language changes need to survive reloads and stay consistent across layout, formatting, and conversational replies.

**How to apply:** Keep new user-facing copy behind the app language helper and include language in any future AI/provider prompt context.