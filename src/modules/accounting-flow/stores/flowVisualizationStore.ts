/**
 * Flow Visualization Store
 *
 * Manages the state for the 7-stage accounting engine visualization
 */

import { createSignal, createMemo } from 'solid-js';

export type PipelineStage = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type DataSourceType = 'stripe' | 'shopify' | 'yabaexpress' | 'manual';
export type PlaybackSpeed = 0.5 | 1 | 2;

export interface FlowState {
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  selectedSource: DataSourceType;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  stageData: Record<PipelineStage, any>;
}

// Stage names for display
export const STAGE_NAMES: Record<PipelineStage, string> = {
  1: 'Data Ingestion',
  2: 'Adapter Transform',
  3: 'Invoice Conversion',
  4: 'Account Mapping',
  5: 'Rules Engine',
  6: 'Entry Book Generation',
  7: 'Learning & Persistence'
};

export const STAGE_DESCRIPTIONS: Record<PipelineStage, string> = {
  1: 'Raw JSON data from external sources',
  2: 'Field mapping and pattern detection',
  3: 'StandardTransaction to Invoice conversion',
  4: 'Decision tree for GL account assignment',
  5: 'Rule evaluation and condition matching',
  6: 'Debit/Credit ledger entry generation',
  7: 'Feedback metrics and learning updates'
};

// Create reactive signals
const [currentStage, setCurrentStage] = createSignal<PipelineStage>(1);
const [completedStages, setCompletedStages] = createSignal<PipelineStage[]>([]);
const [selectedSource, setSelectedSource] = createSignal<DataSourceType>('stripe');
const [isPlaying, setIsPlaying] = createSignal(false);
const [playbackSpeed, setPlaybackSpeed] = createSignal<PlaybackSpeed>(1);
const [stageData, setStageData] = createSignal<Record<number, any>>({});

// Playback interval reference
let playbackInterval: ReturnType<typeof setInterval> | null = null;

// Derived state
const isStageCompleted = (stage: PipelineStage) => completedStages().includes(stage);
const isCurrentStage = (stage: PipelineStage) => currentStage() === stage;
const canGoNext = () => currentStage() < 7;
const canGoPrev = () => currentStage() > 1;

// Actions
const goToStage = (stage: PipelineStage) => {
  // Mark previous stages as completed when jumping forward
  if (stage > currentStage()) {
    const newCompleted = [...completedStages()];
    for (let s = 1; s < stage; s++) {
      if (!newCompleted.includes(s as PipelineStage)) {
        newCompleted.push(s as PipelineStage);
      }
    }
    setCompletedStages(newCompleted);
  }
  setCurrentStage(stage);
};

const nextStage = () => {
  if (canGoNext()) {
    const current = currentStage();
    if (!completedStages().includes(current)) {
      setCompletedStages([...completedStages(), current]);
    }
    setCurrentStage((current + 1) as PipelineStage);
  }
};

const prevStage = () => {
  if (canGoPrev()) {
    setCurrentStage((currentStage() - 1) as PipelineStage);
  }
};

const play = () => {
  if (playbackInterval) return;

  setIsPlaying(true);
  const baseInterval = 2000; // 2 seconds per stage at 1x speed
  const interval = baseInterval / playbackSpeed();

  playbackInterval = setInterval(() => {
    if (canGoNext()) {
      nextStage();
    } else {
      pause();
    }
  }, interval);
};

const pause = () => {
  setIsPlaying(false);
  if (playbackInterval) {
    clearInterval(playbackInterval);
    playbackInterval = null;
  }
};

const togglePlayback = () => {
  if (isPlaying()) {
    pause();
  } else {
    play();
  }
};

const reset = () => {
  pause();
  setCurrentStage(1);
  setCompletedStages([]);
  setStageData({});
};

const changeSource = (source: DataSourceType) => {
  pause();
  setSelectedSource(source);
  reset();
};

const changeSpeed = (speed: PlaybackSpeed) => {
  const wasPlaying = isPlaying();
  if (wasPlaying) {
    pause();
  }
  setPlaybackSpeed(speed);
  if (wasPlaying) {
    play();
  }
};

const updateStageData = (stage: PipelineStage, data: any) => {
  setStageData(prev => ({
    ...prev,
    [stage]: data
  }));
};

const getStageData = (stage: PipelineStage) => stageData()[stage];

// Export store
export const flowVisualizationStore = {
  // State (getters)
  currentStage,
  completedStages,
  selectedSource,
  isPlaying,
  playbackSpeed,
  stageData,

  // Derived state
  isStageCompleted,
  isCurrentStage,
  canGoNext,
  canGoPrev,

  // Constants
  STAGE_NAMES,
  STAGE_DESCRIPTIONS,

  // Actions
  goToStage,
  nextStage,
  prevStage,
  play,
  pause,
  togglePlayback,
  reset,
  changeSource,
  changeSpeed,
  updateStageData,
  getStageData
};

export default flowVisualizationStore;
