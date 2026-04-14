import { render } from 'ink';
import React from 'react';
import { App } from '../../ui/App.js';

interface RunOptions {
  intent?: string;
}

export async function runCommand(options: RunOptions): Promise<void> {
  const props = options.intent ? { initialIntent: options.intent } : {};
  const { waitUntilExit } = render(React.createElement(App, props));
  await waitUntilExit();
}
