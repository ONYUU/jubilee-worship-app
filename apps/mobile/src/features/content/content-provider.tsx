import { mobilePublicContentSchema, type MobilePublicContent } from "@jubilee/domain";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Network from "expo-network";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { AppState } from "react-native";
import { loadPublicContent } from "./repository";
import { filterTimeSensitiveContent } from "./visibility";

const CACHE_KEY = "jubilee.public-content.v1";

type ContentState = {
  content: MobilePublicContent | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  usingCache: boolean;
  isOffline: boolean;
  refresh: () => Promise<void>;
};

const ContentContext = createContext<ContentState | null>(null);

async function readCachedContent(): Promise<MobilePublicContent | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsedJson: unknown = JSON.parse(raw);
    const parsed = mobilePublicContentSchema.safeParse(parsedJson);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function cacheContent(content: MobilePublicContent): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(content));
  } catch {
    // A full or unavailable cache must not hide successfully loaded content.
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("콘텐츠 서버 응답 시간을 초과했습니다.")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function ContentProvider({ children }: PropsWithChildren) {
  const [content, setContent] = useState<MobilePublicContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usingCache, setUsingCache] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const refreshInFlight = useRef(false);
  const rawContent = useRef<MobilePublicContent | null>(null);

  const applyContent = useCallback((next: MobilePublicContent, fromCache: boolean) => {
    rawContent.current = next;
    setContent(filterTimeSensitiveContent(next));
    setUsingCache(fromCache);
  }, []);

  const runRefresh = useCallback(async (
    showRefreshIndicator: boolean,
    initialFallback?: MobilePublicContent | null
  ) => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    if (showRefreshIndicator) setRefreshing(true);
    setError(null);
    try {
      const network = await Network.getNetworkStateAsync();
      const offline = network.isConnected === false || network.isInternetReachable === false;
      setIsOffline(offline);
      if (offline) throw new Error("오프라인 상태입니다.");

      const fallback = initialFallback ?? rawContent.current;
      const next = await withTimeout(loadPublicContent(fallback), 12_000);
      applyContent(next, false);
      await cacheContent(next);
    } catch (caught) {
      const cached = initialFallback ?? rawContent.current ?? await readCachedContent();
      if (cached) {
        applyContent(cached, true);
      } else {
        setError(caught instanceof Error ? caught.message : "콘텐츠를 불러오지 못했습니다.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      refreshInFlight.current = false;
    }
  }, [applyContent]);

  const refresh = useCallback(() => runRefresh(true), [runRefresh]);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      void readCachedContent().then((cached) => {
        if (!active) return;
        if (cached) {
          applyContent(cached, true);
          setLoading(false);
        }
        return runRefresh(false, cached);
      });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [applyContent, runRefresh]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void runRefresh(false);
    });
    const networkSubscription = Network.addNetworkStateListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
      if (!offline) void runRefresh(false);
    });
    return () => {
      appStateSubscription.remove();
      networkSubscription.remove();
    };
  }, [runRefresh]);

  useEffect(() => {
    const raw = rawContent.current;
    if (!raw) return;
    const now = Date.now();
    let nextTransition = Number.POSITIVE_INFINITY;
    for (const announcement of raw.announcements) {
      for (const value of [announcement.starts_at, announcement.expires_at]) {
        if (!value) continue;
        const transition = Date.parse(value);
        if (transition > now && transition < nextTransition) nextTransition = transition;
      }
    }
    if (!Number.isFinite(nextTransition)) return;
    const delay = Math.min(Math.max(nextTransition - now + 100, 100), 2_147_000_000);
    const timeout = setTimeout(() => {
      if (rawContent.current) {
        setContent(filterTimeSensitiveContent(rawContent.current));
      }
    }, delay);
    return () => clearTimeout(timeout);
  }, [content]);

  const value = useMemo<ContentState>(
    () => ({ content, error, loading, refreshing, usingCache, isOffline, refresh }),
    [content, error, loading, refreshing, usingCache, isOffline, refresh]
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentState {
  const value = useContext(ContentContext);
  if (!value) throw new Error("useContent must be used within ContentProvider");
  return value;
}
