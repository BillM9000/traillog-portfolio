/**
 * Custom hiking/backpacking pack icon.
 * Matches lucide-react style: 24x24 viewBox, stroke-based, rounded caps.
 * Props: size (default 24), color (default "currentColor"), strokeWidth (default 2), className, style
 */
export default function HikingPackIcon({ size = 24, color = "currentColor", strokeWidth = 2, className, style }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* Main pack body - tall rectangle with rounded top */}
      <path d="M7 6c0-1.5.5-3 2-3.5a5 5 0 0 1 6 0c1.5.5 2 2 2 3.5v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V6z" />
      {/* Top lid/flap */}
      <path d="M6.5 8h11" />
      {/* Hip belt wings */}
      <path d="M7 16H5a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h2" />
      <path d="M17 16h2a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-2" />
      {/* Compression strap across middle */}
      <path d="M7 12h10" />
      {/* Sleeping pad roll at bottom */}
      <ellipse cx="12" cy="21" rx="3" ry="1.2" />
    </svg>
  );
}
