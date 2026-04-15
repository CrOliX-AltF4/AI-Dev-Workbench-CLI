import { render } from 'ink';
import React from 'react';
import { SetupScreen } from '../../ui/screens/SetupScreen.js';

export async function setupCommand(): Promise<void> {
  const { waitUntilExit } = render(
    React.createElement(SetupScreen, { onComplete: () => process.exit(0) }),
  );
  await waitUntilExit();
}
