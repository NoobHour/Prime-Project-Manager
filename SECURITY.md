# Security

This application currently targets local, authenticated, single-process use. It is not a reviewed public Internet deployment.

Keep the host-facing port bound to loopback. The Docker container listens on its internal interface; the supplied Compose files publish only on 127.0.0.1. Keep normal application databases and session keys private.

The persistent local demo (`pnpm demo`) uses publicly documented credentials and preserves edits. Keep that mode local and use fictional data only. The separate portfolio sandbox (`compose.demo.yaml` or `pnpm demo:hosted`) is designed for a hosted preview: it creates temporary fictional data, resets periodically, and blocks account changes and new uploads. Shared visitor edits remain visible until reset; it is not a moderation system. Before publishing a sandbox URL, validate HTTPS, exact origin, proxy routing, traffic limits and resets on the actual server. See [PORTFOLIO-DEMO.md](docs/PORTFOLIO-DEMO.md). Neither demo mode is suitable for real customer data.

Do not post credentials, customer information or exploit details in a public issue. For [Prime-Project-Manager](https://github.com/NoobHour/Prime-Project-Manager), use GitHub's private vulnerability reporting if it is enabled, or arrange a private reporting channel with [NoobHour](https://github.com/NoobHour). No dedicated security email address is advertised. Fork maintainers should provide their own reporting contact.

Security-relevant changes should include regression coverage for authorization, input validation, CSRF, session revocation and migration preservation. Dependency updates must preserve the lockfile and pass the build/tests.

## Known dependency advisory

The October 1, 2026 production lockfile audit reports one low-severity advisory for Quill 2.0.3: [GHSA-v3m3-f69x-jf25](https://github.com/advisories/GHSA-v3m3-f69x-jf25), HTML-export XSS. The registry reports no patched version at this checkpoint. The editor remains enabled; this is an open upstream dependency risk, not a clean audit result.

Rich text is untrusted. The API sanitizes it with a formatting-only allowlist before storing/returning it; Angular also sanitizes rendered HTML. Scripts, event attributes, styles, embedded media and unsafe link schemes are disallowed server-side. Regression tests exercise hostile HTML through this sanitizer. These controls mitigate the application's saved/rendered-content path; they do not constitute a fix of Quill itself. Do not add raw HTML export or bypass sanitization. Reassess this advisory before a hosted release and when updating the editor.
