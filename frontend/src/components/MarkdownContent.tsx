import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

const proseClasses = 'prose prose-sm max-w-none text-slate-700'

const defaultComponents: Components = {
  h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-1.5">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold mt-2.5 mb-1">{children}</h3>,
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-lg overflow-x-auto my-2">
          <code {...props}>{children}</code>
        </pre>
      )
    }
    return (
      <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[0.9em] font-mono" {...props}>
        {children}
      </code>
    )
  },
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-slate-300 pl-3 my-2 text-slate-600 italic">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
      {children}
    </a>
  ),
}

interface Props {
  content: string
  className?: string
  components?: Components
}

export default function MarkdownContent({ content, className = '', components }: Props) {
  return (
    <div className={`${proseClasses} ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components ?? defaultComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
