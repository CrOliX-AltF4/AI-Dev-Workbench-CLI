import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import * as orchestrator from '../../orchestrator/index.js';
import { runDemoPipeline } from '../../pipeline/demo.js';
import { Separator } from '../components/Separator.js';
import type { OnStepsChange } from '../workspace/types.js';
import { StepRow } from '../components/StepRow.js';
import { Footer } from '../components/Footer.js';
import { MODEL_CATALOG } from '../../models/catalog.js';
import { buildDefaultSteps } from '../../pipeline/steps.js';
import type { PipelineRun, PipelineStep, AgentRole } from '../../types/index.js';
import type { PipelineEvent } from '../../types/events.js';
import type { PlannerOutput } from '../../agents/types.js';
import {
  AGENT_CLASS_SHORT,
  AGENT_FLAVOR_TEXT,
  ROLE_TASK_LABELS,
  STATUS_ICONS,
  STATUS_COLORS,
  SPINNER_FRAMES,
  COPPER,
  GOLD,
} from '../theme.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateIntent(s: string): string {
  return s.length > 50 ? s.slice(0, 49) + '…' : s;
}

// ─── StepSummaryRow ───────────────────────────────────────────────────────────

function StepSummaryRow({ step }: { step: PipelineStep }) {
  const classLabel = AGENT_CLASS_SHORT[step.role].trim();
  const icon = STATUS_ICONS[step.status];
  const color = STATUS_COLORS[step.status];
  const flavors = AGENT_FLAVOR_TEXT[step.role];
  const flavor = flavors[step.id.charCodeAt(0) % flavors.length] ?? flavors[0];
  const cost = step.costUsd !== undefined ? ` · $${step.costUsd.toFixed(3)}` : '';
  const tok =
    step.tokensUsed !== undefined
      ? ` · ${step.tokensUsed >= 1000 ? `${(step.tokensUsed / 1000).toFixed(1)}k` : String(step.tokensUsed)} tok`
      : '';

  return (
    <Box flexDirection="column" gap={0}>
      <Box gap={1}>
        <Text color={color}>{icon}</Text>
        <Text color={color}>[{classLabel}]</Text>
        <Text color="white">{ROLE_TASK_LABELS[step.role]}</Text>
        <Text color="gray" dimColor>
          {cost}
          {tok}
        </Text>
      </Box>
      <Box paddingLeft={3}>
        <Text color="gray" dimColor>
          {flavor}
        </Text>
      </Box>
    </Box>
  );
}

// ─── Forge fire frames ────────────────────────────────────────────────────────

const FIRE_FRAMES: ReadonlyArray<{ chars: string; color: string }> = [
  { chars: '▲ ▲▲ ▲▲▲ ▲ ▲▲', color: 'yellow' },
  { chars: '▲▲ ▲▲▲ ▲ ▲▲▲ ', color: COPPER },
  { chars: ' ▲▲▲ ▲ ▲▲▲ ▲▲', color: GOLD },
  { chars: '▲▲▲ ▲▲ ▲▲▲ ▲ ', color: 'yellow' },
  { chars: ' ▲ ▲▲▲▲ ▲ ▲▲▲', color: COPPER },
  { chars: '▲▲▲ ▲ ▲▲▲▲ ▲ ', color: GOLD },
];

// ─── ActiveStepPanel ──────────────────────────────────────────────────────────

function ActiveStepPanel({ step }: { step: PipelineStep }) {
  const [frame, setFrame] = useState(0);
  const classLabel = AGENT_CLASS_SHORT[step.role].trim();

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % FIRE_FRAMES.length);
    }, 160);
    return () => {
      clearInterval(id);
    };
  }, []);

  const fire = FIRE_FRAMES[frame % FIRE_FRAMES.length];
  const spinnerFrame = SPINNER_FRAMES[frame % SPINNER_FRAMES.length] ?? '⠋';

  return (
    <Box borderStyle="single" borderColor="yellow" flexDirection="column" paddingX={1} marginY={0}>
      <Box justifyContent="space-between">
        <Text color={COPPER} bold>
          [ {classLabel} ]
        </Text>
        {fire !== undefined && <Text color={fire.color}>{fire.chars}</Text>}
      </Box>
      <Box gap={1}>
        <Text color="yellow">{spinnerFrame}</Text>
        <Text color="yellow">{ROLE_TASK_LABELS[step.role]}…</Text>
      </Box>
    </Box>
  );
}

// ─── Model picker ─────────────────────────────────────────────────────────────

interface ModelPickerProps {
  role: AgentRole;
  currentModelId: string;
  onSelect: (modelId: string) => void;
  onCancel: () => void;
}

function ModelPicker({ role, currentModelId, onSelect, onCancel }: ModelPickerProps) {
  const [index, setIndex] = useState(
    Math.max(
      0,
      MODEL_CATALOG.findIndex((m) => m.id === currentModelId),
    ),
  );

  useInput((_input, key) => {
    if (key.upArrow) setIndex((i) => Math.max(0, i - 1));
    if (key.downArrow) setIndex((i) => Math.min(MODEL_CATALOG.length - 1, i + 1));
    if (key.return) onSelect(MODEL_CATALOG[index]?.id ?? currentModelId);
    if (key.escape) onCancel();
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
      marginTop={1}
      gap={1}
    >
      <Text color="yellow" bold>
        Change model — <Text color="white">{role.toUpperCase()}</Text>
      </Text>

      {MODEL_CATALOG.map((model, i) => {
        const isSelected = i === index;
        return (
          <Box key={model.id} gap={2}>
            <Text color="yellow">{isSelected ? '›' : ' '}</Text>
            <Text color={isSelected ? 'white' : 'gray'} bold={isSelected}>
              {model.displayName}
            </Text>
            <Text color="gray">[{model.provider}]</Text>
            <Text color="gray" dimColor>
              ~${(model.costPerInputToken * 1_000_000).toFixed(2)}/M tok in
            </Text>
          </Box>
        );
      })}

      <Box gap={3} marginTop={1}>
        <Text color="gray">
          <Text color="yellow">[↑↓]</Text> navigate
        </Text>
        <Text color="gray">
          <Text color="yellow">[↵]</Text> confirm
        </Text>
        <Text color="gray">
          <Text color="yellow">[Esc]</Text> cancel
        </Text>
      </Box>
    </Box>
  );
}

// ─── PlanReviewPanel ──────────────────────────────────────────────────────────

interface PlanReviewSummary {
  architecture: string;
  tasks: number;
  estimatedFiles: string[];
  risks: string[];
}

function PlanReviewPanel({
  summary,
  onDecision,
}: {
  summary: PlanReviewSummary;
  onDecision: (v: 'approve' | 'reject') => void;
}) {
  useInput((input, key) => {
    if (key.return || input === 'y' || input === 'Y') onDecision('approve');
    if (input === 'r' || input === 'R' || key.escape) onDecision('reject');
  });

  const fileList = summary.estimatedFiles.slice(0, 5).join(', ');
  const fileOverflow =
    summary.estimatedFiles.length > 5 ? ` +${String(summary.estimatedFiles.length - 5)} more` : '';

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
      marginTop={1}
      gap={1}
    >
      <Text color="yellow" bold>
        [ PLANNER ] — Review plan before Dev runs
      </Text>
      <Text color="white">{summary.architecture}</Text>
      <Text color="gray">
        Tasks: {String(summary.tasks)} · Files: {fileList}
        {fileOverflow}
      </Text>
      {summary.risks.length > 0 && <Text color={COPPER}>Risks: {summary.risks.join(' · ')}</Text>}
      <Box gap={3} marginTop={1}>
        <Text>
          <Text color="yellow">[↵/y]</Text> approve → launch Dev
        </Text>
        <Text>
          <Text color="yellow">[r]</Text> reject → abort
        </Text>
      </Box>
    </Box>
  );
}

// ─── Pipeline screen ──────────────────────────────────────────────────────────

interface PipelineScreenProps {
  intent: string;
  skipRoles?: ReadonlySet<AgentRole>;
  onComplete?: (run: PipelineRun) => void;
  onBack?: () => void;
  activeSkillIds?: string[];
  activePluginIds?: string[];
  onStepsChange?: OnStepsChange;
  isDemo?: boolean;
}

const KEYBINDINGS_IDLE = [
  { key: '↑↓', label: 'navigate' },
  { key: 'm', label: 'swap rune' },
  { key: '↵', label: 'fire the forge' },
  { key: 'q', label: 'back' },
];

const KEYBINDINGS_RUNNING = [{ key: 'q', label: 'abort' }];

export function PipelineScreen({
  intent,
  skipRoles,
  onComplete,
  onBack,
  activeSkillIds,
  activePluginIds,
  onStepsChange,
  isDemo = false,
}: PipelineScreenProps) {
  const app = useApp();
  const [steps, setSteps] = useState<PipelineStep[]>(() => buildDefaultSteps(skipRoles));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [currentIteration, setCurrentIteration] = useState(1);
  const [maxIterations, setMaxIterations] = useState(2);
  const [initiative, setInitiative] = useState<number | undefined>(undefined);
  const [pendingReview, setPendingReview] = useState<{
    resolve: (v: 'approve' | 'reject') => void;
    summary: PlanReviewSummary;
  } | null>(null);
  const abortCtrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    onStepsChange?.(steps);
  }, [steps]);

  const onPlanReview = (plan: PlannerOutput): Promise<'approve' | 'reject'> =>
    new Promise((resolve) => {
      setPendingReview({
        resolve,
        summary: {
          architecture: plan.architecture,
          tasks: plan.tasks.length,
          estimatedFiles: plan.estimatedFiles,
          risks: plan.risks,
        },
      });
    });

  useInput((input, key) => {
    if (showPicker) return;
    if (pendingReview !== null) return; // handled inside PlanReviewPanel

    if (isRunning) {
      if (cancelRequested) {
        if (input === 'q') {
          abortCtrlRef.current?.abort();
          setCancelRequested(false);
        }
        if (key.escape) setCancelRequested(false);
      } else {
        if (input === 'q') setCancelRequested(true);
      }
      return;
    }

    if (input === 'q') {
      if (onBack) onBack();
      else app.exit();
    }
    if (key.upArrow) setFocusedIndex((i) => Math.max(0, i - 1));
    if (key.downArrow) setFocusedIndex((i) => Math.min(steps.length - 1, i + 1));
    if (input === 'm') setShowPicker(true);
    if (key.return) {
      setInitiative(Math.floor(Math.random() * 20) + 1);
      setIsRunning(true);
      const ctrl = new AbortController();
      abortCtrlRef.current = ctrl;
      const override: Parameters<typeof orchestrator.run>[4] = {
        ...(activeSkillIds && activeSkillIds.length > 0 ? { skillIds: activeSkillIds } : {}),
        ...(activePluginIds && activePluginIds.length > 0 ? { pluginIds: activePluginIds } : {}),
        onPlanReview,
      };
      const onUpdate = (updatedStep: PipelineStep) => {
        setSteps((prev) => prev.map((s) => (s.id === updatedStep.id ? updatedStep : s)));
      };
      const onEvent = (event: PipelineEvent) => {
        if (event.type === 'iteration_started') {
          setCurrentIteration(event.iteration);
          setMaxIterations(event.maxIterations);
        }
      };

      const runner = isDemo
        ? runDemoPipeline(intent, steps, onUpdate, onEvent)
        : orchestrator.run(intent, steps, onUpdate, undefined, override, onEvent, ctrl.signal);

      void runner
        .then((run) => {
          onComplete?.(run);
        })
        .finally(() => {
          setIsRunning(false);
          setCancelRequested(false);
          setPendingReview(null);
          abortCtrlRef.current = null;
        });
    }
  });

  const handleModelSelect = (modelId: string) => {
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i !== focusedIndex) return s;
        const model = MODEL_CATALOG.find((m) => m.id === modelId);
        return { ...s, modelId, ...(model ? { provider: model.provider } : {}) };
      }),
    );
    setShowPicker(false);
  };

  const focusedStep = steps[focusedIndex];

  return (
    <Box flexDirection="column">
      <Separator />

      <Box flexDirection="column" paddingX={2} paddingY={1} gap={1}>
        {/* Intent */}
        <Box gap={1}>
          <Text color="gray" dimColor>
            Incantation:
          </Text>
          <Text color="white" bold>
            "{intent}"
          </Text>
        </Box>

        {/* Steps */}
        {isRunning ? (
          <Box flexDirection="column" marginTop={1} gap={1}>
            {/* Header */}
            <Box gap={2}>
              <Text color="yellow" bold>
                ◆ "{truncateIntent(intent)}"
              </Text>
              {initiative !== undefined && (
                <Text color="gray" dimColor>
                  ⚄ Init: {String(initiative)}
                </Text>
              )}
            </Box>

            {/* Steps */}
            {steps
              .filter((s) => s.status !== 'skipped')
              .map((step) => {
                if (step.status === 'completed' || step.status === 'failed') {
                  return <StepSummaryRow key={step.id} step={step} />;
                }
                if (step.status === 'running') {
                  return <ActiveStepPanel key={step.id} step={step} />;
                }
                // pending
                return (
                  <Box key={step.id} gap={1}>
                    <Text color="gray" dimColor>
                      {STATUS_ICONS[step.status]}
                    </Text>
                    <Text color="gray" dimColor>
                      [{AGENT_CLASS_SHORT[step.role].trim()}] {ROLE_TASK_LABELS[step.role]}
                    </Text>
                  </Box>
                );
              })}
          </Box>
        ) : (
          <Box flexDirection="column" marginTop={1} gap={0}>
            {steps.map((step, i) => (
              <StepRow
                key={step.id}
                step={step}
                focused={i === focusedIndex}
                stepNumber={i + 1}
                totalSteps={steps.length}
                {...(step.role === 'dev' || step.role === 'qa'
                  ? { iteration: currentIteration, maxIterations }
                  : {})}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Model picker overlay */}
      {showPicker && focusedStep && (
        <Box paddingX={1}>
          <ModelPicker
            role={focusedStep.role}
            currentModelId={focusedStep.modelId ?? ''}
            onSelect={handleModelSelect}
            onCancel={() => {
              setShowPicker(false);
            }}
          />
        </Box>
      )}

      {/* Plan review overlay — shown when Planner completes and awaits human approval */}
      {pendingReview !== null && (
        <Box paddingX={1}>
          <PlanReviewPanel
            summary={pendingReview.summary}
            onDecision={(v) => {
              const resolve = pendingReview.resolve;
              setPendingReview(null);
              resolve(v);
            }}
          />
        </Box>
      )}

      {/* Abort confirmation overlay */}
      {cancelRequested && (
        <Box
          borderStyle="round"
          borderColor="red"
          paddingX={2}
          paddingY={1}
          marginX={1}
          marginTop={1}
        >
          <Text color="red" bold>
            Abort after current step?{'  '}
          </Text>
          <Text color="white">
            <Text color="red">[q]</Text> confirm{'  '}
            <Text color="gray">[Esc]</Text> cancel
          </Text>
        </Box>
      )}

      <Footer steps={steps} keybindings={isRunning ? KEYBINDINGS_RUNNING : KEYBINDINGS_IDLE} />
    </Box>
  );
}
