import { GitHubNode } from '../types';

export const parseGitHubUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  } catch (e) {
    return null;
  }
  return null;
};

export const getRepoContents = async (owner: string, repo: string, path: string = '', token?: string): Promise<GitHubNode[]> => {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json'
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { headers });
  
  if (response.status === 403) {
    throw new Error('Rate limit exceeded. Add a GitHub Token in settings.');
  }
  if (response.status === 404) {
    throw new Error('Repository or path not found.');
  }
  if (!response.ok) {
    throw new Error('Failed to fetch repository contents.');
  }

  const data = await response.json();
  
  if (!Array.isArray(data)) {
    // If it's a file, the API returns an object, but we generally call this for directories
    return []; 
  }
  
  return data.map((item: any) => ({
    name: item.name,
    path: item.path,
    type: item.type,
    url: item.url,
    download_url: item.download_url
  })).sort((a, b) => {
      // Directories first, then files
      if (a.type === 'dir' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'dir') return 1;
      return a.name.localeCompare(b.name);
  });
};

export const getFileContent = async (downloadUrl: string, token?: string): Promise<string> => {
   // For raw content, we can often just fetch the URL. 
   // However, if it's a private repo, we might need the API URL equivalent to use the token.
   // `download_url` usually works without token for public repos.
   // If token is present, we should try to use it if fetching fails or use the contents API for file blob.
   // For simplicity in this demo, we fetch downloadUrl directly. 
   // Note: Token auth for raw user content isn't always straightforward via header on raw.githubusercontent.com.
   // A robust impl would use the blob API.
   
   const response = await fetch(downloadUrl);
   if (!response.ok) throw new Error('Failed to fetch file content');
   return await response.text();
};