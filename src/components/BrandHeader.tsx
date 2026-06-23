import type { ComponentChildren } from 'preact';

interface BrandHeaderProps {
  containerClass?: string;
  children?: ComponentChildren;
}

export function BrandHeader({ containerClass = 'max-w-[1400px]', children }: BrandHeaderProps) {
  return (
    <header class="bg-billiard text-paper">
      <div class={`${containerClass} mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4`}>
        <a href="#" class="flex items-center gap-3 group" aria-label="Dicestats home">
          <img src={`${import.meta.env.BASE_URL}cat_paw_roll.png`} alt="Dicestats" class="w-14 h-14 object-contain" />
          <span class="flex flex-col leading-none">
            <span class="font-display text-[30px] tracking-[0.06em] text-paper leading-none">DICESTATS</span>
            <span class="font-mono text-[9px] uppercase tracking-[0.28em] text-gold mt-1.5">
              dice probability calculator
            </span>
          </span>
        </a>
        <nav class="flex items-center gap-3">
          {children}
          <a href="https://lazycatcult.com" target="_blank" rel="noopener noreferrer" aria-label="Lazy Cat Cult">
            <img src={`${import.meta.env.BASE_URL}lcc_logo2.png`} alt="Lazy Cat Cult" class="h-12 w-auto" />
          </a>
        </nav>
      </div>
    </header>
  );
}
