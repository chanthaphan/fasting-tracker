import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders AI-generated markdown (bold, lists, headings, tables) with
 * compact styling — see the .ai-markdown rules in index.css.
 * react-markdown ignores raw HTML by default, so model output stays safe.
 */
export function AiMarkdown({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`ai-markdown ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
