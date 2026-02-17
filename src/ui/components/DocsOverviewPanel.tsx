import { useCallback, useEffect, useState } from 'react';
import { FileText, BookOpen, X, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';
import {
  ensureNarrativeDirs,
  listNarrativeFiles,
  readNarrativeFile,
  writeNarrativeFile,
} from '../../core/tauri/narrativeFs';
import { MermaidDiagram } from './MermaidDiagram';
import { RepositoryPlaceholderCard } from './RepositoryPlaceholderCard';

interface DocFile {
  name: string;
  path: string;
  title: string;
}

interface DocsOverviewPanelProps {
  repoRoot: string;
  onClose?: () => void;
}

/**
 * Extract title from markdown content (first # heading)
 */
function extractTitle(content: string, filename: string): string {
  // Look for # Title
  const match = content.match(/^#\s+(.+)$/m);
  if (match) {
    return match[1].trim();
  }
  // Fallback to filename without extension
  return filename.replace(/\.md$/i, '').replace(/-/g, ' ');
}

/**
 * Component to render markdown documentation files from .narrative/
 * with Mermaid diagram support.
 * 
 * Syncs with the opened repo - scans .narrative/ for .md files
 * and renders them with live Mermaid diagrams.
 */
export function DocsOverviewPanel({ repoRoot, onClose }: DocsOverviewPanelProps) {
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocFile | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState<string>('');

  // List available documentation files from .narrative/
  const refreshDocs = useCallback(async () => {
    if (!repoRoot) {
      setDocs([]);
      return;
    }

    try {
      // Call Tauri to list files in .narrative/ using the wrapper
      const files = await listNarrativeFiles(repoRoot, '');

      // Filter to .md files and load their content to get titles
      const mdFiles = files.filter((f) => f.endsWith('.md'));

      const docList: DocFile[] = await Promise.all(
        mdFiles.map(async (filename) => {
          try {
            const content = await readNarrativeFile(repoRoot, filename);
            return {
              name: filename,
              path: filename,
              title: extractTitle(content, filename),
            };
          } catch {
            // If we can't read it, just use the filename
            return {
              name: filename,
              path: filename,
              title: extractTitle('', filename),
            };
          }
        })
      );

      setDocs(docList);
      setError('');
    } catch (err) {
      console.error('Failed to list docs:', err);
      // Don't show error for empty/no directory - just empty list
      setDocs([]);
      setError('');
    }
  }, [repoRoot]);

  useEffect(() => {
    refreshDocs();
  }, [refreshDocs]);

  // Load selected document content
  useEffect(() => {
    if (!selectedDoc || !repoRoot) {
      setContent('');
      return;
    }

    const loadDoc = async () => {
      setLoading(true);
      try {
        const fileContent = await readNarrativeFile(repoRoot, selectedDoc.path);
        setContent(fileContent);
        setError('');
      } catch (err) {
        console.error('Failed to load doc:', err);
        setContent(`# Error\n\nFailed to load ${selectedDoc.name}`);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    loadDoc();
  }, [selectedDoc, repoRoot]);

  // Custom components for ReactMarkdown
  const components: Components = {
    code({ className, children, ...rest }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match?.[1] || '';
      
      if (language === 'mermaid') {
        return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
      }
      
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      );
    },
  };

  // Document list view
  return (
    <div className="h-full flex flex-col rounded-2xl border border-border-light bg-bg-secondary p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 motion-page-enter">
      <div className="mb-4 flex items-center justify-between border-b border-border-light pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent-blue" />
          <h2 className="text-sm font-semibold text-text-primary">Documentation</h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!repoRoot ? (
        <div className="flex flex-1 items-center justify-center p-3">
          <RepositoryPlaceholderCard className="max-w-2xl" />
        </div>
      ) : selectedDoc ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border-light">
            <button
              type="button"
              onClick={() => setSelectedDoc(null)}
              className="p-1.5 rounded-lg hover:bg-bg-hover text-text-tertiary"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">{selectedDoc.title}</h3>
              <p className="text-xs text-text-tertiary">{selectedDoc.name}</p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm text-text-tertiary">Loading...</div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown rehypePlugins={[rehypeRaw]} components={components}>
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-text-tertiary">
          <div className="mb-3 inline-flex rounded-xl border border-border-light bg-bg-tertiary p-3">
            <FileText className="h-12 w-12 opacity-50" />
          </div>
          <p className="text-sm font-medium text-text-secondary">No Narrative docs found</p>
          <p className="text-xs mt-2 text-text-muted max-w-[52ch]">
            Narrative renders markdown files inside <span className="font-mono">.narrative/</span>. Mermaid diagrams
            render from fenced <span className="font-mono">```mermaid</span> blocks.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-xs font-medium text-text-secondary hover:bg-bg-hover"
              onClick={async () => {
	                try {
                  await ensureNarrativeDirs(repoRoot);
                  const rel = 'docs/overview.md';
                  const starter = [
                    '# Narrative Documentation',
                    '',
	                    '## System overview',
	                    '',
	                    '```mermaid',
	                    'flowchart TD',
	                    '  A[Auto-ingest] --> B[Sessions]',
	                    '  A --> C[Traces]',
	                    '  B --> D[Story Anchors]',
	                    '  C --> D',
	                    '```',
	                    '',
	                    '## Notes',
	                    '',
	                    '- Place docs in `.narrative/` so they can be shared alongside narratives.',
                    ''
                  ].join('\\n');
                  await writeNarrativeFile(repoRoot, rel, starter);
                  await refreshDocs();
                } catch (e) {
                  console.error('Failed to create starter doc:', e);
                }
              }}
            >
              <FileText className="w-4 h-4" />
              Create starter doc
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto">
          {docs.map((doc) => (
            <button
              key={doc.path}
              type="button"
              onClick={() => setSelectedDoc(doc)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border-light hover:border-accent-blue-light hover:bg-accent-blue-bg transition-colors text-left group"
            >
              <FileText className="w-5 h-5 text-text-muted group-hover:text-accent-blue" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-secondary group-hover:text-accent-blue truncate">
                  {doc.title}
                </p>
                <p className="text-xs text-text-muted truncate">{doc.name}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-accent-blue" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
