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

export async function sendJoinRequestEmail(adminEmail, adminName, requesterName, requesterType, troopName, parentEmail, { participation, adventureNames, approveUrl } = {}) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Join request: ${requesterName} → ${troopName} (no SMTP configured)`);

  const scoutLine = requesterType === "scout" && parentEmail
    ? `<p><strong>Parent/Guardian email:</strong> ${esc(parentEmail)}</p>`
    : "";

  const participationLabel = participation === "support" ? "Support crew (helping from home)" : "Trekker (going on the adventure)";
  const participationLine = `<p><strong>Role:</strong> ${esc(participationLabel)}</p>`;

  const adventureLine = Array.isArray(adventureNames) && adventureNames.length > 0
    ? `<p><strong>Requested adventure${adventureNames.length > 1 ? "s" : ""}:</strong> ${adventureNames.map(n => esc(n)).join(", ")}</p>`
    : "";

  const approveBlock = approveUrl
    ? `<p style="margin:16px 0"><a href="${approveUrl}" style="display:inline-block;background:#5B7A3A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">Review &amp; Approve</a></p>`
    : `<p><a href="${process.env.APP_URL || "https://traillog.gracezero.ai"}" style="color:#4a7a55;font-weight:bold">Open TrailLog</a></p>`;

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `${requesterName} wants to join ${troopName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">${esc(requesterName)} (${esc(requesterType) || "unknown"}) wants to join ${esc(troopName)}</h2>
        <div style="background:#f5f5f0;padding:12px 16px;border-radius:8px;margin:12px 0">
          ${participationLine}
          ${adventureLine}
          ${scoutLine}
        </div>
        ${approveBlock}
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
        <p><strong>${esc(scoutName)}</strong> has requested to join <strong>${esc(troopName)}</strong> on TrailLog, a high adventure preparation platform.</p>
        <p>A troop leader will review and approve the request. You are listed as the parent/guardian contact for this scout.</p>
        <p>We recommend creating your own TrailLog account so you can stay informed on your scout's progress, view gear lists, training schedules, and more.</p>
        <p><a href="${process.env.APP_URL || "https://traillog.gracezero.ai"}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Sign Up on TrailLog</a></p>
        <p style="color:#888;font-size:13px">If you were not expecting this, please contact your troop leader.</p>
      </div>
    `,
  });
}

// Build deep link URL that navigates directly into an adventure + tab
function deepLink(troopId, adventureId, tab) {
  const base = process.env.APP_URL || "https://traillog.gracezero.ai";
  const params = [];
  if (troopId) params.push(`troop=${troopId}`);
  if (adventureId) params.push(`adventure=${adventureId}`);
  if (tab) params.push(`tab=${tab}`);
  return params.length ? `${base}/?${params.join("&")}` : base;
}

const ADVENTURE_TYPE_NAMES = {
  philmont: "Philmont Scout Ranch",
  northern_tier: "Northern Tier",
  sea_base: "Florida Sea Base",
  summit: "Summit Bechtel Reserve",
};

export async function sendInvitationEmail(toEmail, inviterName, troopName, adventureName, inviteUrl, { council, location, adventureType, departDate, returnDate } = {}) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Invitation to ${toEmail} (no SMTP configured)`);

  const detailRows = [];
  if (troopName) detailRows.push(`<strong>Troop:</strong> ${esc(troopName)}`);
  if (council) detailRows.push(`<strong>Council:</strong> ${esc(council)}`);
  if (adventureName) detailRows.push(`<strong>Crew:</strong> ${esc(adventureName)}`);
  if (adventureType) detailRows.push(`<strong>Adventure Base:</strong> ${esc(ADVENTURE_TYPE_NAMES[adventureType] || adventureType)}`);
  if (departDate) {
    const fmt = d => { try { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return d; } };
    detailRows.push(`<strong>Dates:</strong> ${fmt(departDate)}${returnDate ? ` – ${fmt(returnDate)}` : ""}`);
  }

  const detailsHtml = detailRows.length > 0
    ? `<table style="margin:12px 0;border-collapse:collapse">${detailRows.map(r => `<tr><td style="padding:3px 0;font-size:14px;color:#2d3830">${r}</td></tr>`).join("")}</table>`
    : "";

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `You're invited to join ${troopName} on TrailLog!`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">You're invited! 🏔️</h2>
        <p><strong>${esc(inviterName)}</strong> has invited you to join <strong>${esc(troopName)}</strong> on TrailLog — a platform to help your crew prepare for high adventure.</p>
        ${detailsHtml}
        <p>Click below to accept the invitation and join the crew:</p>
        <p><a href="${esc(inviteUrl)}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Accept Invitation</a></p>
        <p style="color:#888;font-size:13px">You can sign in with Google or create an account with your email. If you weren't expecting this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendMemberApprovedEmail(toEmail, memberName, troopName, { council, adventureName, adventureType, departDate, returnDate, troopId, adventureId } = {}) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Approval for ${toEmail} (no SMTP configured)`);

  const detailRows = [];
  if (troopName) detailRows.push(`<strong>Troop:</strong> ${esc(troopName)}`);
  if (council) detailRows.push(`<strong>Council:</strong> ${esc(council)}`);
  if (adventureName) detailRows.push(`<strong>Crew:</strong> ${esc(adventureName)}`);
  if (adventureType) detailRows.push(`<strong>Adventure Base:</strong> ${esc(ADVENTURE_TYPE_NAMES[adventureType] || adventureType)}`);
  if (departDate) {
    const fmt = d => { try { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return d; } };
    detailRows.push(`<strong>Dates:</strong> ${fmt(departDate)}${returnDate ? ` – ${fmt(returnDate)}` : ""}`);
  }
  const detailsHtml = detailRows.length > 0
    ? `<table style="margin:12px 0;border-collapse:collapse">${detailRows.map(r => `<tr><td style="padding:3px 0;font-size:14px;color:#2d3830">${r}</td></tr>`).join("")}</table>`
    : "";

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Welcome to ${troopName}!`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">You're in! 🎉</h2>
        <p>Hey <strong>${esc(memberName)}</strong>, your request to join <strong>${esc(troopName)}</strong> has been approved!</p>
        ${detailsHtml}
        <p>Log in to start coordinating with your crew:</p>
        <p><a href="${deepLink(troopId, adventureId)}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Open TrailLog</a></p>
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

export async function sendDateChangedEmail(toEmail, memberName, adventureName, changes, { troopName, troopId, adventureId } = {}) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Date change for ${toEmail} (no SMTP configured)`);

  const troopLine = troopName ? `<p style="color:#666;font-size:13px">${esc(troopName)}</p>` : "";

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Trek dates updated for ${adventureName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">Trek dates updated 📅</h2>
        <p>Hey <strong>${esc(memberName)}</strong>, the trek dates for <strong>${esc(adventureName)}</strong> have been updated.</p>
        ${troopLine}
        <div style="background:#f5f5f0;padding:12px 16px;border-radius:8px;margin:12px 0">${changes}</div>
        <p>Check the latest details:</p>
        <p><a href="${deepLink(troopId, adventureId, "calendar")}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">View Dates</a></p>
      </div>
    `,
  });
}

export async function sendItineraryChangedEmail(toEmail, memberName, adventureName, oldItineraryName, newItineraryName, { troopName, troopId, adventureId } = {}) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Itinerary change for ${toEmail} (no SMTP configured)`);

  const troopLine = troopName ? `<p style="color:#666;font-size:13px">${esc(troopName)}</p>` : "";

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Itinerary updated for ${adventureName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">Itinerary changed 🗺️</h2>
        <p>Hey <strong>${esc(memberName)}</strong>, the itinerary for <strong>${esc(adventureName)}</strong> has been updated.</p>
        ${troopLine}
        <div style="background:#f5f5f0;padding:12px 16px;border-radius:8px;margin:12px 0">
          <strong>Previous:</strong> ${esc(oldItineraryName)}<br><strong>New:</strong> ${esc(newItineraryName)}
        </div>
        <p>Please review the updated day-by-day plan and check your gear list — items may have changed.</p>
        <p><a href="${deepLink(troopId, adventureId, "itinerary")}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">View Itinerary</a></p>
      </div>
    `,
  });
}

export async function sendTrainingScheduledEmail(toEmail, memberName, adventureName, date, periodLabel, timeLabel, location, notes, { troopName, troopId, adventureId } = {}) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Training scheduled for ${toEmail} (no SMTP configured)`);

  const fmt = d => { try { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); } catch { return d; } };
  const details = [];
  details.push(`<strong>Date:</strong> ${esc(fmt(date))}`);
  details.push(`<strong>Time:</strong> ${esc(periodLabel)}${timeLabel ? ` — ${esc(timeLabel)}` : ""}`);
  if (location) details.push(`<strong>Location:</strong> ${esc(location)}`);
  if (notes) details.push(`<strong>Notes:</strong> ${esc(notes)}`);

  const troopLine = troopName ? `<p style="color:#666;font-size:13px">${esc(troopName)}</p>` : "";

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Training session scheduled for ${adventureName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">Training Session Scheduled 🥾</h2>
        <p>Hey <strong>${esc(memberName)}</strong>, a training session has been scheduled for <strong>${esc(adventureName)}</strong>.</p>
        ${troopLine}
        <div style="background:#f5f5f0;padding:12px 16px;border-radius:8px;margin:12px 0">
          ${details.join("<br>")}
        </div>
        <p>Open TrailLog to RSVP:</p>
        <p><a href="${deepLink(troopId, adventureId, "results")}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">RSVP Now</a></p>
      </div>
    `,
  });
}

export async function sendBadgeEarnedEmail(toEmail, memberName, badgeName, adventureName, { troopName, troopId, adventureId } = {}) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Badge earned for ${toEmail} (no SMTP configured)`);

  const badges = {
    gear_ready: { icon: "🎒", title: "Gear Ready" },
    trail_medic: { icon: "🏥", title: "Trail Medic" },
    admin_pro: { icon: "📋", title: "Admin Pro" },
    training_complete: { icon: "🥾", title: "Training Complete" },
    ai_ready: { icon: "🤖", title: "AI Ready" },
    ai_gear: { icon: "🛍️", title: "AI Gear Scout" },
    fully_prepared: { icon: "⭐", title: "Fully Prepared" },
  };
  const badge = badges[badgeName] || { icon: "🏆", title: badgeName };

  // Badge-specific messaging so each email explains WHY they earned it
  const badgeMessages = {
    ai_ready: {
      headline: "Your AI Training Plan is Ready!",
      body: `Great job completing your self-assessment, <strong>${esc(memberName)}</strong>! Our AI analyzed your experience, fitness, and gear to build a personalized training plan just for you. You're on your way to being fully prepared for <strong>${esc(adventureName)}</strong> — keep checking back as your plan updates with your progress!<br><br><em style="font-size:11px;color:#999">This plan is for general guidance only and is not medical or professional fitness advice. Consult your physician before starting any new exercise program, especially when training for altitude.</em>`,
      cta: "View Your Training Plan",
      tab: "readiness",
    },
    ai_gear: {
      headline: "Smart Shopper!",
      body: `Nice work, <strong>${esc(memberName)}</strong>! You used our AI to get personalized gear recommendations for <strong>${esc(adventureName)}</strong>. Our AI analyzes thousands of reviews and Philmont trekker feedback to find the best gear for your adventure. Keep exploring recommendations to build the perfect pack!`,
      cta: "Browse Your Gear",
      tab: "gear",
    },
    gear_ready: {
      headline: "Gear Check Complete!",
      body: `Way to go, <strong>${esc(memberName)}</strong>! All your gear is packed and ready for <strong>${esc(adventureName)}</strong>. One less thing to worry about on the trail!`,
    },
    training_complete: {
      headline: "Training Complete!",
      body: `Awesome work, <strong>${esc(memberName)}</strong>! You've completed all your training skills for <strong>${esc(adventureName)}</strong>. Your crew can count on you out there.`,
    },
    fully_prepared: {
      headline: "You're Summit Ready! ⭐",
      body: `Incredible, <strong>${esc(memberName)}</strong>! You've completed every category for <strong>${esc(adventureName)}</strong> — gear, medical, training, and more. You are fully prepared for the adventure of a lifetime!`,
    },
  };

  const msg = badgeMessages[badgeName] || {
    headline: `${badge.title}!`,
    body: `Way to go, <strong>${esc(memberName)}</strong>! You've earned the <strong>${esc(badge.title)}</strong> badge for <strong>${esc(adventureName)}</strong>.`,
  };

  const troopLine = troopName ? `<p style="color:#666;font-size:13px">${esc(troopName)}</p>` : "";
  const ctaText = msg.cta || "View Your Badges";
  const ctaTab = msg.tab || "reports";

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `${badge.icon} You earned the ${badge.title} badge!`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;text-align:center">
        <div style="font-size:48px;margin:20px 0">${badge.icon}</div>
        <h2 style="color:#2d3830">${msg.headline}</h2>
        <p style="line-height:1.6">${msg.body}</p>
        ${troopLine}
        <p style="color:#4a7a55;font-weight:bold;font-size:14px">"A Scout is Prepared"</p>
        <p><a href="${deepLink(troopId, adventureId, ctaTab)}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">${ctaText}</a></p>
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

export async function sendTrainingReminderEmail(toEmail, memberName, adventureName, date, timeLabel, location, notes, { troopName, troopId, adventureId } = {}) {
  const t = getTransporter();
  if (!t) return console.log(`[email skip] Training reminder for ${toEmail} (no SMTP configured)`);

  const fmt = d => { try { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); } catch { return d; } };
  const details = [];
  details.push(`<strong>Date:</strong> ${esc(fmt(date))}`);
  if (timeLabel) details.push(`<strong>Time:</strong> ${esc(timeLabel)}`);
  if (location) details.push(`<strong>Location:</strong> ${esc(location)}`);
  if (notes) details.push(`<strong>Notes:</strong> ${esc(notes)}`);

  const troopLine = troopName ? `<p style="color:#666;font-size:13px">${esc(troopName)}</p>` : "";

  await t.sendMail({
    from: `"TrailLog" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Reminder: Training tomorrow for ${adventureName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#2d3830">Training Reminder 🔔</h2>
        <p>Hey <strong>${esc(memberName)}</strong>, you have a training session <strong>tomorrow</strong> for <strong>${esc(adventureName)}</strong>.</p>
        ${troopLine}
        <div style="background:#f5f5f0;padding:12px 16px;border-radius:8px;margin:12px 0">
          ${details.join("<br>")}
        </div>
        <p><a href="${deepLink(troopId, adventureId, "results")}" style="display:inline-block;background:#4a7a55;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Open TrailLog</a></p>
        <p style="color:#888;font-size:12px">You're receiving this because you're a member of this crew on TrailLog.</p>
      </div>
    `,
  });
}
