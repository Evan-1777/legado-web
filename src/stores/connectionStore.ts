import { create } from 'zustand';
import { testConnection } from '@/api/client';
import type { ConnectionTestResult, EndpointConfig } from '@/api/types';

export const CONNECTION_STORAGE_KEY = 'legado_web_endpoints_v1';

interface PersistedConnection {
  version: 1;
  activeEndpointId: string;
  endpoints: EndpointConfig[];
}

function getDefaultEndpoints(): EndpointConfig[] {
  const isHttps =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  const list: EndpointConfig[] = [
    {
      id: 'ep-local',
      name: '局域网直连',
      mode: 'direct',
      baseUrl: 'http://192.168.1.24:1122',
      wsPortOffset: 1,
    },
    {
      id: 'ep-proxy',
      name: '同源反代',
      mode: 'proxy',
      baseUrl: '/api/legado',
      wsUrl: '/ws/legado',
    },
  ];
  return list.sort((a, b) => {
    if (isHttps) return a.mode === 'proxy' ? -1 : b.mode === 'proxy' ? 1 : 0;
    return 0;
  });
}

function loadConnectionState(): {
  endpoints: EndpointConfig[];
  activeEndpointId: string;
} {
  const defaults = getDefaultEndpoints();
  try {
    const raw = localStorage.getItem(CONNECTION_STORAGE_KEY);
    if (!raw) {
      return { endpoints: defaults, activeEndpointId: defaults[0].id };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedConnection>;
    if (Array.isArray(parsed.endpoints) && parsed.endpoints.length > 0) {
      const validActive = parsed.endpoints.some(
        (e) => e.id === parsed.activeEndpointId
      )
        ? (parsed.activeEndpointId as string)
        : parsed.endpoints[0].id;
      return { endpoints: parsed.endpoints, activeEndpointId: validActive };
    }
  } catch {
    // Corrupted storage falls back to defaults
  }
  return { endpoints: defaults, activeEndpointId: defaults[0].id };
}

function persistConnection(endpoints: EndpointConfig[], activeEndpointId: string) {
  try {
    const payload: PersistedConnection = {
      version: 1,
      activeEndpointId,
      endpoints,
    };
    localStorage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

export type ConnectionStatus = 'idle' | 'checking' | 'connected' | 'error';

interface ConnectionStore {
  endpoints: EndpointConfig[];
  activeEndpointId: string;
  status: ConnectionStatus;
  lastResult: ConnectionTestResult | null;
  getActiveEndpoint: () => EndpointConfig;
  selectEndpoint: (id: string) => void;
  upsertEndpoint: (ep: Omit<EndpointConfig, 'id'> & { id?: string }) => EndpointConfig;
  removeEndpoint: (id: string) => void;
  probe: (target?: EndpointConfig) => Promise<ConnectionTestResult>;
  setStatus: (status: ConnectionStatus) => void;
}

const initial = loadConnectionState();

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  endpoints: initial.endpoints,
  activeEndpointId: initial.activeEndpointId,
  status: 'idle',
  lastResult: null,

  getActiveEndpoint: () => {
    const { endpoints, activeEndpointId } = get();
    return endpoints.find((e) => e.id === activeEndpointId) ?? endpoints[0];
  },

  selectEndpoint: (id) => {
    const { endpoints } = get();
    if (!endpoints.some((e) => e.id === id)) return;
    persistConnection(endpoints, id);
    set({ activeEndpointId: id, status: 'idle', lastResult: null });
  },

  upsertEndpoint: (input) => {
    const { endpoints, activeEndpointId } = get();
    const id = input.id || `ep-${Date.now().toString(36)}`;
    const nextEp: EndpointConfig = {
      id,
      name: input.name.trim() || (input.mode === 'proxy' ? '反代服务' : '局域网服务'),
      mode: input.mode,
      baseUrl: input.baseUrl.trim(),
      wsUrl: input.wsUrl?.trim() || undefined,
      wsPortOffset:
        input.mode === 'direct'
          ? Number.isFinite(input.wsPortOffset)
            ? input.wsPortOffset
            : 1
          : undefined,
    };

    const exists = endpoints.some((e) => e.id === id);
    const nextList = exists
      ? endpoints.map((e) => (e.id === id ? nextEp : e))
      : [...endpoints, nextEp];
    const nextActive = exists ? activeEndpointId : id;
    persistConnection(nextList, nextActive);
    set({ endpoints: nextList, activeEndpointId: nextActive });
    return nextEp;
  },

  removeEndpoint: (id) => {
    const { endpoints, activeEndpointId } = get();
    if (endpoints.length <= 1) return;
    const nextList = endpoints.filter((e) => e.id !== id);
    const nextActive = activeEndpointId === id ? nextList[0].id : activeEndpointId;
    persistConnection(nextList, nextActive);
    set({ endpoints: nextList, activeEndpointId: nextActive, status: 'idle', lastResult: null });
  },

  probe: async (target) => {
    const ep = target ?? get().getActiveEndpoint();
    set({ status: 'checking' });
    const result = await testConnection(ep);
    set({
      status: result.ok ? 'connected' : 'error',
      lastResult: result,
    });
    return result;
  },

  setStatus: (status) => set({ status }),
}));
