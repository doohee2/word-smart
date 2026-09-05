import { Star } from "lucide-react";
import clsx from "clsx";

interface ZipfBadgeProps {
  score?: number | string | null;
  listTitle?: string;
  className?: string;
}

export function ZipfBadge({ score, listTitle, className }: ZipfBadgeProps) {
  const isValid = score !== undefined && score !== null && score !== 0 && score !== "" && score !== "NaN";
  
  let starsCount = 1;
  let isGray = !isValid;
  let labelText: string | undefined = undefined;

  if (typeof score === 'number' && isNaN(score)) {
    isGray = true;
    starsCount = 1; // Default back to gray star
  } else if (typeof score === 'string') {
    labelText = score;
    isGray = false;
    const num = parseFloat(score.replace(/[^0-9.]/g, ''));
    if (!isNaN(num)) {
      if (num <= 1.5) starsCount = 4;
      else if (num <= 2.5) starsCount = 3;
      else if (num <= 3.5) starsCount = 2;
      else if (num <= 5.5) starsCount = 1;
      else starsCount = 0;
    } else {
      starsCount = 0;
    }
  } else if (isValid && typeof score === 'number') {
    labelText = score.toFixed(1);
    if (score > 4.0) {
      starsCount = 1;
    } else if (score > 2.5) {
      starsCount = 2;
    } else {
      starsCount = 3;
    }
  } else if (listTitle) {
    const upperTitle = listTitle.toUpperCase();
    if (upperTitle.includes("N1")) {
      starsCount = 4;
      isGray = false;
      labelText = "N1";
    } else if (upperTitle.includes("N2") || upperTitle.includes("N3")) {
      starsCount = 3;
      isGray = false;
      labelText = upperTitle.includes("N2") ? "N2" : "N3";
    } else if (upperTitle.includes("N4")) {
      starsCount = 2;
      isGray = false;
      labelText = "N4";
    } else if (upperTitle.includes("N5")) {
      starsCount = 1;
      isGray = false;
      labelText = "N5";
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
      <div className={clsx("flex -space-x-0.5", starsCount === 0 && "hidden")}>
        {Array.from({ length: Math.max(0, starsCount) }).map((_, i) => (
          <Star 
            key={i} 
            size={14} 
            className={isGray ? "text-outline-variant fill-surface-container" : "text-amber-500 fill-amber-400"} 
          />
        ))}
      </div>
      {labelText && (
        <span>{labelText}</span>
      )}
    </div>
  );
}
