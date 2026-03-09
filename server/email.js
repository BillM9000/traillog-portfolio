import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("Email not configured (SMTP_USER / SMTP_PASS missing). Notifications disabled.");
    return null;
  }
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export async function sendJoinRequestEmail(adminEmail, adminName, requesterName, requesterType, troopName, parentEmail) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Join request: ${requesterName} → ${troopName} (no SMTP configured)`);

  const scoutLine = requesterType === "scout" && parentEmail
    ? `<p><strong>Parent/Guardian email:</strong> ${parentEmail}</p>`
    : "";

  await t.sendMail({
    from: `"TrekSync" <${process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `${requesterName} wants to join ${troopName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">${requesterName} (${requesterType || "unknown"}) wants to join ${troopName}</h2>
        ${scoutLine}
        <p>Log in to approve or deny this request:</p>
        <p><a href="${process.env.APP_URL || "https://treksync.gracezero.ai"}" style="color:#4a7a55;font-weight:bold">Open TrekSync</a></p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(toEmail, token) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Verification for ${toEmail} (no SMTP configured)`);

  const url = `${process.env.APP_URL || "https://treksync.gracezero.ai"}/api/auth/verify/${token}`;
  await t.sendMail({
    from: `"TrekSync" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Verify your email — TrekSync",
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">Verify your email</h2>
        <p>Click below to verify your email address and activate your account:</p>
        <p><a href="${url}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Verify Email</a></p>
        <p style="color:#888;font-size:13px">If you didn't create this account, you can ignore this email.</p>
      </div>
    `,
  });
}
