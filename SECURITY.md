# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Current production (master branch) | Yes |
| Previous releases | No |

TrailLog is a continuously deployed application. Only the current production release
running at traillog.gracezero.ai receives security updates. There are no LTS or
legacy branches.

## Reporting a Vulnerability

If you discover a security vulnerability in TrailLog, please report it responsibly.

**Email:** security@gracezero.ai
**Subject line:** TrailLog Security

### What to Include

- A clear description of the vulnerability
- Step-by-step reproduction instructions
- Affected component(s) (authentication, authorization, API, client, infrastructure)
- Impact assessment (what an attacker could achieve)
- Any proof-of-concept code or screenshots
- Your suggested severity (Critical, High, Medium, Low)

### Response Timeline

| Stage | Timeline |
|-------|----------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 72 hours |
| Critical vulnerability patch | Within 7 days |
| High severity patch | Within 14 days |
| Medium/Low severity patch | Next scheduled release |

## Scope

The following areas are in scope for security reports:

- **Authentication** -- OAuth flow, email/password login, session management
- **Authorization** -- Middleware enforcement, role-based access, troop/adventure scoping
- **Data exposure** -- Unintended disclosure of user PII, credentials, or tokens
- **Injection** -- SQL injection, XSS, command injection, template injection
- **Session management** -- Fixation, hijacking, cookie security
- **API security** -- Broken access controls, mass assignment, IDOR

## Out of Scope

The following are out of scope and will not be treated as valid security reports:

- **Social engineering** -- Phishing attacks against users or administrators
- **Denial of service** -- The application already implements rate limiting (20 req/15min on auth, 100 req/min on API)
- **Third-party dependencies** -- Vulnerabilities in upstream packages should be reported to the respective maintainers. If you believe a dependency vulnerability specifically impacts TrailLog, include that analysis in your report.
- **Non-security bugs** -- Functional bugs, UI issues, and feature requests should be filed as regular GitHub issues
- **Self-XSS** -- Vulnerabilities that require the victim to paste code into their own browser console
- **Missing security headers on non-production environments** -- Development and staging configurations intentionally differ from production

## Safe Harbor

We will not pursue legal action against security researchers who:

- Act in good faith and follow this disclosure policy
- Avoid accessing or modifying data belonging to other users
- Do not degrade the service for other users
- Report vulnerabilities promptly and do not disclose them publicly before a fix is available
- Do not use automated scanning tools that generate excessive traffic

## Recognition

Researchers who responsibly disclose valid security vulnerabilities will be credited
in the release notes for the patch that addresses their report, unless they prefer
to remain anonymous.

## Bug Bounty

TrailLog is a small open-source project and does not operate a bug bounty program.
We appreciate the security community's contributions and offer public recognition
as described above.

## Additional Resources

- [Threat Model](docs/security/threat-model.md)
- [Authentication Documentation](docs/security/authentication.md)
- [Data Protection](docs/security/data-protection.md)
- [Dependency Audit](docs/security/dependency-audit.md)
