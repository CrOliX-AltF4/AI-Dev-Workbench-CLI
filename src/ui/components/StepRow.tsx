import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { PipelineStep } from '../../types/index.js';
import { STATUS_ICONS, STATUS_COLORS, PROVIDER_COLORS, ROLE_LABELS } from '../theme.js';
import { getModelById } from '../../models/catalog.js';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function Spinner() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => {
      clearInterval(t);
    };
  }, []);
  return <Text color="cyan">{SPINNER_FRAMES[frame]}</Text>;
}

interface StepRowProps {
  step: PipelineStep;
  focused: boolean;
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${String(ms)}ms`;
}

function formatCost(usd: number): string {
  return usd < 0.001 ? `$${(usd * 1000).toFixed(3)}m` : `$${usd.toFixed(4)}`;
}

export function StepRow({ step, focused }: StepRowProps) {
  const iconColor = STATUS_COLORS[step.status];
  const model = step.modelId ? getModelById(step.modelId) : undefined;
  const providerColor = model ? PROVIDER_COLORS[model.provider] : 'gray';

  return (
    <Box gap={1}>
      {/* Focus indicator */}
      <Text color="cyan">{focused ? '▶' : ' '}</Text>

      {/* Status icon / spinner */}
      <Box width={2}>
        {step.status === 'running' ? (
          <Spinner />
        ) : (
          <Text color={iconColor}>{STATUS_ICONS[step.status]}</Text>
        )}
      </Box>

      {/* Role */}
      <Text bold color={step.status === 'pending' ? 'gray' : 'white'}>
        {ROLE_LABELS[step.role]}
      </Text>

      {/* Model badge */}
      <Box width={22}>
        {model ? (
          <Text color={providerColor}>[{model.displayName}]</Text>
        ) : (
          <Text color="gray">[no model]</Text>
        )}
      </Box>

      {/* Status message */}
      <Text color={iconColor} dimColor={step.status === 'pending'}>
        {step.status === 'pending' && 'Waiting'}
        {step.status === 'running' && 'Running...'}
        {step.status === 'completed' && 'Done'}
        {step.status === 'failed' && (step.error ?? 'Failed')}
        {step.status === 'skipped' && 'Skipped'}
      </Text>

      {/* Metrics */}
      {step.durationMs !== undefined && (
        <Text color="gray"> {formatDuration(step.durationMs)}</Text>
      )}
      {step.tokensUsed !== undefined && (
        <Text color="gray"> {step.tokensUsed.toLocaleString()} tok</Text>
      )}
      {step.costUsd !== undefined && <Text color="gray"> {formatCost(step.costUsd)}</Text>}
    </Box>
  );
}
