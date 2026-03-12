# TrailLog — Email/Password Authentication Regression Test

Manual test for the email/password signup, verification, and login flow.

**Prerequisites:** App running at https://traillog.gracezero.ai. You need access to a real email inbox to receive the verification email.

**Test account:** Use any email you can check (e.g., a secondary Gmail).

---

## SECTION 1: Signup Form Validation

**Step 1.1** — Navigate to https://traillog.gracezero.ai. Verify the login page shows:
- "Sign in with Google" button
- Email input, Password input, "Sign In" button
- "Create an account" link

**Step 1.2** — Click **"Create an account"**. Verify the signup form shows:
- First Name, Last Name, Email, Password, Confirm Password inputs
- "Create Account" button
- "Already have an account? Sign in" link

**Step 1.3** — Click **"Create Account"** with all fields empty. Verify validation errors appear for required fields.

**Step 1.4** — Fill in:
- First Name: `Test`
- Last Name: `User`
- Email: `your-test-email@example.com`
- Password: `short` (less than 8 chars)
- Confirm Password: `short`

Click **"Create Account"**. Verify error: password must be at least 8 characters.

**Step 1.5** — Change passwords:
- Password: `TestPass123`
- Confirm Password: `TestPass456` (mismatch)

Click **"Create Account"**. Verify error: passwords do not match.

---

## SECTION 2: Successful Signup

**Step 2.1** — Fill in:
- First Name: `Test`
- Last Name: `User`
- Email: `your-real-email@example.com` (use a real one you can check)
- Password: `TestPass123`
- Confirm Password: `TestPass123`

Click **"Create Account"**. Verify:
- Success message about verification email sent
- You're redirected to the login page or shown a "check your email" message

---

## SECTION 3: Email Verification

**Step 3.1** — Check your email inbox. Verify you received an email from TrailLog (billm9000@gmail.com) with:
- Subject containing "verify" or "welcome"
- A verification link

**Step 3.2** — Try logging in with `your-real-email@example.com` / `TestPass123` BEFORE clicking the verification link. Verify: error message saying email is not verified.

**Step 3.3** — Click the verification link in the email. Verify:
- Success message: "Email verified" or similar
- You can now proceed to login

---

## SECTION 4: Email/Password Login

**Step 4.1** — Navigate to https://traillog.gracezero.ai. Enter:
- Email: `your-real-email@example.com`
- Password: `WrongPassword99`

Click **"Sign In"**. Verify: error message (invalid credentials).

**Step 4.2** — Enter correct credentials:
- Email: `your-real-email@example.com`
- Password: `TestPass123`

Click **"Sign In"**. Verify:
- Login succeeds
- ProfileSetup page appears (first login for this user)
- Name shows "Test User"

**Step 4.3** — Select **"Adult"** and click **"Continue"**. Verify Lobby loads.

---

## SECTION 5: Login Persistence & Session

**Step 5.1** — From the Lobby, click **"Sign Out"**. Verify login page appears.

**Step 5.2** — Log back in with email/password. Verify:
- NOT taken to ProfileSetup again
- Lobby loads directly

---

## SECTION 6: Rate Limiting

**Step 6.1** — Sign out. Rapidly attempt login with wrong password **20+ times** within 15 minutes. Verify:
- After ~20 attempts, you get a rate limit error (429 or similar)
- The `authLimiter` (20 req/15min) kicks in

---

## SECTION 7: Cross-Auth Check

**Step 7.1** — While logged in as the email/password user, verify:
- `/api/auth/me` returns the correct user with `is_global_admin: false`
- The user can create a troop, join the Lobby, etc. (same permissions as OAuth users)

**Step 7.2** — Sign out. Sign in via **Google OAuth** as `billmccoy48@gmail.com`. Verify: Google login still works independently (the email auth didn't break OAuth).

---

## Results

| Section | Description | Result | Issues |
|---------|-------------|--------|--------|
| 1 | Signup Validation | | |
| 2 | Successful Signup | | |
| 3 | Email Verification | | |
| 4 | Email/Password Login | | |
| 5 | Login Persistence | | |
| 6 | Rate Limiting | | |
| 7 | Cross-Auth Check | | |
