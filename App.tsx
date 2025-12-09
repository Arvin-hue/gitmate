import React, { useState } from 'react';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import { ProjectState, AppView } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [projectState, setProjectState] = useState<ProjectState>({
    repoUrl: '',
    name: '',
    description: '',
    files: []
  });

  const handleStart = (repoUrl: string) => {
    setProjectState(prev => ({
      ...prev,
      repoUrl,
      name: repoUrl.split('/').pop() || 'Project'
    }));
    setView(AppView.WORKSPACE);
  };

  const handleExit = () => {
    setView(AppView.LANDING);
    setProjectState({
      repoUrl: '',
      name: '',
      description: '',
      files: []
    });
  };

  return (
    <div className="font-sans">
      {view === AppView.LANDING ? (
        <Landing onStart={handleStart} />
      ) : (
        <Dashboard 
          projectState={projectState} 
          setProjectState={setProjectState}
          onExit={handleExit}
        />
      )}
    </div>
  );
};

export default App;