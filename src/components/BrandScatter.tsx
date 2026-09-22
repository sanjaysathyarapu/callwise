// The literal logo bubble shape (see src/app/icon.svg), reused as a faint brand
// texture rather than a separate illustration — see System D discussed with the user.
const BUBBLE_PATH =
  "M9 11.5A2.5 2.5 0 0 1 11.5 9h9a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5H15l-4 3.5V20h-.5A2.5 2.5 0 0 1 9 17.5z";

interface Bubble {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  size: number;
  rotate: number;
  opacity: number;
}

// Confined to the outer ~20% margins and corners of the viewport — nothing sits in
// the central column, so it never lands behind headline or body text. Opacity is
// deliberately near-invisible (~2-3%); this is texture, not an illustration.
const BUBBLES: Bubble[] = [
  { top: "6%", left: "3%", size: 46, rotate: -12, opacity: 0.028 },
  { top: "15%", left: "9%", size: 24, rotate: 10, opacity: 0.022 },
  { top: "8%", right: "5%", size: 34, rotate: 16, opacity: 0.025 },
  { top: "22%", right: "2%", size: 20, rotate: -18, opacity: 0.02 },
  { bottom: "12%", left: "4%", size: 28, rotate: 9, opacity: 0.022 },
  { bottom: "6%", right: "7%", size: 42, rotate: -10, opacity: 0.028 },
  { bottom: "20%", right: "2%", size: 18, rotate: 22, opacity: 0.02 },
];

// A static, server-rendered brand texture. No client JS, no theme-specific code —
// `text-foreground` follows the existing CSS-variable theme flip automatically.
export function BrandScatter() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {BUBBLES.map((b, i) => (
        <svg
          key={i}
          viewBox="0 0 32 32"
          width={b.size}
          height={b.size}
          className="absolute text-foreground"
          style={{
            top: b.top,
            bottom: b.bottom,
            left: b.left,
            right: b.right,
            opacity: b.opacity,
            transform: `rotate(${b.rotate}deg)`,
          }}
        >
          <path d={BUBBLE_PATH} fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      ))}
    </div>
  );
}
