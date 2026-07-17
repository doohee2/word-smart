import React from 'react';
import clsx from 'clsx';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <div className="relative h-[80%] aspect-square shrink-0 rounded-lg overflow-hidden shadow-sm">
        <Image
          src="/icons/icon-light-192x192.png"
          alt="Word Smart Logo Light"
          fill
          className="object-contain dark:hidden"
        />
        <Image
          src="/icons/icon-dark-192x192.png"
          alt="Word Smart Logo Dark"
          fill
          className="object-contain hidden dark:block"
        />
      </div>
      <svg viewBox="0 0 240 60" className="h-full w-auto drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="45" fontWeight="800" fontSize="42" letterSpacing="-0.02em" className="fill-primary transition-colors duration-300">Word</text>
        <circle cx="128" cy="10" r="3" className="fill-current text-on-surface transition-colors duration-300" />
        <text x="116" y="45" fontWeight="700" fontSize="42" letterSpacing="-0.02em" className="fill-current text-on-surface transition-colors duration-300">Smart</text>
      </svg>
    </div>
  );
}
