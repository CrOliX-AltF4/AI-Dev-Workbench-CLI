import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { Header } from '../components/Header.js';
import { STATUS_COLORS } from '../theme.js';
import type { PipelineRun, AgentRole } from '../../types/index.js';
import type { DevOutput, POOutput, PlannerOutput, QAOutput, QAIssue } from '../../agents/types.js';

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

// ─── Artifact rendering ───────────────────────────────────────────────────────

function renderRequirements(po: POOutput): string {
  const lines: string[] = ['# Requirements', ''];

  lines.push('## Goal', po.clarifiedGoal, '');

  if (po.requirements.length > 0) {
    lines.push('## Requirements');
    po.requirements.forEach((r) => lines.push(`- ${r}`));
    lines.push('');
  }

  if (po.acceptanceCriteria.length > 0) {
    lines.push('## Acceptance Criteria');
    po.acceptanceCriteria.forEach((a) => lines.push(`- ${a}`));
    lines.push('');
  }

  if (po.constraints.length > 0) {
    lines.push('## Constraints');
    po.constraints.forEach((c) => lines.push(`- ${c}`));
    lines.push('');
  }

  if (po.assumptions.length > 0) {
    lines.push('## Assumptions');
    po.assumptions.forEach((a) => lines.push(`- ${a}`));
    lines.push('');
  }

  lines.push(`## Complexity`, po.complexity);
  return lines.join('\n');
}

function renderPlan(planner: PlannerOutput): string {
  const lines: string[] = ['# Architecture Plan', ''];

  lines.push('## Overview', planner.architecture, '');

  if (planner.techStack.length > 0) {
    lines.push('## Tech Stack');
    planner.techStack.forEach((t) => lines.push(`- ${t}`));
    lines.push('');
  }

  if (planner.tasks.length > 0) {
    lines.push('## Tasks');
    planner.tasks.forEach((t, i) => {
      const deps = t.dependsOn.length > 0 ? ` (depends: ${t.dependsOn.join(', ')})` : '';
      lines.push(`${String(i + 1)}. [${t.id}] ${t.description}${deps}`);
    });
    lines.push('');
  }

  if (planner.estimatedFiles.length > 0) {
    lines.push('## Estimated Files');
    planner.estimatedFiles.forEach((f) => lines.push(`- ${f}`));
    lines.push('');
  }

  if (planner.risks.length > 0) {
    lines.push('## Risks');
    planner.risks.forEach((r) => lines.push(`- ${r}`));
    lines.push('');
  }

  return lines.join('\n');
}

// ─── File save ────────────────────────────────────────────────────────────────

async function saveArtifacts(
  run: PipelineRun,
  dev: DevOutput,
  po: POOutput | null,
  planner: PlannerOutput | null,
): Promise<string> {
  const outputDir = join(process.cwd(), 'output', run.id);

  // Code files from Dev agent
  for (const file of dev.files) {
    const dest = join(outputDir, file.path);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, file.content, 'utf8');
  }

  await mkdir(outputDir, { recursive: true });

  // Markdown artifacts
  if (po) {
    await writeFile(join(outputDir, 'requirements.md'), renderRequirements(po), 'utf8');
  }
  if (planner) {
    await writeFile(join(outputDir, 'plan.md'), renderPlan(planner), 'utf8');
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
  const po = parseStepOutput(run, 'po') as POOutput | null;
  const planner = parseStepOutput(run, 'planner') as PlannerOutput | null;
  const criticalIssues = qa?.issues.filter((i) => i.severity === 'critical') ?? [];
  const majorIssues = qa?.issues.filter((i) => i.severity === 'major') ?? [];

  useInput((input) => {
    if (input === 'q') app.exit();
    if (input === 'r') onNewPipeline();
    if (input === 's' && dev && !saving && !savedPath) {
      setSaving(true);
      void saveArtifacts(run, dev, po, planner)
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
        {savedPath && (
          <Box flexDirection="column" gap={0}>
            <Text color="green">✓ Saved to {savedPath}</Text>
            <Text color="gray" dimColor>
              code files{po ? ' · requirements.md' : ''}
              {planner ? ' · plan.md' : ''}
            </Text>
          </Box>
        )}
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
