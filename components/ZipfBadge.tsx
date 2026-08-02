import { Star } from "lucide-react";
import clsx from "clsx";

interface ZipfBadgeProps {
  score?: number | null;
  listTitle?: string;
  className?: string;
}

export function ZipfBadge({ score, listTitle, className }: ZipfBadgeProps) {
  const isValid = score !== undefined && score !== null && score > 0;
  
  let starsCount = 1;
  let isGray = !isValid;
  let labelText: string | undefined = undefined;

  if (isValid) {
    labelText = score!.toFixed(1);
    if (score! > 4.0) {
      starsCount = 1;
    } else if (score! > 2.5) {
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
      <div className="flex -space-x-0.5">
        {Array.from({ length: Math.max(1, starsCount) }).map((_, i) => (
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
