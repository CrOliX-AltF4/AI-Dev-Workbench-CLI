import React, { useState } from 'react';
import { PromptScreen } from './screens/PromptScreen.js';
import { PipelineScreen } from './screens/PipelineScreen.js';

type Screen = 'prompt' | 'pipeline';

interface AppProps {
  initialIntent?: string;
}

export function App({ initialIntent }: AppProps) {
  const [screen, setScreen] = useState<Screen>(initialIntent ? 'pipeline' : 'prompt');
  const [intent, setIntent] = useState(initialIntent ?? '');

  const handleIntentSubmit = (value: string) => {
    setIntent(value);
    setScreen('pipeline');
  };

  if (screen === 'prompt') {
    return <PromptScreen onSubmit={handleIntentSubmit} />;
  }

  return <PipelineScreen intent={intent} />;
}
