# Authentication Flows

TrailLog supports two authentication methods that create identical server-side sessions. There are no JWTs or client-side tokens.

## Google OAuth 2.0

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Express Server
    participant G as Google OAuth
    participant DB as SQLite

    B->>S: GET /auth/google (full-page navigation)
    S->>G: 302 redirect to consent screen
    Note over G: User authorizes (profile + email scopes)
    G->>S: Callback with authorization code
    S->>G: Exchange code for access token (server-side)
    G->>S: User profile (id, email, displayName, photo)
    Note over S: Token discarded after profile fetch
    S->>DB: Find by google_id OR email, create if new
    S->>S: Create session (express-session + SQLite store)
    S->>B: Set httpOnly cookie, 302 redirect to app
```

## Email/Password

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Express Server
    participant DB as SQLite
    participant E as Gmail SMTP

    Note over B,E: Signup Flow
    B->>S: POST /api/auth/signup {name, email, password}
    S->>S: Validate (min 8 chars, unique email)
    S->>S: bcrypt.hash(password, 10 rounds)
    S->>S: crypto.randomBytes(32) → verification token
    S->>DB: INSERT user (email_verified = 0)
    S->>E: Send verification email with token link
    S->>B: 201 "Check your email"

    Note over B,E: Verification
    B->>S: GET /api/auth/verify/:token
    S->>DB: SET email_verified = 1, clear token
    S->>B: 200 "Email verified"

    Note over B,E: Login
    B->>S: POST /api/auth/login {email, password}
    S->>DB: Find user by email
    S->>S: bcrypt.compare(password, hash)
    Note over S: Generic "Invalid email or password" on any failure
    S->>S: Create session
    S->>B: Set httpOnly cookie, return user object
```

## Security Properties

| Property | Implementation |
|----------|---------------|
| No client-side tokens | OAuth code exchange is entirely server-side |
| Generic error messages | Login failures don't reveal if email exists |
| Email verification required | Unverified accounts cannot log in |
| Password reset | Token-based, 1-hour expiry, single-use |
| Session cookie | httpOnly, secure (prod), sameSite=lax, 30-day maxAge |
