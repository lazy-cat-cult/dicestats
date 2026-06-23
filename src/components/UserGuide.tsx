import userGuideMd from '../../doc/user_guide.md?raw';
import { markdownToHtml } from '@/utils/markdown-to-html';
import { BrandHeader } from '@/components/BrandHeader';

const guideHtml = markdownToHtml(userGuideMd);

export function UserGuide() {
  return (
    <div class="min-h-screen flex flex-col">
      <BrandHeader containerClass="max-w-[900px]" />

      <main class="flex-1 max-w-[900px] w-full mx-auto px-4 sm:px-6 py-10">
        <article
          class="prose-custom"
          dangerouslySetInnerHTML={{ __html: guideHtml }}
        />
      </main>

      <footer class="border-t border-rule mt-auto">
        <div class="max-w-[900px] mx-auto px-4 sm:px-6 py-4 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          <span>
            Created by <a href="https://lazycatcult.com" target="_blank" rel="noopener noreferrer" class="underline hover:text-gold-deep transition-colors">Lazy Cat Cult</a> {new Date().getFullYear() === 2026 ? '2026' : `2026-${new Date().getFullYear()}`}
          </span>
        </div>
      </footer>
    </div>
  );
}
