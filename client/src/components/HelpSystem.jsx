import { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { fontBody, fontDisplay } from "../utils/theme";
import {
  HelpCircle, X, Compass, Calendar, ClipboardCheck, Map, Backpack,
  FileText, User, Users, Award, UserCog, Settings, Wrench, Shield, Server,
  Layers, ChevronRight, BookOpen
} from "lucide-react";

const SECTIONS = [
  // ── Everyone ──
  {
    id: "getting-started", title: "Getting Started", cat: "everyone", Icon: Compass,
    items: [
      { h: "Creating an Account", t: "Sign up with your email or Google account. You'll choose a password (minimum 8 characters) and verify your email address. Google sign-in skips email verification." },
      { h: "Profile Setup", t: "After your first login you'll confirm your age range (13+ or 18+) and accept the Terms of Service. Your age range determines your role options — scouts are under 18, adults are 18+. This is set once and cannot be changed." },
      { h: "What's Next?", t: "Once your profile is set up, you'll land on the Home Dashboard. From there you can create a troop, join an existing one, or browse public troops. Adults can create troops; scouts need a leader to create one first." },
    ]
  },
  {
    id: "training-calendar", title: "Training Calendar", cat: "everyone", Icon: Calendar,
    items: [
      { h: "Marking Your Availability", t: "Tap any date on the calendar to cycle through: All Day → Morning → Afternoon → Off. The calendar shows your personal availability for crew training hikes." },
      { h: "AM / PM / All Day", t: "Each date can be set to morning only (top half filled), afternoon only (bottom half filled), or all day (fully filled). This helps the crew find overlapping windows." },
      { h: "Bulk Select", t: "Use the \"Select Weekends\" or \"Select All\" buttons to quickly mark multiple dates. Bulk actions set dates to All Day by default — you can tap individual dates to adjust." },
      { h: "Clearing Dates", t: "Tap a date that's already set to cycle it back to Off. Use \"Clear All\" to remove all your dates at once." },
    ]
  },
  {
    id: "training-calendar", title: "Training Calendar", cat: "everyone", Icon: Calendar,
    items: [
      { h: "Marking Availability", t: "Tap dates on the calendar to mark when you're available to train. Green = available. The group heat map shows overlap so your troop leader can find the best dates." },
      { h: "Group Heat Map", t: "Switch to Group view to see a heat map of everyone's availability. Darker green = more members available. Tap a date to see exactly who's free." },
      { h: "Training Events", t: "Your troop admin can propose and schedule training events based on availability overlap. You'll get an email when events are confirmed and can RSVP or self-report attendance." },
    ]
  },
  {
    id: "readiness", title: "Readiness Checklist", cat: "everyone", Icon: ClipboardCheck,
    items: [
      { h: "Skill Categories", t: "Readiness tracks four categories: Training (hikes, fitness), Medical (physical, medications, allergies), Admin (permits, travel), and general preparation items. Each category contributes equally to your overall readiness percentage." },
      { h: "Checking Off Items", t: "Tap any skill item to mark it complete. Your personal readiness percentage updates in real time. Items are specific to your adventure type (Philmont has 18 default skills)." },
      { h: "Crew Readiness", t: "The crew readiness percentage in the header is the average of all trekking members' individual readiness. It only counts categories that have items defined — empty categories don't drag the score down." },
    ]
  },
  {
    id: "itinerary", title: "Itinerary", cat: "everyone", Icon: Map,
    items: [
      { h: "Day-by-Day View", t: "Your itinerary shows each day of the trek with camp names, mileage, elevation, and activities. Philmont itineraries are selected by your troop admin from 48 official routes." },
      { h: "Filter Tags", t: "Use the filter tags at the top to highlight specific day types — hiking days, layover days, or days with specific activities." },
      { h: "Print Cheat Sheet", t: "The Print button generates a clean, printable one-page summary of your entire itinerary — great for carrying on the trail." },
    ]
  },
  {
    id: "gear", title: "Gear List", cat: "everyone", Icon: Backpack,
    items: [
      { h: "Three Statuses", t: "Each gear item has three states: Need (not acquired yet), Own (you have it), and Packed (in your pack and ready). Tap the status icon to cycle through them." },
      { h: "Sharing Types", t: "Gear is categorized by who carries it: Personal (your own gear, counts toward pack weight), Crew (shared items like stoves and water filters), Buddy (split with a tent partner), and Provided (Philmont supplies on-site like bear bags and fuel)." },
      { h: "Pack Weight", t: "The pack weight widget shows your estimated carry weight: personal packed items + food (1.75 lbs/day × trek days) + water (6.6 lbs for 3L). Only personal items marked as \"Packed\" count toward your weight." },
      { h: "Filters", t: "Filter your gear list by status (Need/Own/Packed) or sharing type to focus on what still needs attention." },
    ]
  },
  {
    id: "reports", title: "Reports", cat: "everyone", Icon: FileText,
    items: [
      { h: "Available Reports", t: "The Reports tab shows reports based on your role. Everyone can access: My Gear Checklist (print), My Still Need List (CSV + print), and Itinerary Cheat Sheet (print)." },
      { h: "Admin Reports", t: "Troop admins also get: Crew Roster (CSV + print), Gear Readiness Matrix (CSV), Pack Weight Summary (CSV), Training RSVP Summary (CSV), and Crew Readiness Overview (print)." },
      { h: "Export Formats", t: "CSV exports open in Excel or Google Sheets. Print reports open a clean, formatted page optimized for printing. Look for the download and printer icons on each report card." },
    ]
  },
  {
    id: "profile", title: "Your Profile", cat: "everyone", Icon: User,
    items: [
      { h: "Viewing Your Profile", t: "Click your avatar in the header and select \"Profile\" to see your full profile page. It shows your account details, auth method (Google or Email), role, age range, and troop memberships." },
      { h: "Changing Your Name", t: "Your display name can be edited from the profile page. This is the name other crew members see." },
      { h: "Changing Your Password", t: "Email users can change their password from the profile page. You'll need your current password and a new one (minimum 8 characters). Google-only users don't have a password to change." },
      { h: "Troop Memberships", t: "Your profile lists all troops you belong to. You can enter any troop directly, or leave a troop (unless you're the sole admin)." },
    ]
  },
  {
    id: "troop-basics", title: "Troop Basics", cat: "everyone", Icon: Users,
    items: [
      { h: "Creating a Troop", t: "Adults can create a troop from the Home Dashboard. It's a 2-step process: first enter your troop name, council, and location, then set up your first adventure (crew name, dates, itinerary). You can create up to 2 troops." },
      { h: "Joining a Troop", t: "Browse public troops on the Home Dashboard and request to join. The troop admin will approve or deny your request. You'll get an email either way." },
      { h: "Invitations", t: "Troop admins can invite members by email. You'll receive an invitation email with a link to join. If you don't have an account yet, you'll be prompted to create one." },
      { h: "Withdrawing a Request", t: "If you've requested to join a troop and change your mind, you can withdraw your pending request from the Home Dashboard before it's approved." },
    ]
  },
  {
    id: "trail-guide", title: "Trail Guide & Badges", cat: "everyone", Icon: Award,
    items: [
      { h: "Journey Waypoints", t: "Your crew's progress is shown as a trail journey: Trailhead (0%), Base Camp (25%), Timber Ridge (50%), Eagle Point (75%), and Summit (100%). The progress ring in the header shows where your crew stands." },
      { h: "Trail Badges", t: "Earn badges as you prepare: Gear Ready (all personal gear packed), Trail Medic (medical items complete), Admin Pro (admin tasks done), Training Complete (all training checked off), and Fully Prepared (100% readiness across the board)." },
      { h: "How Readiness is Calculated", t: "Crew readiness is the average of all trekking members' individual readiness. Each member's readiness averages their progress across active categories (training, gear, medical, admin). Only categories with defined items count." },
    ]
  },

  // ── Troop Admin ──
  {
    id: "member-mgmt", title: "Member Management", cat: "admin", Icon: UserCog,
    items: [
      { h: "Approving & Denying Requests", t: "When someone requests to join your troop, you'll see a pending request in the Admin Panel and on the Home Dashboard. Approve to add them to the adventure, or deny to reject. Both send email notifications." },
      { h: "Removing Members", t: "Remove a member from the Admin Panel's member list or the crew bar. Both require a confirmation dialog — removal deletes their gear selections, calendar dates, and readiness data for that adventure." },
      { h: "Manual Members", t: "Add scouts or adults who don't have accounts yet as \"manual members.\" They appear in the crew list and reports but can't log in. When they create an account later, an admin can link them." },
      { h: "Scout Linking", t: "Adults can be linked to scouts they're responsible for (parent/guardian). This shows the relationship in the crew bar and helps admins understand family connections." },
      { h: "Role Changes", t: "Promote a member to Troop Admin to share management duties, or demote them back to Member. You can also toggle a member between Adult and Scout, or between Trekking and Support participation." },
    ]
  },
  {
    id: "adventure-setup", title: "Adventure Setup", cat: "admin", Icon: Map,
    items: [
      { h: "Creating an Adventure", t: "Each troop can have one or more adventures. Set the crew name (up to 30 characters), select the adventure type (Philmont Scout Ranch), and choose departure, arrival, return, and home dates." },
      { h: "Selecting an Itinerary", t: "Philmont adventures use official itinerary routes (48 available). The itinerary determines your day-by-day trek plan, camps, mileage, and activities. Choose carefully — changing it later notifies all members." },
      { h: "Changing the Itinerary", t: "If you need to change the itinerary after setup, the app shows a confirmation dialog warning that all members will be notified by email. Gear lists may also change based on the new route." },
      { h: "Date Validation", t: "Dates follow a cascade: changing the departure date clears arrival/return/home if they become invalid. Each date has minimum/maximum constraints enforced on both client and server." },
    ]
  },
  {
    id: "training-events", title: "Training Events", cat: "admin", Icon: Calendar,
    items: [
      { h: "Scheduling Training", t: "Propose or schedule training events from the Training tab. Pick a date from the best overlap chips, set the time, location, and optional notes. Proposed events can be confirmed later." },
      { h: "Email Notifications", t: "When you schedule a training event, every member (including you) gets an email with the date, time, location, and any notes. This helps ensure no one misses the announcement." },
      { h: "RSVP Tracking", t: "Members RSVP as \"Going\" or \"Can't Make It.\" You can see the headcount, who's going, who can't, and who hasn't responded yet — all in real time on the event card." },
      { h: "Deleting Events", t: "Remove a training event by clicking the trash icon on the event card. This is immediate (no email sent) — consider notifying your crew through other channels if plans change." },
    ]
  },
  {
    id: "troop-settings", title: "Troop Settings", cat: "admin", Icon: Settings,
    items: [
      { h: "Troop Information", t: "Edit your troop name, council (required), and location (city, state) from the Admin Panel's Troop Settings tab. The council helps members find your troop when browsing." },
      { h: "Visibility", t: "Toggle your troop between Public and Private. Public troops appear in the \"Browse Troops\" section on the Home Dashboard for anyone to request to join. Private troops require an invitation." },
      { h: "Troop Logo", t: "Upload a custom logo (PNG, JPG, or WebP, max 500KB) from Troop Settings. It appears on troop cards, the header, and member views. If no logo is set, a colored circle with the troop's first letter is shown." },
    ]
  },
  {
    id: "gear-admin", title: "Gear Administration", cat: "admin", Icon: Wrench,
    items: [
      { h: "Gear Overrides", t: "Override any global gear catalog item for your troop — change the name, category, weight, or sharing type. Overrides only affect your troop's gear list." },
      { h: "Custom Gear Items", t: "Add troop-specific gear items that aren't in the global catalog. Set the name, category, weight, and sharing type. Custom items appear alongside catalog items in your crew's gear list." },
      { h: "Sharing Types", t: "When adding or editing gear, choose the sharing type: Personal (individual carry, counted in pack weight), Crew (shared group gear), Buddy (split between tent partners), or Provided (supplied at the adventure base)." },
    ]
  },

  // ── System Admin ──
  {
    id: "platform-settings", title: "Platform Settings", cat: "sysadmin", Icon: Settings,
    items: [
      { h: "Maintenance Mode", t: "Toggle maintenance mode to show a \"down for updates\" message to all users. System admins can still access the app normally. Use this during deployments or database maintenance. Set a custom message to explain the downtime." },
      { h: "Registration Toggle", t: "Open or close registration to control new signups. When closed, both email registration and Google OAuth new-user creation are blocked. Existing users can still log in. Useful for soft launches or capacity management." },
      { h: "Announcement Banner", t: "Display a message at the top of every page (including the landing page). Choose a type: Info (blue), Warning (amber), or Success (green). Use for planned maintenance notices, feature announcements, or important updates. Clear the text to remove the banner." },
      { h: "Max Troops Per User", t: "Set the maximum number of troops a user can create (default: 2). System admins are exempt from this limit. Adjust if you need to restrict or expand troop creation." },
    ]
  },
  {
    id: "sys-admin-mgmt", title: "System Administration", cat: "sysadmin", Icon: Shield,
    items: [
      { h: "Multiple System Admins", t: "The platform supports multiple system admins. The ADMIN_EMAIL environment variable seeds the first admin on startup. Additional admins are promoted from the Platform Settings tab." },
      { h: "Promoting Admins", t: "In Platform Settings → System Admins, enter a user's email and click Promote. They must already have an account. Promoted admins immediately gain full platform access including GlobalAdmin, platform settings, and all troop data." },
      { h: "Demoting Admins", t: "Remove admin access by clicking Remove next to an admin's name. You cannot demote yourself, and the system prevents removing the last admin to ensure someone always has platform access." },
      { h: "User Overview", t: "The Troop Overview tab in GlobalAdmin shows all troops, their members, adventures, and current status. Use this to monitor platform activity and troubleshoot user issues." },
    ]
  },
  {
    id: "gear-catalog", title: "Gear Catalog Management", cat: "sysadmin", Icon: Backpack,
    items: [
      { h: "Global Gear Catalog", t: "The gear catalog is the master list of all gear items available across the platform. Currently contains 76 items organized by category. Changes to the catalog affect all troops that haven't overridden specific items." },
      { h: "Managing Items", t: "Add, edit, or remove gear catalog items from GlobalAdmin → Gear Catalog. Each item has a name, category, weight (oz), and sharing type. The catalog is the foundation — troop admins can override or extend it for their crews." },
    ]
  },
  {
    id: "deployment", title: "Deployment & Technical", cat: "sysadmin", Icon: Server,
    items: [
      { h: "Tech Stack", t: "React 18 + Vite (frontend), Express.js (backend), SQLite in WAL mode (database). Docker multi-stage build with Traefik reverse proxy and Let's Encrypt TLS. Hosted on Hostinger VPS." },
      { h: "Docker Commands", t: "Build and deploy: docker compose build --no-cache && docker compose up -d. Reset database: docker compose down -v && docker compose up -d. The app runs on port 3614 in the n8n_default Docker network." },
      { h: "Database Access", t: "Direct DB access on the VPS: docker exec -w /app/server crew614 node -e \"<script>\". The SQLite database is stored at /app/data/crew614.db inside the container, mapped to a persistent Docker volume." },
      { h: "Backups", t: "Automated daily backups run at 3 AM via cron (/opt/crew614/backup.sh). Keeps a rolling 10 backups. Golden backups are stored separately before major schema changes. Always create a golden backup before schema migrations." },
      { h: "Environment Variables", t: "Key env vars: ADMIN_EMAIL (seeds first system admin), SESSION_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SMTP credentials (Gmail app password). All configuration is in .env files — no secrets in code." },
    ]
  },
  {
    id: "architecture", title: "Architecture & Roles", cat: "sysadmin", Icon: Layers,
    items: [
      { h: "Role Hierarchy", t: "Four roles: System Admin (is_admin=1 in users table, full platform access), Troop Admin (troop_members.role=\"admin\", manages one troop), Adult Member (can join troops, manage own data), Scout (under 18, can't create troops, parent email required)." },
      { h: "Authentication", t: "Dual auth: Google OAuth and email/password with bcrypt hashing. Sessions stored in SQLite with express-session. 7-day rolling idle timeout. Cookies: httpOnly, secure (production), sameSite=lax." },
      { h: "API Structure", t: "89 Express routes covering auth, troops, adventures, members, gear, calendar, training, reports, and admin. Rate limiting: 20 auth attempts per 15 min, 100 API calls per minute. All SQL is parameterized." },
      { h: "Schema Version", t: "Current schema: v16. Migrations run automatically on startup. The migration system uses tryAlter() for safe column additions. Schema changes bump the version number and run sequentially." },
      { h: "Security", t: "Helmet.js headers, Content Security Policy, input validation with parseId() and esc(), body-parser 10KB limit, Docker non-root container (appuser uid 1001), SSH key-only auth on VPS." },
    ]
  },
];

export default function HelpSystem({ onClose, user, isAdmin, isGlobalAdmin }) {
  const { theme } = useTheme();
  const [openSection, setOpenSection] = useState(null);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = SECTIONS.filter((s) => {
    if (s.cat === "admin" && !isAdmin && !isGlobalAdmin) return false;
    if (s.cat === "sysadmin" && !isGlobalAdmin) return false;
    if (category === "admin") return s.cat === "admin";
    if (category === "sysadmin") return s.cat === "sysadmin";
    return true;
  });

  const catPill = (key, label) => {
    const active = category === key;
    return (
      <button key={key} onClick={() => setCategory(key)} style={{
        padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: fontBody, cursor: "pointer",
        border: active ? `1.5px solid ${theme.accent}` : `1px solid ${theme.borderLight}`,
        background: active ? theme.pillActiveBg : theme.pillInactiveBg,
        color: active ? theme.pillActiveText : theme.pillInactiveText,
      }}>{label}</button>
    );
  };

  const catBadge = (cat) => {
    if (cat === "everyone") return null;
    const isS = cat === "sysadmin";
    return (
      <span style={{
        fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 4, marginLeft: 6,
        background: isS ? "#b8860b20" : `${theme.accent}20`,
        color: isS ? "#b8860b" : theme.accent,
        fontFamily: fontBody, letterSpacing: 0.5, textTransform: "uppercase",
      }}>{isS ? "Sys Admin" : "Admin"}</span>
    );
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Help Center" style={{
        background: theme.bg, borderRadius: 20, padding: "20px 18px",
        maxWidth: 520, width: "100%", maxHeight: "85vh", overflowY: "auto",
        border: `1px solid ${theme.borderLight}`,
        boxShadow: "0 12px 48px rgba(0,0,0,0.4)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <HelpCircle size={20} style={{ color: theme.accent }} />
            <span style={{ fontSize: 18, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay }}>Help Center</span>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, border: `1px solid ${theme.borderLight}`,
            background: theme.bgAlt, color: theme.textDim, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
          }} aria-label="Close help"><X size={14} /></button>
        </div>

        {/* Category pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {catPill("all", "All Topics")}
          {(isAdmin || isGlobalAdmin) && catPill("admin", "Troop Admin")}
          {isGlobalAdmin && catPill("sysadmin", "System Admin")}
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {filtered.map((s) => {
            const open = openSection === s.id;
            return (
              <div key={s.id} style={{
                background: theme.bgCard, borderRadius: 10,
                border: `1px solid ${open ? theme.accent + "40" : theme.borderLight}`,
                overflow: "hidden",
              }}>
                {/* Section header */}
                <button onClick={() => setOpenSection(open ? null : s.id)}
                  style={{
                    width: "100%", padding: "10px 12px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                    background: "none", border: "none", textAlign: "left",
                  }}
                  role="button" tabIndex={0} aria-expanded={open}
                >
                  <s.Icon size={14} style={{ color: theme.accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: theme.heading, fontFamily: fontBody, flex: 1 }}>
                    {s.title}
                  </span>
                  {catBadge(s.cat)}
                  <ChevronRight size={13} style={{
                    color: theme.textDim, flexShrink: 0,
                    transform: open ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }} />
                </button>

                {/* Section content */}
                {open && (
                  <div style={{ padding: "0 12px 12px 34px" }}>
                    {s.items.map((item, i) => (
                      <div key={i} style={{ marginTop: i === 0 ? 0 : 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: theme.accent, fontFamily: fontBody, marginBottom: 2, letterSpacing: 0.3 }}>
                          {item.h}
                        </div>
                        <div style={{ fontSize: 12, color: theme.textDim, fontFamily: fontBody, lineHeight: 1.5 }}>
                          {item.t}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 14, textAlign: "center", fontSize: 10, color: theme.textDimmest, fontFamily: fontBody }}>
          TrailLog Help • {filtered.length} topic{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
