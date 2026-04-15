import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { Header } from '../components/Header.js';
import { STATUS_COLORS } from '../theme.js';
import type { PipelineRun, AgentRole } from '../../types/index.js';
import type { DevOutput, QAOutput, QAIssue } from '../../agents/types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseStepOutput(run: PipelineRun, role: AgentRole): unknown {
  const step = run.steps.find((s) => s.role === role && s.status === 'completed');
  if (!step?.output) return null;
  try {
    return JSON.parse(step.output);
  } catch {
    return null;
  }
}

function formatCost(usd: number): string {
  return usd < 0.01 ? `$${(usd * 1000).toFixed(3)}m` : `$${usd.toFixed(4)}`;
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${String(ms)}ms`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VerdictBadge({ verdict, score }: { verdict: QAOutput['verdict']; score: number }) {
  const color = verdict === 'pass' ? 'green' : verdict === 'partial' ? 'yellow' : 'red';
  const icon = verdict === 'pass' ? '✓' : verdict === 'partial' ? '~' : '✗';
  return (
    <Box gap={2}>
      <Text color={color} bold>
        {icon} {verdict.toUpperCase()}
      </Text>
      <Text color="gray">
        score <Text color="white">{score}/100</Text>
      </Text>
    </Box>
  );
}

function IssueRow({ issue }: { issue: QAIssue }) {
  const color =
    issue.severity === 'critical' ? 'red' : issue.severity === 'major' ? 'yellow' : 'gray';
  const tag =
    issue.severity === 'critical' ? '[CRIT]' : issue.severity === 'major' ? '[MAJOR]' : '[minor]';
  return (
    <Box gap={1}>
      <Text color={color}>{tag}</Text>
      <Text color="white">{issue.description}</Text>
      {issue.file && <Text color="gray">({issue.file})</Text>}
    </Box>
  );
}

// ─── File save ────────────────────────────────────────────────────────────────

async function saveFilesToDisk(files: DevOutput['files'], runId: string): Promise<string> {
  const outputDir = join(process.cwd(), 'output', runId);
  for (const file of files) {
    const dest = join(outputDir, file.path);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, file.content, 'utf8');
  }
  return outputDir;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

interface ResultsScreenProps {
  run: PipelineRun;
  onNewPipeline: () => void;
}

export function ResultsScreen({ run, onNewPipeline }: ResultsScreenProps) {
  const app = useApp();
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const qa = parseStepOutput(run, 'qa') as QAOutput | null;
  const dev = parseStepOutput(run, 'dev') as DevOutput | null;
  const criticalIssues = qa?.issues.filter((i) => i.severity === 'critical') ?? [];
  const majorIssues = qa?.issues.filter((i) => i.severity === 'major') ?? [];

  useInput((input) => {
    if (input === 'q') app.exit();
    if (input === 'r') onNewPipeline();
    if (input === 's' && dev && !saving && !savedPath) {
      setSaving(true);
      void saveFilesToDisk(dev.files, run.id)
        .then((path) => {
          setSavedPath(path);
        })
        .finally(() => {
          setSaving(false);
        });
    }
  });

  const runFailed = run.status === 'failed';

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Header />

      <Box flexDirection="column" paddingX={1} gap={1}>
        {/* Intent */}
        <Box gap={1}>
          <Text color="gray">{runFailed ? 'Failed:' : 'Completed:'}</Text>
          <Text color="white" bold>
            "{run.intent}"
          </Text>
        </Box>

        {/* QA verdict */}
        {qa ? (
          <Box flexDirection="column" gap={0} marginTop={1}>
            <Text color="gray" bold>
              QA verdict
            </Text>
            <VerdictBadge verdict={qa.verdict} score={qa.score} />
            {[...criticalIssues, ...majorIssues].map((issue, i) => (
              <IssueRow key={i} issue={issue} />
            ))}
            {qa.issues.length === 0 && (
              <Text color="gray" dimColor>
                No issues found
              </Text>
            )}
          </Box>
        ) : (
          <Box marginTop={1}>
            <Text color={STATUS_COLORS.failed}>QA step did not complete</Text>
          </Box>
        )}

        {/* Generated files */}
        {dev && dev.files.length > 0 && (
          <Box flexDirection="column" gap={0} marginTop={1}>
            <Text color="gray" bold>
              Generated files ({dev.files.length})
            </Text>
            {dev.files.map((file) => (
              <Box key={file.path} gap={2}>
                <Text color="cyan"> {file.path}</Text>
                <Text color="gray" dimColor>
                  {file.description}
                </Text>
              </Box>
            ))}
          </Box>
        )}

        {/* Summary */}
        <Box gap={3} marginTop={1}>
          <Text color="gray">
            Cost <Text color="white">{formatCost(run.totalCostUsd)}</Text>
          </Text>
          <Text color="gray">
            Tokens <Text color="white">{run.totalTokens.toLocaleString()}</Text>
          </Text>
          <Text color="gray">
            Time <Text color="white">{formatDuration(run.totalDurationMs)}</Text>
          </Text>
        </Box>

        {/* Save feedback */}
        {saving && <Text color="cyan">Saving files...</Text>}
        {savedPath && <Text color="green">✓ Files saved to {savedPath}</Text>}
      </Box>

      {/* Footer */}
      <Box gap={3} paddingX={1} marginTop={1}>
        {dev && !savedPath && (
          <Text color="gray">
            <Text color="cyan">[s]</Text> save files
          </Text>
        )}
        <Text color="gray">
          <Text color="cyan">[r]</Text> new pipeline
        </Text>
        <Text color="gray">
          <Text color="cyan">[q]</Text> quit
        </Text>
      </Box>
    </Box>
  );
}
