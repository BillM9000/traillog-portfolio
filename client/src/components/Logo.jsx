export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Outer compass ring */}
      <circle cx="24" cy="24" r="22" stroke="#B8CC9A" strokeWidth="1.5" opacity="0.5" />
      <circle cx="24" cy="24" r="19" stroke="#D4E4B8" strokeWidth="0.75" opacity="0.3" />
      {/* Mountain peaks */}
      <path d="M10 34 L19 16 L24 24 L29 14 L38 34 Z" fill="#B8CC9A" opacity="0.9" />
      <path d="M14 34 L21 20 L24 25 L27 18 L34 34 Z" fill="#FDFAF5" opacity="0.95" />
      {/* Trail winding through mountains */}
      <path d="M12 38 Q18 32 22 33 Q26 34 30 28 Q34 22 38 18" stroke="#5B7A3A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Data point markers along trail */}
      <circle cx="22" cy="33" r="1.8" fill="#FDFAF5" stroke="#5B7A3A" strokeWidth="0.8" />
      <circle cx="30" cy="28" r="1.8" fill="#FDFAF5" stroke="#5B7A3A" strokeWidth="0.8" />
      {/* Compass cardinal dots */}
      <circle cx="24" cy="4" r="1.5" fill="#D4E4B8" />
      <circle cx="24" cy="44" r="1.5" fill="#D4E4B8" opacity="0.4" />
      <circle cx="4" cy="24" r="1.5" fill="#D4E4B8" opacity="0.4" />
      <circle cx="44" cy="24" r="1.5" fill="#D4E4B8" opacity="0.4" />
      {/* North needle accent */}
      <path d="M24 4 L25.5 8 L24 7 L22.5 8 Z" fill="#D4E4B8" opacity="0.7" />
    </svg>
  );
}
