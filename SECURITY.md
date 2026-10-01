# Security

This application currently targets local, authenticated, single-process use. It is not a reviewed public Internet deployment.

Keep the host-facing port bound to loopback. The Docker container listens on its internal interface; the supplied Compose file publishes only on 127.0.0.1. Keep the database and session key private. The demo uses publicly documented credentials and a separate marked database; do not route it to a public address or use it for real data.

Do not post credentials, customer information or exploit details in a public issue. After this project is published, use the repository's private vulnerability-reporting channel if enabled, or contact its owner privately. No security contact address or hosted reporting channel is configured in this local checkout yet.

Security-relevant changes should include regression coverage for authorization, input validation, CSRF, session revocation and migration preservation. Dependency updates must preserve the lockfile and pass the build/tests.

## Known dependency advisory

The September 29, 2026 registry audit reports one low-severity advisory for Quill 2.0.3: [GHSA-v3m3-f69x-jf25](https://github.com/advisories/GHSA-v3m3-f69x-jf25), HTML-export XSS. The registry and advisory list no patched version at this checkpoint. The editor remains enabled; this is an open upstream dependency risk, not a clean audit result.

Rich text is untrusted. The API sanitizes it with a formatting-only allowlist before storing/returning it; Angular also sanitizes rendered HTML. Scripts, event attributes, styles, embedded media and unsafe link schemes are disallowed server-side. Regression tests exercise hostile HTML through this sanitizer. These controls mitigate the application's saved/rendered-content path; they do not constitute a fix of Quill itself. Do not add raw HTML export or bypass sanitization. Reassess this advisory before a hosted release and when updating the editor.
