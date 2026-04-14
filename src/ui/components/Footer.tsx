import React from 'react';
import { Box, Text } from 'ink';
import type { PipelineStep } from '../../types/index.js';

interface FooterProps {
  steps: PipelineStep[];
  keybindings: Array<{ key: string; label: string }>;
}

export function Footer({ steps, keybindings }: FooterProps) {
  const totalCost = steps.reduce((sum, s) => sum + (s.costUsd ?? 0), 0);
  const totalTokens = steps.reduce((sum, s) => sum + (s.tokensUsed ?? 0), 0);
  const totalDuration = steps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);

  const hasMetrics = totalTokens > 0 || totalCost > 0;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} marginTop={1}>
      {/* Run metrics */}
      {hasMetrics && (
        <Box gap={3} marginBottom={1}>
          <Box gap={1}>
            <Text color="gray">Cost</Text>
            <Text color="yellow" bold>
              ${totalCost.toFixed(4)}
            </Text>
          </Box>
          <Box gap={1}>
            <Text color="gray">Tokens</Text>
            <Text color="white">{totalTokens.toLocaleString()}</Text>
          </Box>
          <Box gap={1}>
            <Text color="gray">Time</Text>
            <Text color="white">
              {totalDuration >= 1000
                ? `${(totalDuration / 1000).toFixed(1)}s`
                : `${String(totalDuration)}ms`}
            </Text>
          </Box>
        </Box>
      )}

      {/* Keybindings */}
      <Box gap={3}>
        {keybindings.map(({ key, label }) => (
          <Box key={key} gap={1}>
            <Text color="cyan" bold>
              [{key}]
            </Text>
            <Text color="gray">{label}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
