export type Chapter1StoryPart = 1 | 2;

export type Chapter1StoryEventType =
  | "part1-complete"
  | "wave-ready"
  | "boss-ready"
  | "boss-phase2-dialogue-complete"
  | "story-finished";

export interface Chapter1StoryEvent {
  type: Chapter1StoryEventType;
  detail?: Record<string, unknown>;
}

export type Chapter1StoryCommand = "wavesCleared" | "showPhase2Dialogue" | "bossCleared";

export interface Chapter1StoryRuntimeHandle {
  invoke(command: Chapter1StoryCommand): void;
  dispose(): void;
}
