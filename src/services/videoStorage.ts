// Persistent storage and locking service for Visualize algorithm videos
// Uses stable static asset paths (/Videos/*.mp4) so videos remain identical in development and production

export type VisualizeAlgoId = 'bubble' | 'insertion' | 'selection';

export const BUBBLE_SORT_MAPPING_KEY = 'visualizeVideos/sorting/bubble-sort';

export const STATIC_VIDEO_PATHS: Record<VisualizeAlgoId, string> = {
  bubble: '/Videos/bubble.mp4',
  insertion: '/Videos/insertion.mp4',
  selection: '/Videos/selection.mp4',
};

export interface StoredVideoRecord {
  algoId: VisualizeAlgoId;
  algorithmId?: string;
  mapping?: string;
  name: string;
  type: string;
  size: number;
  blob?: Blob | null;
  url?: string | null;
  isLocked?: boolean;
  locked?: boolean;
  updatedAt?: number;
}

export interface BackendVideoInfo {
  algoId: VisualizeAlgoId;
  algorithmId?: string;
  mapping?: string;
  name: string;
  size: number;
  mimeType?: string;
  isLocked: boolean;
  locked?: boolean;
  uploadedAt?: string | null;
  url: string | null;
}

const defaultCleanNames: Record<VisualizeAlgoId, string> = {
  bubble: 'Bubble Sort Video',
  insertion: 'Insertion Sort Video',
  selection: 'Selection Sort Video',
};

const defaultVideoSizes: Record<VisualizeAlgoId, number> = {
  bubble: 1126744,
  insertion: 8326863,
  selection: 6940434,
};

/**
 * Checks if a filename or string contains unwanted WhatsApp Video filename text
 */
export function hasUnwantedFilenameText(name?: string | null): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return (
    lower.includes('whatsapp video 2026-09-06') ||
    (lower.includes('whatsapp') && lower.includes('2026-09-06')) ||
    lower.includes('whatsapp video') ||
    lower.includes('whatsapp')
  );
}

/**
 * Removes unwanted WhatsApp Video filename text and returns a clean descriptive title
 */
export function cleanVideoTitle(nameOrUrl?: string | null, fallback: string = 'Video Lesson'): string {
  if (!nameOrUrl) return fallback;
  if (hasUnwantedFilenameText(nameOrUrl)) {
    return fallback;
  }
  return nameOrUrl;
}

// All built-in algorithm videos are final assets and permanently locked
const memoryLockedState: Record<VisualizeAlgoId, boolean> = {
  bubble: true,
  insertion: true,
  selection: true,
};

export function isVideoPermanentlyLocked(algoId: VisualizeAlgoId): boolean {
  return Boolean(memoryLockedState[algoId]);
}

export function setVideoPermanentlyLocked(algoId: VisualizeAlgoId, locked: boolean = true): void {
  memoryLockedState[algoId] = locked;
}

/**
 * Returns the canonical project-level static video assets.
 * Every user, session, incognito window, and deployment sees this exact same state.
 */
export async function fetchGlobalVideosFromBackend(): Promise<Record<VisualizeAlgoId, BackendVideoInfo>> {
  return {
    bubble: {
      algoId: 'bubble',
      algorithmId: 'bubble-sort',
      mapping: BUBBLE_SORT_MAPPING_KEY,
      name: defaultCleanNames.bubble,
      size: defaultVideoSizes.bubble,
      mimeType: 'video/mp4',
      isLocked: true,
      locked: true,
      uploadedAt: '2026-09-08T00:00:00.000Z',
      url: STATIC_VIDEO_PATHS.bubble,
    },
    insertion: {
      algoId: 'insertion',
      algorithmId: 'insertion',
      name: defaultCleanNames.insertion,
      size: defaultVideoSizes.insertion,
      mimeType: 'video/mp4',
      isLocked: true,
      locked: true,
      uploadedAt: '2026-09-08T00:00:00.000Z',
      url: STATIC_VIDEO_PATHS.insertion,
    },
    selection: {
      algoId: 'selection',
      algorithmId: 'selection',
      name: defaultCleanNames.selection,
      size: defaultVideoSizes.selection,
      mimeType: 'video/mp4',
      isLocked: true,
      locked: true,
      uploadedAt: '2026-09-08T00:00:00.000Z',
      url: STATIC_VIDEO_PATHS.selection,
    },
  };
}

/**
 * Final video assets are permanently locked and cannot be replaced.
 */
export async function uploadVideoToBackend(
  algoId: VisualizeAlgoId,
  _file: File | Blob,
  _fileName?: string,
  onProgress?: (percent: number) => void
): Promise<BackendVideoInfo> {
  if (onProgress) onProgress(100);
  return {
    algoId,
    algorithmId: algoId === 'bubble' ? 'bubble-sort' : algoId,
    mapping: algoId === 'bubble' ? BUBBLE_SORT_MAPPING_KEY : undefined,
    name: defaultCleanNames[algoId],
    size: defaultVideoSizes[algoId],
    mimeType: 'video/mp4',
    isLocked: true,
    locked: true,
    uploadedAt: '2026-09-08T00:00:00.000Z',
    url: STATIC_VIDEO_PATHS[algoId],
  };
}

/**
 * Returns the permanently locked static video asset record.
 */
export async function saveVideoToStorage(
  algoId: VisualizeAlgoId,
  _file: File,
  onProgress?: (percent: number) => void
): Promise<StoredVideoRecord> {
  if (onProgress) onProgress(100);
  return {
    algoId,
    algorithmId: algoId === 'bubble' ? 'bubble-sort' : algoId,
    mapping: algoId === 'bubble' ? BUBBLE_SORT_MAPPING_KEY : undefined,
    name: defaultCleanNames[algoId],
    type: 'video/mp4',
    size: defaultVideoSizes[algoId],
    url: STATIC_VIDEO_PATHS[algoId],
    isLocked: true,
    locked: true,
  };
}

export async function getVideoFromStorage(
  algoId: VisualizeAlgoId
): Promise<StoredVideoRecord | null> {
  if (!STATIC_VIDEO_PATHS[algoId]) return null;
  return {
    algoId,
    algorithmId: algoId === 'bubble' ? 'bubble-sort' : algoId,
    mapping: algoId === 'bubble' ? BUBBLE_SORT_MAPPING_KEY : undefined,
    name: defaultCleanNames[algoId],
    type: 'video/mp4',
    size: defaultVideoSizes[algoId],
    url: STATIC_VIDEO_PATHS[algoId],
    isLocked: true,
    locked: true,
  };
}

/**
 * Retrieves all static final video assets.
 */
export async function getAllVideosFromStorage(): Promise<Record<VisualizeAlgoId, StoredVideoRecord | null>> {
  return {
    bubble: {
      algoId: 'bubble',
      algorithmId: 'bubble-sort',
      mapping: BUBBLE_SORT_MAPPING_KEY,
      name: defaultCleanNames.bubble,
      size: defaultVideoSizes.bubble,
      type: 'video/mp4',
      url: STATIC_VIDEO_PATHS.bubble,
      isLocked: true,
      locked: true,
    },
    insertion: {
      algoId: 'insertion',
      algorithmId: 'insertion',
      name: defaultCleanNames.insertion,
      size: defaultVideoSizes.insertion,
      type: 'video/mp4',
      url: STATIC_VIDEO_PATHS.insertion,
      isLocked: true,
      locked: true,
    },
    selection: {
      algoId: 'selection',
      algorithmId: 'selection',
      name: defaultCleanNames.selection,
      size: defaultVideoSizes.selection,
      type: 'video/mp4',
      url: STATIC_VIDEO_PATHS.selection,
      isLocked: true,
      locked: true,
    },
  };
}

export async function deleteVideoFromStorage(algoId: VisualizeAlgoId): Promise<boolean> {
  // Permanently locked: videos cannot be deleted, removed, or reset
  console.warn(`[VideoStorage] Video deletion prevented: Video for "${algoId}" is permanently locked.`);
  return false;
}

export async function clearAllVideosFromStorage(): Promise<boolean> {
  // Permanently locked: videos cannot be cleared or reset
  console.warn('[VideoStorage] Video clear prevented: Uploaded videos are permanently locked.');
  return false;
}
