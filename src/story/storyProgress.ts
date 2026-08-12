/**
 * 스토리 챕터 진행도 로컬 저장소
 *
 * 서버 계정과 별개로 현재 브라우저/컴퓨터에 챕터 클리어 기록을 남긴다.
 * 챕터 N을 클리어하면 N+1 챕터가 해금되는 순차 진행 규칙을 담당한다.
 */

export const STORY_PROGRESS_STORAGE_KEY = "starblaze_story_progress_v1";

export interface StoryProgress {
  version: 1;
  highestClearedChapter: number;
  clearedChapters: number[];
  updatedAt: number;
}

const EMPTY_PROGRESS: StoryProgress = {
  version: 1,
  highestClearedChapter: 0,
  clearedChapters: [],
  updatedAt: 0,
};

function normalizeProgress(value: Partial<StoryProgress> | null | undefined): StoryProgress {
  const cleared = Array.isArray(value?.clearedChapters)
    ? [...new Set(value.clearedChapters.filter((chapter) => Number.isInteger(chapter) && chapter > 0))].sort((a, b) => a - b)
    : [];
  const highestFromList = cleared.length > 0 ? cleared[cleared.length - 1] : 0;
  const highest = Math.max(0, Number(value?.highestClearedChapter) || 0, highestFromList);
  return {
    version: 1,
    highestClearedChapter: highest,
    clearedChapters: cleared,
    updatedAt: Number(value?.updatedAt) || 0,
  };
}

export function loadStoryProgress(): StoryProgress {
  if (typeof localStorage === "undefined") return { ...EMPTY_PROGRESS };
  try {
    const raw = localStorage.getItem(STORY_PROGRESS_STORAGE_KEY);
    if (!raw) return { ...EMPTY_PROGRESS };
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

export function saveStoryProgress(progress: StoryProgress): StoryProgress {
  const normalized = normalizeProgress(progress);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORY_PROGRESS_STORAGE_KEY, JSON.stringify(normalized));
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
  return saveStoryProgress({
    version: 1,
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
