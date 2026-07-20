import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import gradient from 'gradient-string';
import path from 'node:path';
import { useSystemMetrics } from '../hooks/useSystemMetrics.js';
import packageJson from '../../../package.json' assert { type: 'json' };
import type { CompanionState } from '../theme.js';
import { GOLD, forgeronLevel } from '../theme.js';
import { listRuns } from '../../storage/index.js';

const { version } = packageJson;
const BRAND = gradient(['#5C3317', '#B87333', '#C8A415'])("⚒ Lun'Ira");

function xpBar(current: number, total: number): string {
  const filled = total > 0 ? Math.round((current / total) * 8) : 0;
  return '█'.repeat(filled) + '░'.repeat(8 - filled);
}

const WEATHER: Record<CompanionState, string> = {
  idle: '❄  Cold forge',
  thinking: '☁  Warm forge · 318°',
  forging: '>> Forge blazing · 540°',
  error: '✖  Forge dark',
  done: '✦  Artifact forged',
};

interface TitleBarProps {
  companionState: CompanionState;
  currentStep?: number;
  totalSteps?: number;
  runTokens?: number;
  runCostUsd?: number;
}

export function TitleBar({
  companionState,
  currentStep,
  totalSteps,
  runTokens,
  runCostUsd,
}: TitleBarProps) {
  const { cpuUsagePercent, memUsedMb, memTotalMb } = useSystemMetrics();
  const [level, setLevel] = useState(1);

  useEffect(() => {
    void listRuns().then((runs) => {
      setLevel(forgeronLevel(runs.length));
    });
  }, []);
  const projectName = path.basename(process.cwd());
  const cpuColor = cpuUsagePercent > 80 ? 'red' : cpuUsagePercent > 50 ? 'yellow' : 'green';
  const memUsedGb = (memUsedMb / 1024).toFixed(1);
  const memTotalGb = (memTotalMb / 1024).toFixed(1);

  const etage =
    currentStep !== undefined && totalSteps !== undefined
      ? `Floor ${String(currentStep)}/${String(totalSteps)}`
      : undefined;

  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box gap={2}>
        <Text>{BRAND}</Text>
        <Text color="gray">·</Text>
        <Text color="gray" dimColor>
          Dungeon:
        </Text>
        <Text color="white" bold>
          {projectName}
        </Text>
        {etage !== undefined && (
          <>
            <Text color="gray">·</Text>
            <Text color="gray" dimColor>
              {etage}
            </Text>
          </>
        )}
        {currentStep !== undefined && totalSteps !== undefined && (
          <>
            <Text color="gray">·</Text>
            <Text color="gray" dimColor>
              XP{' '}
            </Text>
            <Text color={GOLD}>{xpBar(currentStep, totalSteps)}</Text>
          </>
        )}
        <Text color="gray">·</Text>
        <Text color="gray" dimColor>
          {WEATHER[companionState]}
        </Text>
      </Box>
      <Box gap={2}>
        <Box gap={0}>
          <Text color="gray" dimColor>
            Blacksmith Lv.
          </Text>
          <Text color={GOLD}>{String(level)}</Text>
        </Box>
        {runTokens !== undefined && runTokens > 0 && (
          <Box gap={1}>
            <Text color="gray" dimColor>
              tok
            </Text>
            <Text color={GOLD}>
              {runTokens >= 1000 ? `${(runTokens / 1000).toFixed(1)}k` : String(runTokens)}
            </Text>
            {runCostUsd !== undefined && runCostUsd > 0 && (
              <Text color="gray" dimColor>
                ${runCostUsd < 0.01 ? (runCostUsd * 1000).toFixed(2) + 'm' : runCostUsd.toFixed(3)}
              </Text>
            )}
          </Box>
        )}
        <Text color="gray" dimColor>
          v{version}
        </Text>
        <Text color="gray">
          CPU{' '}
          <Text color={cpuColor} bold>
            {cpuUsagePercent}%
          </Text>
        </Text>
        <Text color="gray">
          RAM <Text color="white">{memUsedGb}</Text>
          <Text color="gray">/{memTotalGb}GB</Text>
        </Text>
      </Box>
    </Box>
  );
}
