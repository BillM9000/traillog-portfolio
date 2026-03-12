import nodemailer from "nodemailer";

// HTML-escape user-controlled values to prevent XSS in email templates
function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

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
    ? `<p><strong>Parent/Guardian email:</strong> ${esc(parentEmail)}</p>`
    : "";

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `${requesterName} wants to join ${troopName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">${esc(requesterName)} (${esc(requesterType) || "unknown"}) wants to join ${esc(troopName)}</h2>
        ${scoutLine}
        <p>Log in to approve or deny this request:</p>
        <p><a href="${process.env.APP_URL || "https://traillog.gracezero.ai"}" style="color:#4a7a55;font-weight:bold">Open TrailLog</a></p>
      </div>
    `,
  });
}

export async function sendParentNotificationEmail(parentEmail, scoutName, troopName) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Parent notification for ${parentEmail} (no SMTP configured)`);

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: parentEmail,
    subject: `${scoutName} has requested to join ${troopName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">Your scout requested to join a troop</h2>
        <p><strong>${esc(scoutName)}</strong> has requested to join <strong>${esc(troopName)}</strong> on TrailLog, a Scouting America high adventure preparation platform.</p>
        <p>A troop leader will review and approve the request. You listed as the parent/guardian contact for this scout.</p>
        <p>You can view the platform here:</p>
        <p><a href="${process.env.APP_URL || "https://traillog.gracezero.ai"}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Open TrailLog</a></p>
        <p style="color:#888;font-size:13px">If you were not expecting this, please contact your troop leader.</p>
      </div>
    `,
  });
}

export async function sendInvitationEmail(toEmail, inviterName, troopName, adventureName, inviteUrl) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Invitation to ${toEmail} (no SMTP configured)`);

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `You're invited to join ${adventureName || troopName} on TrailLog!`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">You're invited! 🏔️</h2>
        <p><strong>${esc(inviterName)}</strong> has invited you to join <strong>${esc(adventureName || troopName)}</strong> on TrailLog — a platform to help your crew prepare for high adventure.</p>
        <p>Click below to accept the invitation and join the crew:</p>
        <p><a href="${esc(inviteUrl)}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Accept Invitation</a></p>
        <p style="color:#888;font-size:13px">You can sign in with Google or create an account with your email. If you weren't expecting this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendMemberApprovedEmail(toEmail, memberName, troopName) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Approval for ${toEmail} (no SMTP configured)`);

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Welcome to ${troopName}!`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">You're in! 🎉</h2>
        <p>Hey <strong>${esc(memberName)}</strong>, your request to join <strong>${esc(troopName)}</strong> has been approved!</p>
        <p>Log in to start coordinating with your crew:</p>
        <p><a href="${process.env.APP_URL || "https://traillog.gracezero.ai"}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Open TrailLog</a></p>
      </div>
    `,
  });
}

export async function sendMemberDeniedEmail(toEmail, memberName, troopName) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Denial for ${toEmail} (no SMTP configured)`);

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Update on your ${troopName} request`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">Request update</h2>
        <p>Hey <strong>${esc(memberName)}</strong>, your request to join <strong>${esc(troopName)}</strong> was not approved at this time.</p>
        <p>If you think this was a mistake, please contact your troop leader directly.</p>
      </div>
    `,
  });
}

export async function sendDateChangedEmail(toEmail, memberName, adventureName, changes) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Date change for ${toEmail} (no SMTP configured)`);

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Trek dates updated for ${adventureName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">Trek dates updated 📅</h2>
        <p>Hey <strong>${esc(memberName)}</strong>, the trek dates for <strong>${esc(adventureName)}</strong> have been updated.</p>
        <p>${changes}</p>
        <p>Check the latest details:</p>
        <p><a href="${process.env.APP_URL || "https://traillog.gracezero.ai"}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Open TrailLog</a></p>
      </div>
    `,
  });
}

export async function sendItineraryChangedEmail(toEmail, memberName, adventureName, oldItineraryName, newItineraryName) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Itinerary change for ${toEmail} (no SMTP configured)`);

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Itinerary updated for ${adventureName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">Itinerary changed 🗺️</h2>
        <p>Hey <strong>${esc(memberName)}</strong>, the itinerary for <strong>${esc(adventureName)}</strong> has been updated.</p>
        <p><strong>Previous:</strong> ${esc(oldItineraryName)}<br><strong>New:</strong> ${esc(newItineraryName)}</p>
        <p>Please review the updated day-by-day plan:</p>
        <p><a href="${process.env.APP_URL || "https://traillog.gracezero.ai"}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Open TrailLog</a></p>
      </div>
    `,
  });
}

export async function sendTrainingScheduledEmail(toEmail, memberName, adventureName, date, periodLabel, timeLabel, location, notes) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Training scheduled for ${toEmail} (no SMTP configured)`);

  const details = [];
  details.push(`<strong>Date:</strong> ${esc(date)}`);
  details.push(`<strong>Time:</strong> ${esc(periodLabel)}${timeLabel ? ` — ${esc(timeLabel)}` : ""}`);
  if (location) details.push(`<strong>Location:</strong> ${esc(location)}`);
  if (notes) details.push(`<strong>Notes:</strong> ${esc(notes)}`);

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Training scheduled for ${adventureName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">Training Hike Scheduled 🥾</h2>
        <p>Hey <strong>${esc(memberName)}</strong>, a training session has been scheduled for <strong>${esc(adventureName)}</strong>.</p>
        <div style="background:#f5f5f0;padding:12px 16px;border-radius:8px;margin:12px 0">
          ${details.join("<br>")}
        </div>
        <p>Open TrailLog to RSVP:</p>
        <p><a href="${process.env.APP_URL || "https://traillog.gracezero.ai"}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Open TrailLog</a></p>
      </div>
    `,
  });
}

export async function sendBadgeEarnedEmail(toEmail, memberName, badgeName, adventureName) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Badge earned for ${toEmail} (no SMTP configured)`);

  const badges = {
    gear_ready: { icon: "🎒", title: "Gear Ready" },
    trail_medic: { icon: "🏥", title: "Trail Medic" },
    admin_pro: { icon: "📋", title: "Admin Pro" },
    training_complete: { icon: "🥾", title: "Training Complete" },
    fully_prepared: { icon: "⭐", title: "Fully Prepared" },
  };
  const badge = badges[badgeName] || { icon: "🏆", title: badgeName };

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `${badge.icon} You earned the ${badge.title} badge!`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;text-align:center">
        <div style="font-size:48px;margin:20px 0">${badge.icon}</div>
        <h2 style="color:#2d3830">${badge.title}!</h2>
        <p>Way to go, <strong>${esc(memberName)}</strong>! You've earned the <strong>${esc(badge.title)}</strong> badge for <strong>${esc(adventureName)}</strong>.</p>
        <p style="color:#4a7a55;font-weight:bold;font-size:14px">"A Scout is Prepared"</p>
        <p><a href="${process.env.APP_URL || "https://traillog.gracezero.ai"}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">View Your Badges</a></p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(toEmail, token) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Password reset for ${toEmail} (no SMTP configured)`);

  const url = `${process.env.APP_URL || "https://traillog.gracezero.ai"}/?reset=${token}`;
  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Reset your password — TrailLog",
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">Reset your password</h2>
        <p>We received a request to reset your TrailLog password. Click below to choose a new password:</p>
        <p><a href="${url}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Reset Password</a></p>
        <p style="color:#888;font-size:13px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendLinkRequestEmail(adminEmail, adminName, adultName, scoutName, adventureName) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Link request: ${adultName} → ${scoutName} (no SMTP configured)`);

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `Link request: ${adultName} wants to link to ${scoutName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">Parent-Scout Link Request</h2>
        <p><strong>${esc(adultName)}</strong> is requesting to be linked to <strong>${esc(scoutName)}</strong> in <strong>${esc(adventureName)}</strong>.</p>
        <p>Log in to the Admin Panel to approve or deny this request.</p>
        <p><a href="${process.env.APP_URL || "https://traillog.gracezero.ai"}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Open TrailLog</a></p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(toEmail, token) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Verification for ${toEmail} (no SMTP configured)`);

  const url = `${process.env.APP_URL || "https://traillog.gracezero.ai"}/api/auth/verify/${token}`;
  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Verify your email — TrailLog",
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
