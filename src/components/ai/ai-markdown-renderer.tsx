import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** react-markdown ignores raw HTML by default, so model output stays safe. */
export function AiMarkdownRenderer({ text }: { text: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>;
}
