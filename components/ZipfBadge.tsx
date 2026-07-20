import { Star } from "lucide-react";
import clsx from "clsx";

interface ZipfBadgeProps {
  score?: number | null;
  className?: string;
}

export function ZipfBadge({ score, className }: ZipfBadgeProps) {
  const isValid = score !== undefined && score !== null && score > 0;
  
  let starsCount = 1;
  const isGray = !isValid;

  if (isValid) {
    if (score! >= 4.0) {
      starsCount = 1;
    } else if (score! >= 3.0) {
      starsCount = 2;
    } else {
      starsCount = 3;
    }
  }

  return (
    <div className={clsx(
      "flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-bold shadow-sm border",
      isGray 
        ? "bg-surface-variant text-outline border-outline-variant" 
        : "bg-surface-container text-on-surface border-outline-variant",
      className
    )}>
      <div className="flex -space-x-0.5">
        {Array.from({ length: Math.max(1, starsCount) }).map((_, i) => (
          <Star 
            key={i} 
            size={14} 
            className={isGray ? "text-outline-variant fill-surface-container" : "text-amber-500 fill-amber-400"} 
          />
        ))}
      </div>
      {isValid && (
        <span>{score!.toFixed(1)}</span>
      )}
    </div>
  );
}
