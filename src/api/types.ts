export interface ReturnData<T = unknown> {
  isSuccess: boolean;
  errorMsg?: string | null;
  data?: T | null;
}

export interface Book {
  bookUrl: string;
  tocUrl?: string;
  origin?: string;
  originName?: string;
  name: string;
  author: string;
  kind?: string;
  customTag?: string;
  coverUrl?: string;
  customCoverUrl?: string;
  intro?: string;
  customIntro?: string;
  wordCount?: string;
  latestChapterTitle?: string;
  latestChapterTime?: number;
  lastCheckTime?: number;
  lastCheckCount?: number;
  totalChapterNum?: number;
  durChapterTitle?: string;
  durChapterIndex?: number;
  durChapterPos?: number;
  durChapterTime?: number;
  type?: number;
  group?: number;
}

export interface BookChapter {
  url: string;
  title: string;
  isVolume?: boolean;
  baseUrl?: string;
  bookUrl: string;
  index: number;
  isVip?: boolean;
  isPay?: boolean;
  wordCount?: string;
  start?: number;
  end?: number;
}

export interface ReaderWebParagraph {
  html: string;
  start: number;
  endExclusive: number;
}

export interface ReaderWebChapter {
  title: string;
  characterCount: number;
  paragraphs: ReaderWebParagraph[];
}

export interface NormalizedParagraph {
  html: string;
  start: number;
  endExclusive: number;
  hasImage: boolean;
}

export interface NormalizedChapter {
  title: string;
  characterCount: number;
  paragraphs: NormalizedParagraph[];
  isSemantic: boolean;
}

export interface BookProgressPayload {
  url: string;
  name: string;
  author: string;
  durChapterIndex: number;
  durChapterPos: number;
  durChapterTime: number;
  durChapterTitle: string;
}

export interface SearchBook {
  bookUrl: string;
  origin: string;
  originName: string;
  type?: number;
  name: string;
  author: string;
  kind?: string;
  coverUrl?: string;
  intro?: string;
  wordCount?: string;
  latestChapterTitle?: string;
  tocUrl?: string;
  time?: number;
  originOrder?: number;
}

export type EndpointMode = 'direct' | 'proxy';

export interface EndpointConfig {
  id: string;
  name: string;
  mode: EndpointMode;
  /** Direct: e.g. http://192.168.1.24:1122 | Proxy: e.g. /api/legado */
  baseUrl: string;
  /** Optional explicit WS URL or proxy path, e.g. ws://192.168.1.24:1123 or /ws/legado */
  wsUrl?: string;
  /** Direct mode fallback WS port offset when wsUrl is unset (default +1) */
  wsPortOffset?: number;
}

export interface ConnectionTestResult {
  ok: boolean;
  latencyMs: number;
  bookCount?: number;
  error?: string;
  isMixedContent?: boolean;
}
