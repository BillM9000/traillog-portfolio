export default function Logo({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="50" cy="50" r="48" fill="#1a2420" stroke="#3d5a45" strokeWidth="2" />

      {/* Back mountain */}
      <path d="M18 72 L42 28 L66 72" fill="#2a3d2e" stroke="#3d5a45" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Front mountain */}
      <path d="M38 72 L62 30 L86 72" fill="#344a3a" stroke="#4a7a55" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Snow cap on front peak */}
      <path d="M55 38 L62 30 L69 38 L64 36 L60 39 Z" fill="#d4c8a8" opacity="0.9" />

      {/* Snow cap on back peak */}
      <path d="M36 36 L42 28 L48 36 L44 34 L40 37 Z" fill="#a0b0a0" opacity="0.6" />

      {/* Trail / sync path */}
      <path d="M24 68 Q38 55, 50 60 Q62 65, 78 52" stroke="#d4aa6a" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeDasharray="0" />

      {/* Sync dots on trail */}
      <circle cx="30" cy="64" r="2.5" fill="#d4aa6a" />
      <circle cx="50" cy="60" r="2.5" fill="#d4aa6a" />
      <circle cx="72" cy="55" r="2.5" fill="#d4aa6a" />

      {/* Stars */}
      <circle cx="28" cy="22" r="1.2" fill="#d4c8a8" opacity="0.7" />
      <circle cx="75" cy="18" r="1" fill="#d4c8a8" opacity="0.5" />
      <circle cx="82" cy="26" r="1.4" fill="#d4c8a8" opacity="0.6" />
    </svg>
  );
}
