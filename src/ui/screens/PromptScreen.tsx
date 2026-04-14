import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { Header } from '../components/Header.js';

interface PromptScreenProps {
  onSubmit: (intent: string) => void;
}

export function PromptScreen({ onSubmit }: PromptScreenProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (val: string) => {
    const trimmed = val.trim();
    if (trimmed.length > 0) onSubmit(trimmed);
  };

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Header />

      <Box flexDirection="column" paddingX={1} paddingY={1} gap={1}>
        <Text color="cyan" bold>
          What do you want to build?
        </Text>

        <Box gap={1}>
          <Text color="cyan">›</Text>
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder="create a REST API to manage users..."
          />
        </Box>

        <Text color="gray" dimColor>
          Press <Text color="cyan">Enter</Text> to start the pipeline
        </Text>
      </Box>
    </Box>
  );
}
