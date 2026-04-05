"use client";

type RatingStarsProps = {
  score?: number | null;
  count?: number | null;
  size?: "sm" | "md";
};

const iconClass = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
} as const;

function StarIcon({ filled, size }: { filled: boolean; size: "sm" | "md" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      className={iconClass[size]}
      aria-hidden="true"
    >
      <path d="M10 2.5l2.318 4.696 5.182.754-3.75 3.655.885 5.161L10 14.329 5.365 16.766l.885-5.161L2.5 7.95l5.182-.754L10 2.5z" />
    </svg>
  );
}

export function RatingStars({
  score = 0,
  count = 0,
  size = "sm",
}: RatingStarsProps) {
  const normalized = Math.max(0, Math.min(5, Number(score) || 0));
  const filledStars = Math.round(normalized);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5 text-amber-500">
        {Array.from({ length: 5 }, (_, index) => (
          <StarIcon key={index} filled={index < filledStars} size={size} />
        ))}
      </div>
      <span className="text-xs text-slate-500">
        {normalized.toFixed(1)} {count ? `(${count})` : ""}
      </span>
    </div>
  );
}
