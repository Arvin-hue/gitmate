import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  Folder, 
  FileCode, 
  Loader2, 
  Plus, 
  Check, 
  FileJson, 
  FileType, 
  Image as ImageIcon, 
  FileText,
  File,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { getRepoContents, getFileContent } from '../services/github';
import { FileContext, GitHubNode } from '../types';

interface FileNodeProps {
  node: GitHubNode;
  owner: string;
  repo: string;
  depth: number;
  existingFiles: FileContext[];
  token?: string;
  onAddFile: (path: string, content: string) => Promise<void>;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx': 
      return <FileCode size={14} className="text-blue-500" />;
    case 'css':
    case 'scss': 
    case 'tailwind':
      return <FileType size={14} className="text-pink-500" />;
    case 'html': 
      return <FileCode size={14} className="text-orange-500" />;
    case 'json': 
    case 'yml':
    case 'yaml':
      return <FileJson size={14} className="text-yellow-500" />;
    case 'md': 
    case 'txt':
      return <FileText size={14} className="text-slate-500" />;
    case 'png': 
    case 'jpg': 
    case 'jpeg': 
    case 'svg': 
    case 'ico':
      return <ImageIcon size={14} className="text-purple-500" />;
    default: 
      return <File size={14} className="text-slate-400" />;
  }
};

const FileNode: React.FC<FileNodeProps> = ({ node, owner, repo, depth, existingFiles, token, onAddFile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<GitHubNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    setIsAdded(existingFiles.some(f => f.path === node.path));
  }, [existingFiles, node.path]);

  const handleToggle = async () => {
    if (node.type === 'dir') {
      if (!isOpen && children.length === 0) {
        setIsLoading(true);
        try {
          const contents = await getRepoContents(owner, repo, node.path, token);
          setChildren(contents);
        } catch (error) {
          console.error("Failed to load directory", error);
        } finally {
          setIsLoading(false);
        }
      }
      setIsOpen(!isOpen);
    }
  };

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdded || isAdding || !node.download_url) return;

    setIsAdding(true);
    try {
      const content = await getFileContent(node.download_url, token);
      await onAddFile(node.path, content);
    } catch (error) {
      console.error("Failed to add file", error);
    } finally {
      setIsAdding(false);
    }
  };

  const paddingLeft = `${depth * 12 + 12}px`;

  return (
    <div>
      <div 
        className={`group flex items-center gap-2 py-1.5 pr-2 text-sm cursor-pointer select-none transition-all duration-200 border-l-2 border-transparent
          ${isOpen ? 'bg-slate-50 border-blue-200' : 'hover:bg-slate-50 hover:border-slate-200'}
          ${isAdded ? 'opacity-75' : ''}`}
        style={{ paddingLeft }}
        onClick={handleToggle}
      >
        <div className="text-slate-400 flex-shrink-0 transition-transform duration-200">
          {node.type === 'dir' ? (
            isLoading ? <Loader2 size={14} className="animate-spin" /> : 
            <div className={`transform ${isOpen ? 'rotate-90' : ''}`}>
              <ChevronRight size={14} />
            </div>
          ) : (
             <div className="w-3.5" /> 
          )}
        </div>
        
        <div className="flex-shrink-0">
          {node.type === 'dir' ? (
            <Folder size={14} className={`transition-colors ${isOpen ? 'text-blue-500' : 'text-blue-400'}`} />
          ) : (
            getFileIcon(node.name)
          )}
        </div>
        
        <span className={`truncate flex-1 font-medium ${isAdded ? 'text-slate-500' : 'text-slate-700'}`}>
          {node.name}
        </span>

        {node.type === 'file' && (
          <button
            onClick={handleAdd}
            disabled={isAdded || isAdding || !node.download_url}
            className={`opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md transition-all duration-200 
              ${isAdded ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
            title={isAdded ? "Already in context" : "Add to context"}
          >
            {isAdding ? (
              <Loader2 size={12} className="animate-spin text-blue-600" />
            ) : isAdded ? (
              <Check size={12} strokeWidth={3} />
            ) : (
              <Plus size={12} strokeWidth={3} />
            )}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="relative">
          {/* Guide line for nested content */}
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-slate-100" style={{ left: `${(depth + 1) * 12 + 6}px` }}></div>
          {children.map(child => (
            <FileNode 
              key={child.path} 
              node={child} 
              owner={owner} 
              repo={repo} 
              depth={depth + 1}
              existingFiles={existingFiles}
              token={token}
              onAddFile={onAddFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FileExplorerProps {
  repoUrl: string;
  existingFiles: FileContext[];
  token?: string;
  onAddFile: (path: string, content: string) => Promise<void>;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ repoUrl, existingFiles, token, onAddFile }) => {
  const [rootNodes, setRootNodes] = useState<GitHubNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [repoDetails, setRepoDetails] = useState<{owner: string, repo: string} | null>(null);

  const loadRoot = async () => {
      setLoading(true);
      setError('');
      
      try {
        const urlObj = new URL(repoUrl);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length < 2) {
            throw new Error("Invalid GitHub URL");
        }
        const owner = parts[0];
        const repo = parts[1];
        setRepoDetails({ owner, repo });

        const contents = await getRepoContents(owner, repo, '', token);
        setRootNodes(contents);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load repository.");
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    if (repoUrl) loadRoot();
  }, [repoUrl, token]); // Reload if token changes

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-in fade-in duration-500">
        <Loader2 size={32} className="animate-spin mb-3 text-blue-500" />
        <span className="text-sm font-medium">Fetching repository...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 mb-4 flex flex-col items-center">
           <AlertCircle size={24} className="mb-2" />
           <p className="text-sm font-semibold mb-1">Access Error</p>
           <p className="text-xs opacity-90">{error}</p>
        </div>
        <button 
          onClick={loadRoot}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all"
        >
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  if (!repoDetails) return null;

  return (
    <div className="py-2 pb-10">
      <div className="px-3 pb-2 mb-2 border-b border-slate-100 flex justify-between items-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Source</span>
        <button 
          onClick={loadRoot} 
          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-all"
          title="Refresh Explorer"
        >
          <RefreshCw size={12} />
        </button>
      </div>
      {rootNodes.map(node => (
        <FileNode 
          key={node.path} 
          node={node} 
          owner={repoDetails.owner}
          repo={repoDetails.repo}
          depth={0}
          existingFiles={existingFiles}
          token={token}
          onAddFile={onAddFile}
        />
      ))}
      
      {rootNodes.length === 0 && (
         <div className="text-center py-8 text-slate-400 text-sm">
           Empty repository
         </div>
      )}
    </div>
  );
};

export default FileExplorer;