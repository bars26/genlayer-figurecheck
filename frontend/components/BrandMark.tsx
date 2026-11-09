/** FigureCheck mark: two identical panels under a loupe. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="FigureCheck">
      <rect x="1" y="1" width="30" height="30" rx="6" fill="#13294B" />
      <rect x="6" y="9" width="8" height="6" rx="1" fill="#FFFDF8" />
      <rect x="6" y="17" width="8" height="6" rx="1" fill="#FFFDF8" />
      <path d="M7.5 12h5M7.5 20h5" stroke="#13294B" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="20" cy="15" r="5.2" fill="none" stroke="#C8102E" strokeWidth="2.2" />
      <path d="M23.7 18.7l3.3 3.3" stroke="#C8102E" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
