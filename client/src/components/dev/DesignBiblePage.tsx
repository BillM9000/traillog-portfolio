/**
 * DesignBiblePage — Visual reference for all TrailLog design tokens.
 * Route: /design-bible (dev only, not linked from app nav)
 *
 * Shows every token so you can SEE them before locking Phase 0.
 */

export default function DesignBiblePage() {
  return (
    <div style={{ fontFamily: "'DM Sans', Helvetica, sans-serif", background: "#FDFAF5", color: "#2C2416", minHeight: "100vh", padding: "32px 24px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 48, borderBottom: "2px solid #DDD6C8", paddingBottom: 24 }}>
        <h1 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 48, fontWeight: 900, color: "#3A4D2A", lineHeight: 1.2, margin: 0 }}>
          TrailLog Design Bible
        </h1>
        <p style={{ fontSize: 14, color: "#6B5D4D", marginTop: 8, fontWeight: 500 }}>
          Phase 0 — Visual reference for all design tokens. Lock these before Phase 1.
        </p>
      </div>

      {/* ── 1. Colors ── */}
      <Section title="1. Colors">

        <SubSection title="Semantic Roles">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {SEMANTIC_COLORS.map(c => (
              <ColorSwatch key={c.name} {...c} />
            ))}
          </div>
        </SubSection>

        <SubSection title="Status Colors">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <ColorSwatch name="Success" hex="#5B7A3A" label="On track ≥70%" textColor="#fff" />
            <ColorSwatch name="Warning" hex="#D4A017" label="Needs attention 30-69%" textColor="#2C2416" />
            <ColorSwatch name="Danger" hex="#CC3333" label="Behind/overdue <30%" textColor="#fff" />
            <ColorSwatch name="Neutral" hex="#6B5D4D" label="Informational" textColor="#fff" />
          </div>
        </SubSection>

        <SubSection title="Countdown Pill Phases">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <CountdownPill days={120} />
            <CountdownPill days={75} />
            <CountdownPill days={45} />
            <CountdownPill days={18} />
          </div>
        </SubSection>

        <SubSection title="Primary Ramp (Forest Green)">
          <ColorRamp ramp={PRIMARY_RAMP} />
        </SubSection>

        <SubSection title="Secondary Ramp (Amber)">
          <ColorRamp ramp={AMBER_RAMP} />
        </SubSection>

        <SubSection title="Danger Ramp">
          <ColorRamp ramp={DANGER_RAMP} />
        </SubSection>

        <SubSection title="Success Ramp">
          <ColorRamp ramp={SUCCESS_RAMP} />
        </SubSection>

        <SubSection title="Warning Ramp">
          <ColorRamp ramp={WARNING_RAMP} />
        </SubSection>
      </Section>

      {/* ── 2. Typography ── */}
      <Section title="2. Typography">
        <SubSection title="Font Families">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#F3F0E8", borderRadius: 12, padding: "16px 20px", border: "1px solid #DDD6C8" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B5D4D", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                Display — Source Serif 4
              </div>
              <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 32, fontWeight: 700, color: "#3A4D2A", lineHeight: 1.2 }}>
                Crew 614 — Philmont 2025
              </div>
              <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 18, fontWeight: 400, color: "#2C2416", lineHeight: 1.4, marginTop: 4 }}>
                Headings, crew names, big numbers
              </div>
            </div>
            <div style={{ background: "#F3F0E8", borderRadius: 12, padding: "16px 20px", border: "1px solid #DDD6C8" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B5D4D", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                Body — DM Sans
              </div>
              <div style={{ fontFamily: "'DM Sans', Helvetica, sans-serif", fontSize: 16, fontWeight: 600, color: "#2C2416" }}>
                Labels, descriptions, navigation items
              </div>
              <div style={{ fontFamily: "'DM Sans', Helvetica, sans-serif", fontSize: 13, fontWeight: 400, color: "#6B5D4D", marginTop: 4 }}>
                Regular body text, secondary metadata
              </div>
            </div>
            <div style={{ background: "#F3F0E8", borderRadius: 12, padding: "16px 20px", border: "1px solid #DDD6C8" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B5D4D", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                Data — System Monospace (no external load)
              </div>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 24, fontWeight: 700, color: "#5B7A3A", lineHeight: 1.0 }}>
                87% · 14/16 · 4.2 lbs
              </div>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 13, color: "#6B5D4D", marginTop: 4 }}>
                Percentages, counts, gear numbers
              </div>
            </div>
          </div>
        </SubSection>

        <SubSection title="Size Scale">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {TYPE_SCALE.map(({ px, usage }) => (
              <div key={px} style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "6px 0", borderBottom: "1px solid #EDE7DB" }}>
                <span style={{ fontSize: 11, color: "#6B5D4D", width: 40, flexShrink: 0, fontFamily: "ui-monospace, monospace" }}>{px}px</span>
                <span style={{ fontSize: px, fontFamily: "'DM Sans', Helvetica, sans-serif", color: "#2C2416", lineHeight: 1.2 }}>
                  Trail Ready
                </span>
                <span style={{ fontSize: 11, color: "#8B7D6B" }}>{usage}</span>
              </div>
            ))}
          </div>
        </SubSection>
      </Section>

      {/* ── 3. Spacing ── */}
      <Section title="3. Spacing Scale">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SPACING_SCALE.map(({ px, usage }) => (
            <div key={px} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 11, color: "#6B5D4D", width: 40, fontFamily: "ui-monospace, monospace", flexShrink: 0 }}>{px}px</span>
              <div style={{ width: px, height: 20, background: "#5B7A3A", borderRadius: 3, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#8B7D6B" }}>{usage}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 4. Border Radius ── */}
      <Section title="4. Border Radius">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {BORDER_RADIUS.map(({ name, px }) => (
            <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ width: 60, height: 60, background: "#3A4D2A", borderRadius: px }} />
              <div style={{ fontSize: 11, color: "#6B5D4D", textAlign: "center" }}>
                <div style={{ fontWeight: 700 }}>{name}</div>
                <div style={{ fontFamily: "ui-monospace, monospace" }}>{px}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 5. Stat Card Variants ── */}
      <Section title="5. Stat Card Variants">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          <StatCard variant="neutral" label="Members" value="8" unit="crew" />
          <StatCard variant="good" label="Readiness" value="87%" />
          <StatCard variant="warning" label="Gear" value="54%" />
          <StatCard variant="danger" label="Training" value="22%" />
        </div>
      </Section>

      {/* ── 6. Countdown Pill (all 4 phases) ── */}
      <Section title="6. Countdown Pill Phases">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <CountdownPill days={120} showLabel />
          <CountdownPill days={75} showLabel />
          <CountdownPill days={45} showLabel />
          <CountdownPill days={18} showLabel />
        </div>
      </Section>

      {/* ── 7. Badge System ── */}
      <Section title="7. Badge System">
        <SubSection title="Earned vs Locked — Side by Side">
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B5D4D", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Earned</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {BADGES.slice(0, 4).map(b => <BadgeEarned key={b.name} badge={b} size={64} />)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B5D4D", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Locked</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {BADGES.slice(4).map(b => <BadgeLocked key={b.name} badge={b} size={64} />)}
              </div>
            </div>
          </div>
        </SubSection>

        <SubSection title="Full Badge Row (3/8 earned)">
          <BadgeRow earned={3} />
        </SubSection>

        <SubSection title="Size Variants">
          <div style={{ display: "flex", gap: 24, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <BadgeEarned badge={BADGES[0]} size={48} />
              <div style={{ fontSize: 10, color: "#6B5D4D", marginTop: 4 }}>48px inline</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <BadgeEarned badge={BADGES[0]} size={64} />
              <div style={{ fontSize: 10, color: "#6B5D4D", marginTop: 4 }}>64px mobile</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <BadgeEarned badge={BADGES[0]} size={80} />
              <div style={{ fontSize: 10, color: "#6B5D4D", marginTop: 4 }}>80px desktop</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <BadgeEarned badge={BADGES[0]} size={96} />
              <div style={{ fontSize: 10, color: "#6B5D4D", marginTop: 4 }}>96px modal</div>
            </div>
          </div>
        </SubSection>
      </Section>

      {/* ── 8. Adventure Themes ── */}
      <Section title="8. Adventure Theme Previews">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {ADVENTURE_THEMES.map(t => <AdventureThemeCard key={t.id} theme={t} />)}
        </div>
      </Section>

      {/* ── 9. Bottom Nav (mockup) ── */}
      <Section title="9. Bottom Nav Bar (existing — reference only)">
        <div style={{ maxWidth: 400 }}>
          <BottomNavMockup />
        </div>
        <p style={{ fontSize: 12, color: "#8B7D6B", marginTop: 8 }}>
          Component exists as <code style={{ background: "#EDE7DB", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>BottomNavBar</code> in App.tsx. Do not rebuild.
        </p>
      </Section>

      {/* ── 10. Empty State ── */}
      <Section title="10. Empty State Example">
        <EmptyStateExample />
      </Section>

      {/* ── Footer ── */}
      <div style={{ marginTop: 64, paddingTop: 24, borderTop: "2px solid #DDD6C8", fontSize: 12, color: "#8B7D6B" }}>
        <strong style={{ color: "#3A4D2A" }}>TrailLog Design Bible — Phase 0</strong>
        {" "}· These are the locked tokens. All phases implement from this reference.
        {" "}· Route: <code style={{ background: "#EDE7DB", padding: "1px 4px", borderRadius: 3 }}>/design-bible</code> (dev only)
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Section / SubSection wrappers
═══════════════════════════════════════════════════════════════ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 56 }}>
      <h2 style={{
        fontFamily: "'Source Serif 4', Georgia, serif",
        fontSize: 28,
        fontWeight: 700,
        color: "#3A4D2A",
        lineHeight: 1.2,
        marginBottom: 24,
        paddingBottom: 8,
        borderBottom: "1px solid #DDD6C8"
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#6B5D4D", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Color Swatch
═══════════════════════════════════════════════════════════════ */

function ColorSwatch({ name, hex, label, textColor = "#fff" }: { name: string; hex: string; label?: string; textColor?: string }) {
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #DDD6C8", fontSize: 11 }}>
      <div style={{ background: hex, height: 48 }} />
      <div style={{ background: "#F3F0E8", padding: "6px 8px" }}>
        <div style={{ fontWeight: 700, color: "#2C2416" }}>{name}</div>
        <div style={{ fontFamily: "ui-monospace, monospace", color: "#6B5D4D", fontSize: 10 }}>{hex}</div>
        {label && <div style={{ color: "#8B7D6B", marginTop: 2 }}>{label}</div>}
      </div>
    </div>
  );
}

function ColorRamp({ ramp }: { ramp: Array<{ shade: number; hex: string }> }) {
  return (
    <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid #DDD6C8" }}>
      {ramp.map(({ shade, hex }) => {
        const light = shade < 500;
        return (
          <div key={shade} style={{ flex: 1, background: hex, padding: "10px 4px 6px", textAlign: "center", minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: light ? "#2C2416" : "#fff", lineHeight: 1.2 }}>{shade}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Countdown Pill
═══════════════════════════════════════════════════════════════ */

function countdownColor(days: number): { bg: string; text: string; label: string } {
  if (days >= 90) return { bg: "#5B7A3A", text: "#fff", label: "90+ days — calm" };
  if (days >= 60) return { bg: "#C47A2A", text: "#fff", label: "60-89 days — amber" };
  if (days >= 30) return { bg: "#D4700A", text: "#fff", label: "30-59 days — orange" };
  return { bg: "#CC3333", text: "#fff", label: "< 30 days — urgent" };
}

function CountdownPill({ days, showLabel = false }: { days: number; showLabel?: boolean }) {
  const { bg, text, label } = countdownColor(days);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{
        background: bg,
        color: text,
        borderRadius: 9999,
        padding: "5px 14px",
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "ui-monospace, monospace",
        whiteSpace: "nowrap",
      }}>
        {days}d to trail
      </div>
      {showLabel && <div style={{ fontSize: 10, color: "#6B5D4D" }}>{label}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Stat Card
═══════════════════════════════════════════════════════════════ */

const STAT_COLORS = {
  neutral: { bar: "transparent", value: "#2C2416", label: "Neutral — informational" },
  good:    { bar: "#5B7A3A",     value: "#5B7A3A", label: "Good — on track" },
  warning: { bar: "#D4A017",     value: "#D4A017", label: "Warning — needs attention" },
  danger:  { bar: "#CC3333",     value: "#CC3333", label: "Danger — behind/overdue" },
};

function StatCard({ variant, label, value, unit }: { variant: keyof typeof STAT_COLORS; label: string; value: string; unit?: string }) {
  const { bar, value: valueColor, label: variantLabel } = STAT_COLORS[variant];
  return (
    <div style={{
      background: "#F3F0E8",
      borderRadius: 14,
      border: "1px solid #DDD6C8",
      padding: 16,
      display: "flex",
      gap: 0,
      overflow: "hidden",
      position: "relative",
    }}>
      {bar !== "transparent" && (
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: bar, borderRadius: "4px 0 0 4px" }} />
      )}
      <div style={{ paddingLeft: bar !== "transparent" ? 12 : 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#6B5D4D", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
        <div style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 28, fontWeight: 700, color: valueColor, lineHeight: 1.1, marginTop: 4 }}>
          {value}
          {unit && <span style={{ fontSize: 12, fontWeight: 400, color: "#8B7D6B", marginLeft: 4 }}>{unit}</span>}
        </div>
        <div style={{ fontSize: 10, color: "#8B7D6B", marginTop: 4 }}>{variantLabel}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Badge Components
═══════════════════════════════════════════════════════════════ */

interface BadgeDef {
  name: string;
  icon: string;
  category: "physical" | "gear" | "admin" | "leadership" | "achievement";
}

const CATEGORY_COLORS: Record<string, string> = {
  physical:    "#5B7A3A",
  gear:        "#C47A2A",
  admin:       "#3A5A8A",
  leadership:  "#7A4A8A",
  achievement: "#C4A035",
};

const BADGES: BadgeDef[] = [
  { name: "Boot Break-In",    icon: "🥾", category: "physical" },
  { name: "Pack Shakedown",   icon: "🎒", category: "gear" },
  { name: "Medical Cleared",  icon: "⚕️", category: "admin" },
  { name: "Trail Ready",      icon: "⛰️", category: "physical" },
  { name: "Gear Complete",    icon: "📋", category: "gear" },
  { name: "First Hike",       icon: "👣", category: "physical" },
  { name: "Crew Leader",      icon: "🧭", category: "leadership" },
  { name: "Summit Certified", icon: "🏔️", category: "achievement" },
];

function BadgeEarned({ badge, size }: { badge: BadgeDef; size: number }) {
  const color = CATEGORY_COLORS[badge.category];
  const fontSize = size <= 48 ? 20 : size <= 64 ? 26 : size <= 80 ? 32 : 40;
  const labelSize = size <= 48 ? 9 : size <= 64 ? 10 : 11;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: size }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `${color}22`,
        border: `2px solid ${color}`,
        boxShadow: `0 0 0 2px #C4A035, inset 0 1px 2px rgba(0,0,0,0.08), 0 0 6px ${color}55`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize,
        flexShrink: 0,
      }}>
        {badge.icon}
      </div>
      <span style={{ fontSize: labelSize, fontWeight: 700, color: "#2C2416", textAlign: "center", lineHeight: 1.2 }}>
        {badge.name}
      </span>
    </div>
  );
}

function BadgeLocked({ badge, size }: { badge: BadgeDef; size: number }) {
  const fontSize = size <= 48 ? 20 : size <= 64 ? 26 : size <= 80 ? 32 : 40;
  const labelSize = size <= 48 ? 9 : size <= 64 ? 10 : 11;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: size }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <div style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "#F3F0E8",
          border: "2px dashed #C4B599",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize,
          filter: "grayscale(100%)",
          opacity: 0.5,
        }}>
          {badge.icon}
        </div>
        <div style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: size * 0.28,
          height: size * 0.28,
          borderRadius: "50%",
          background: "#6B5D4D",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.15,
          border: "1.5px solid #FDFAF5",
        }}>
          🔒
        </div>
      </div>
      <span style={{ fontSize: labelSize, fontWeight: 400, color: "#8B7D6B", textAlign: "center", lineHeight: 1.2 }}>
        {badge.name}
      </span>
    </div>
  );
}

function BadgeRow({ earned }: { earned: number }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#6B5D4D", marginBottom: 12 }}>
        {earned}/8 earned
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {BADGES.map((b, i) =>
          i < earned
            ? <BadgeEarned key={b.name} badge={b} size={64} />
            : <BadgeLocked key={b.name} badge={b} size={64} />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Adventure Theme Cards
═══════════════════════════════════════════════════════════════ */

interface AdventureThemeDef {
  id: string;
  name: string;
  gradient: string;
  accent: string;
  texture: string;
  patchEmoji: string;
}

const ADVENTURE_THEMES: AdventureThemeDef[] = [
  { id: "philmont",      name: "Philmont Scout Ranch",     gradient: "linear-gradient(135deg, #3A4D2A, #4E6635, #6B8847)", accent: "#C47A2A", texture: "Topo contours", patchEmoji: "⛰️" },
  { id: "seabase",       name: "Florida Sea Base",         gradient: "linear-gradient(135deg, #1A3A5C, #1E5080, #2A6FA0)", accent: "#00B4A0", texture: "Wave lines",    patchEmoji: "⚓" },
  { id: "northern-tier", name: "Northern Tier",            gradient: "linear-gradient(135deg, #2A3A5C, #3A4A6C, #5A6A8C)", accent: "#C0C8D8", texture: "Aurora lines",  patchEmoji: "🛶" },
  { id: "summit",        name: "Summit Bechtel Reserve",   gradient: "linear-gradient(135deg, #2A2A2A, #3A2A2A, #4A3030)", accent: "#CC3333", texture: "Rock texture",  patchEmoji: "🏕️" },
];

function AdventureThemeCard({ theme }: { theme: AdventureThemeDef }) {
  return (
    <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #DDD6C8" }}>
      <div style={{ background: theme.gradient, padding: "20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 32 }}>{theme.patchEmoji}</div>
        <div>
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 16, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
            {theme.name}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{theme.texture}</div>
        </div>
      </div>
      <div style={{ background: "#F3F0E8", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: theme.accent, border: "1px solid #DDD6C8" }} />
        <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color: "#6B5D4D" }}>{theme.accent}</span>
        <span style={{ fontSize: 11, color: "#8B7D6B" }}>accent</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Bottom Nav Mockup
═══════════════════════════════════════════════════════════════ */

const NAV_ITEMS = [
  { label: "Home",      icon: "🏠" },
  { label: "Training",  icon: "📅" },
  { label: "Gear",      icon: "🎒" },
  { label: "Readiness", icon: "✅" },
  { label: "Settings",  icon: "⚙️" },
];

function BottomNavMockup() {
  return (
    <div style={{
      background: "#FDFAF5",
      border: "1px solid #DDD6C8",
      borderRadius: 14,
      padding: "12px 0 8px",
      display: "flex",
      justifyContent: "space-around",
      boxShadow: "0 -2px 8px rgba(0,0,0,0.06)",
    }}>
      {NAV_ITEMS.map((item, i) => {
        const active = i === 0;
        return (
          <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 22, opacity: active ? 1 : 0.4 }}>{item.icon}</span>
            <span style={{
              fontSize: 10,
              fontWeight: active ? 700 : 400,
              color: active ? "#3A4D2A" : "#6B5D4D",
            }}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Empty State Example
═══════════════════════════════════════════════════════════════ */

function EmptyStateExample() {
  return (
    <div style={{
      background: "#F3F0E8",
      borderRadius: 14,
      border: "1px solid #DDD6C8",
      padding: "40px 24px",
      textAlign: "center",
      maxWidth: 360,
    }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🎒</div>
      <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 18, fontWeight: 700, color: "#2C2416", marginBottom: 8 }}>
        No gear tracked yet
      </div>
      <div style={{ fontSize: 13, color: "#6B5D4D", lineHeight: 1.5, marginBottom: 20 }}>
        Import the Philmont recommended gear list to get started. Every item checked off is one less worry on trail.
      </div>
      <button style={{
        background: "#3A4D2A",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "9px 20px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "'DM Sans', Helvetica, sans-serif",
      }}>
        Import Gear List →
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Data
═══════════════════════════════════════════════════════════════ */

const SEMANTIC_COLORS = [
  { name: "Background",  hex: "#FDFAF5", textColor: "#2C2416" },
  { name: "Surface",     hex: "#F3F0E8", textColor: "#2C2416" },
  { name: "Text",        hex: "#2C2416", textColor: "#fff" },
  { name: "Muted",       hex: "#6B5D4D", textColor: "#fff" },
  { name: "Border",      hex: "#DDD6C8", textColor: "#2C2416" },
  { name: "Primary",     hex: "#3A4D2A", textColor: "#fff" },
  { name: "Accent",      hex: "#5B7A3A", textColor: "#fff" },
  { name: "Amber",       hex: "#C47A2A", textColor: "#fff" },
  { name: "Dark BG",     hex: "#1A1A14", textColor: "#fff" },
  { name: "Dark Surface",hex: "#2A2A1E", textColor: "#fff" },
  { name: "Dark Text",   hex: "#F0EDE5", textColor: "#2C2416" },
];

const PRIMARY_RAMP = [50,100,200,300,400,500,600,700,800,900].map((s, i) => ({
  shade: s,
  hex: ["#F0F4EC","#D4E4B8","#B8CC9A","#8BA868","#6B8847","#5B7A3A","#4E6635","#3A4D2A","#2A3620","#1A2412"][i],
}));
const AMBER_RAMP = [50,100,200,300,400,500,600,700,800,900].map((s, i) => ({
  shade: s,
  hex: ["#FFF8ED","#FDEECF","#FAD99A","#F5BE63","#EDA030","#C47A2A","#A66020","#8A4C18","#6A3810","#4A2608"][i],
}));
const DANGER_RAMP = [50,100,200,300,400,500,600,700,800,900].map((s, i) => ({
  shade: s,
  hex: ["#FFF0F0","#FFD5D5","#FFB0B0","#FF7A7A","#EE4444","#CC3333","#AA2222","#8A1818","#6A1010","#480A0A"][i],
}));
const SUCCESS_RAMP = [50,100,200,300,400,500,600,700,800,900].map((s, i) => ({
  shade: s,
  hex: ["#F0F6EC","#D4E8C0","#A8D080","#7EBA55","#60A03A","#5B7A3A","#4A6430","#3A5025","#2A3C1A","#1A2A10"][i],
}));
const WARNING_RAMP = [50,100,200,300,400,500,600,700,800,900].map((s, i) => ({
  shade: s,
  hex: ["#FFFBEA","#FFF3C0","#FFE480","#F5CF40","#E8B820","#D4A017","#B08010","#8A600C","#644508","#3E2C04"][i],
}));

const TYPE_SCALE = [
  { px: 11, usage: "Badge labels, timestamps, table headers" },
  { px: 12, usage: "Secondary labels, metadata" },
  { px: 13, usage: "Body text, descriptions" },
  { px: 14, usage: "Emphasized body, stat values" },
  { px: 16, usage: "Subheadings, card titles" },
  { px: 18, usage: "Section headings" },
  { px: 20, usage: "Page titles (mobile)" },
  { px: 24, usage: "Page titles (desktop), hero stats" },
  { px: 32, usage: "Hero display numbers" },
  { px: 48, usage: "Large hero stats" },
];

const SPACING_SCALE = [
  { px: 4,  usage: "Icon gaps, tight inline spacing" },
  { px: 8,  usage: "Component padding (compact)" },
  { px: 12, usage: "Inset padding (small cards)" },
  { px: 16, usage: "Standard card padding, section gap" },
  { px: 20, usage: "Card padding (comfortable)" },
  { px: 24, usage: "Section padding, between cards" },
  { px: 32, usage: "Page section gaps" },
  { px: 48, usage: "Hero section vertical padding" },
  { px: 64, usage: "Full-bleed section separation" },
];

const BORDER_RADIUS = [
  { name: "Inputs",    px: "4px" },
  { name: "Buttons",   px: "8px" },
  { name: "Cards",     px: "12px" },
  { name: "Lg Cards",  px: "16px" },
  { name: "Modals",    px: "16px" },
  { name: "Pills",     px: "9999px" },
];
