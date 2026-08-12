/**
 * 스토리 진행도 / 체크포인트 로컬 저장소
 *
 * 같은 서버 주소에 여러 클라이언트가 접속하더라도 브라우저 localStorage는
 * 각 브라우저 프로필마다 독립되어 있다. 여기에 별도의 client id를 키에 포함해
 * 챕터 클리어 기록과 중간 진행 체크포인트를 명시적으로 클라이언트 단위로 분리한다.
 */

export const STORY_CLIENT_ID_STORAGE_KEY = "starblaze_story_client_id_v1";
export const LEGACY_STORY_PROGRESS_STORAGE_KEY = "starblaze_story_progress_v1";
export const STORY_PROGRESS_STORAGE_KEY = "starblaze_story_progress_v2";
export const STORY_CHECKPOINT_STORAGE_KEY = "starblaze_story_checkpoint_v1";

export interface StoryProgress {
  version: 2;
  highestClearedChapter: number;
  clearedChapters: number[];
  updatedAt: number;
}

export interface StoryDialogueCheckpoint {
  version: 1;
  chapter: number;
  kind: "story";
  part: 1 | 2;
  segment: string;
  dialogueIndex: number;
  completionAction: string;
  savedAt: number;
}

export interface StoryWaveCheckpoint {
  version: 1;
  chapter: number;
  kind: "wave";
  waveIndex: number;
  savedAt: number;
}

export interface StoryBossCheckpoint {
  version: 1;
  chapter: number;
  kind: "boss";
  savedAt: number;
}

export type StoryCheckpoint = StoryDialogueCheckpoint | StoryWaveCheckpoint | StoryBossCheckpoint;

const EMPTY_PROGRESS: StoryProgress = {
  version: 2,
  highestClearedChapter: 0,
  clearedChapters: [],
  updatedAt: 0,
};

function createClientId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `CLIENT-${Date.now().toString(36).toUpperCase()}-${randomPart}`;
}

/** 현재 브라우저 프로필에 고정되는 스토리 클라이언트 ID를 반환한다. */
export function getStoryClientId(): string {
  if (typeof localStorage === "undefined") return "LOCAL-CLIENT";
  try {
    const existing = localStorage.getItem(STORY_CLIENT_ID_STORAGE_KEY);
    if (existing) return existing;
    const created = createClientId();
    localStorage.setItem(STORY_CLIENT_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return "LOCAL-CLIENT";
  }
}

function scopedProgressKey(): string {
  return `${STORY_PROGRESS_STORAGE_KEY}:${getStoryClientId()}`;
}

function scopedCheckpointKey(chapter: number): string {
  return `${STORY_CHECKPOINT_STORAGE_KEY}:${getStoryClientId()}:chapter:${Math.max(1, Math.floor(chapter))}`;
}

function normalizeProgress(value: Partial<StoryProgress> | null | undefined): StoryProgress {
  const cleared = Array.isArray(value?.clearedChapters)
    ? [...new Set(value.clearedChapters.filter((chapter) => Number.isInteger(chapter) && chapter > 0))].sort((a, b) => a - b)
    : [];
  const highestFromList = cleared.length > 0 ? cleared[cleared.length - 1] : 0;
  const highest = Math.max(0, Number(value?.highestClearedChapter) || 0, highestFromList);
  return {
    version: 2,
    highestClearedChapter: highest,
    clearedChapters: cleared,
    updatedAt: Number(value?.updatedAt) || 0,
  };
}

function normalizeCheckpoint(value: Partial<StoryCheckpoint> | null | undefined): StoryCheckpoint | null {
  const chapter = Math.max(1, Math.floor(Number(value?.chapter) || 0));
  const savedAt = Number(value?.savedAt) || 0;
  if (value?.kind === "story") {
    const part = value.part === 2 ? 2 : 1;
    const segment = String(value.segment || "").trim();
    if (!segment) return null;
    return {
      version: 1,
      chapter,
      kind: "story",
      part,
      segment,
      dialogueIndex: Math.max(0, Math.floor(Number(value.dialogueIndex) || 0)),
      completionAction: String(value.completionAction || "finish"),
      savedAt,
    };
  }
  if (value?.kind === "wave") {
    return {
      version: 1,
      chapter,
      kind: "wave",
      waveIndex: Math.max(0, Math.floor(Number(value.waveIndex) || 0)),
      savedAt,
    };
  }
  if (value?.kind === "boss") {
    return { version: 1, chapter, kind: "boss", savedAt };
  }
  return null;
}

export function loadStoryProgress(): StoryProgress {
  if (typeof localStorage === "undefined") return { ...EMPTY_PROGRESS };
  try {
    const scopedKey = scopedProgressKey();
    const raw = localStorage.getItem(scopedKey);
    if (raw) return normalizeProgress(JSON.parse(raw));

    // FIX13 이전에 사용하던 비스코프 키가 있으면 현재 클라이언트 저장소로 1회 마이그레이션한다.
    const legacyRaw = localStorage.getItem(LEGACY_STORY_PROGRESS_STORAGE_KEY);
    if (legacyRaw) {
      const migrated = normalizeProgress(JSON.parse(legacyRaw));
      localStorage.setItem(scopedKey, JSON.stringify(migrated));
      return migrated;
    }
    return { ...EMPTY_PROGRESS };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

export function saveStoryProgress(progress: StoryProgress): StoryProgress {
  const normalized = normalizeProgress(progress);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(scopedProgressKey(), JSON.stringify(normalized));
    } catch {
      // 저장 공간 차단 환경에서도 게임 진행 자체는 막지 않는다.
    }
  }
  return normalized;
}

export function markStoryChapterCleared(chapter: number): StoryProgress {
  const safeChapter = Math.max(1, Math.floor(chapter));
  const current = loadStoryProgress();
  const clearedChapters = [...new Set([...current.clearedChapters, safeChapter])].sort((a, b) => a - b);
  clearStoryCheckpoint(safeChapter);
  return saveStoryProgress({
    version: 2,
    highestClearedChapter: Math.max(current.highestClearedChapter, safeChapter),
    clearedChapters,
    updatedAt: Date.now(),
  });
}

export function isStoryChapterUnlocked(chapter: number, progress = loadStoryProgress()): boolean {
  if (chapter <= 1) return true;
  return progress.highestClearedChapter >= chapter - 1;
}

export function isStoryChapterCleared(chapter: number, progress = loadStoryProgress()): boolean {
  return progress.clearedChapters.includes(chapter) || progress.highestClearedChapter >= chapter;
}

/** 현재 클라이언트의 특정 챕터 중간 진행 체크포인트를 불러온다. */
export function loadStoryCheckpoint(chapter: number): StoryCheckpoint | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(scopedCheckpointKey(chapter));
    if (!raw) return null;
    return normalizeCheckpoint(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** 현재 클라이언트의 특정 챕터 중간 진행 체크포인트를 저장한다. */
export function saveStoryCheckpoint(checkpoint: StoryCheckpoint): StoryCheckpoint {
  const normalized = normalizeCheckpoint({ ...checkpoint, savedAt: Date.now() });
  if (!normalized) return checkpoint;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(scopedCheckpointKey(normalized.chapter), JSON.stringify(normalized));
    } catch {
      // localStorage가 차단된 환경에서는 현재 세션 진행만 유지한다.
    }
  }
  return normalized;
}

/** 특정 챕터의 중간 체크포인트만 삭제한다. 클리어 기록은 유지된다. */
export function clearStoryCheckpoint(chapter: number): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(scopedCheckpointKey(chapter));
  } catch {
    // 삭제 실패는 게임 진행을 막지 않는다.
  }
}
