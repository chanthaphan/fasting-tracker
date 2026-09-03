import { lazy, Suspense } from 'react';

const Renderer = lazy(() => import('./ai-markdown-renderer').then((m) => ({ default: m.AiMarkdownRenderer })));

/**
 * Renders AI-generated markdown (bold, lists, headings, tables) with
 * compact styling — see the .ai-markdown rules in index.css. The
 * markdown library loads on first use; until then the raw text shows.
 */
export function AiMarkdown({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`ai-markdown ${className}`}>
      <Suspense fallback={<p className="whitespace-pre-wrap">{text}</p>}>
        <Renderer text={text} />
      </Suspense>
    </div>
  );
}
