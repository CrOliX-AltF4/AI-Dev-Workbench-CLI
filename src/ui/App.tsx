import React, { useState } from 'react';
import { PromptScreen } from './screens/PromptScreen.js';
import { PipelineScreen } from './screens/PipelineScreen.js';
import { ResultsScreen } from './screens/ResultsScreen.js';
import type { PipelineRun } from '../types/index.js';

type Screen = 'prompt' | 'pipeline' | 'results';

interface AppProps {
  initialIntent?: string;
}

export function App({ initialIntent }: AppProps) {
  const [screen, setScreen] = useState<Screen>(initialIntent ? 'pipeline' : 'prompt');
  const [intent, setIntent] = useState(initialIntent ?? '');
  const [completedRun, setCompletedRun] = useState<PipelineRun | null>(null);

  const handleIntentSubmit = (value: string) => {
    setIntent(value);
    setScreen('pipeline');
  };

  const handlePipelineComplete = (run: PipelineRun) => {
    setCompletedRun(run);
    setScreen('results');
  };

  const handleNewPipeline = () => {
    setCompletedRun(null);
    setIntent('');
    setScreen('prompt');
  };

  if (screen === 'prompt') {
    return <PromptScreen onSubmit={handleIntentSubmit} />;
  }

  if (screen === 'results' && completedRun) {
    return <ResultsScreen run={completedRun} onNewPipeline={handleNewPipeline} />;
  }

  return <PipelineScreen intent={intent} onComplete={handlePipelineComplete} />;
}
