interface TalentIQLogoProps {
  size?: number;
  className?: string;
}

export function TalentIQLogo({ size = 32, className }: TalentIQLogoProps) {
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="TalentIQ logo"
    >
      {/* Outer diamond */}
      <rect
        x="64"
        y="64"
        width="128"
        height="128"
        rx="24"
        transform="rotate(45 128 128)"
        style={{ fill: "hsl(var(--primary))" }}
      />
      {/* Inner white cutout diamond */}
      <rect
        x="96"
        y="96"
        width="64"
        height="64"
        rx="10"
        transform="rotate(45 128 128)"
        style={{ fill: "hsl(var(--primary-foreground))", opacity: 0.9 }}
      />
    </svg>
  );
}
