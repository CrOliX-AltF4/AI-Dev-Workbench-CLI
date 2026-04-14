import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Header } from '../components/Header.js';
import { StepRow } from '../components/StepRow.js';
import { Footer } from '../components/Footer.js';
import { MODEL_CATALOG, getDefaultModel } from '../../models/catalog.js';
import type { PipelineStep, AgentRole, TaskType } from '../../types/index.js';

// ─── Initial pipeline state ───────────────────────────────────────────────────

const AGENT_SEQUENCE: Array<{ role: AgentRole; taskType: TaskType }> = [
  { role: 'po', taskType: 'clarification' },
  { role: 'planner', taskType: 'architecture' },
  { role: 'dev', taskType: 'code' },
  { role: 'qa', taskType: 'analysis' },
];

function buildInitialSteps(): PipelineStep[] {
  return AGENT_SEQUENCE.map(({ role, taskType }) => {
    const model = getDefaultModel(role);
    return {
      id: role,
      role,
      taskType,
      status: 'pending',
      modelId: model.id,
      provider: model.provider,
    };
  });
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
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      marginTop={1}
      gap={1}
    >
      <Text color="cyan" bold>
        Change model — <Text color="white">{role.toUpperCase()}</Text>
      </Text>

      {MODEL_CATALOG.map((model, i) => {
        const isSelected = i === index;
        return (
          <Box key={model.id} gap={2}>
            <Text color="cyan">{isSelected ? '›' : ' '}</Text>
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
          <Text color="cyan">[↑↓]</Text> navigate
        </Text>
        <Text color="gray">
          <Text color="cyan">[↵]</Text> confirm
        </Text>
        <Text color="gray">
          <Text color="cyan">[Esc]</Text> cancel
        </Text>
      </Box>
    </Box>
  );
}

// ─── Pipeline screen ──────────────────────────────────────────────────────────

interface PipelineScreenProps {
  intent: string;
}

const KEYBINDINGS = [
  { key: '↑↓', label: 'navigate' },
  { key: 'm', label: 'change model' },
  { key: '↵', label: 'start (step 6)' },
  { key: 'q', label: 'quit' },
];

export function PipelineScreen({ intent }: PipelineScreenProps) {
  const app = useApp();
  const [steps, setSteps] = useState<PipelineStep[]>(buildInitialSteps);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showPicker, setShowPicker] = useState(false);

  useInput((input, key) => {
    if (showPicker) return; // handled inside ModelPicker

    if (input === 'q') app.exit();
    if (key.upArrow) setFocusedIndex((i) => Math.max(0, i - 1));
    if (key.downArrow) setFocusedIndex((i) => Math.min(steps.length - 1, i + 1));
    if (input === 'm') setShowPicker(true);
    if (key.return) {
      // TODO: Step 6 — trigger orchestrator.run(intent, steps)
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
    <Box flexDirection="column" padding={1} gap={1}>
      <Header />

      <Box flexDirection="column" paddingX={1} gap={1}>
        {/* Intent */}
        <Box gap={1}>
          <Text color="gray">Pipeline:</Text>
          <Text color="white" bold>
            "{intent}"
          </Text>
        </Box>

        {/* Steps */}
        <Box flexDirection="column" marginTop={1} gap={0}>
          {steps.map((step, i) => (
            <StepRow key={step.id} step={step} focused={i === focusedIndex} />
          ))}
        </Box>
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

      <Footer steps={steps} keybindings={KEYBINDINGS} />
    </Box>
  );
}
