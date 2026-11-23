/**
 * NVIDIA NIM API Service
 * Direct OpenAI-compatible API calls to NVIDIA Inference Microservices.
 * No simulated fallbacks — returns empty on failure so the UI can show the real state.
 */

export interface NIMSettings {
  apiKey: string;
  baseUrl: string;
  model1: string;
  model2: string;
  model3: string;
  model4: string;
  nemotronModel: string;
  enabledModels: { model1: boolean; model2: boolean; model3: boolean; model4: boolean };
}

export const DEFAULT_NIM_SETTINGS: NIMSettings = {
  apiKey: '',
  baseUrl: 'https://integrate.api.nvidia.com/v1',
  model1: '',
  model2: '',
  model3: '',
  model4: '',
  nemotronModel: '',
  enabledModels: { model1: true, model2: true, model3: true, model4: true }
};

const STORAGE_KEY = 'cellguard_nim_config';

class NvidiaService {
  private settings: NIMSettings = { ...DEFAULT_NIM_SETTINGS };
  private apiCallCount = 0;

  constructor() { this.loadSettings(); }

  public loadSettings(): NIMSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) this.settings = { ...DEFAULT_NIM_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return this.settings;
  }

  public saveSettings(s: Partial<NIMSettings>): NIMSettings {
    this.settings = { ...this.settings, ...s };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)); } catch {}
    return this.settings;
  }

  public clearApiKey() { this.saveSettings({ apiKey: '' }); }
  public getSettings() { return { ...this.settings }; }
  public getApiCallCount() { return this.apiCallCount; }
  public hasApiKey() { return !!this.settings.apiKey && this.settings.apiKey.trim().length > 5; }

  public getModelIds(): string[] {
    const s = this.settings;
    return [s.model1, s.model2, s.model3, s.model4].filter(Boolean);
  }

  public async testConnection(): Promise<{ success: boolean; message: string; corsBlocked: boolean; statusCode?: number }> {
    if (!this.hasApiKey()) return { success: false, message: 'No API key configured.', corsBlocked: false };
    const models = this.getModelIds();
    if (models.length === 0) return { success: false, message: 'No model IDs configured.', corsBlocked: false };

    try {
      this.apiCallCount++;
      const res = await fetch(`${this.settings.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.settings.apiKey.trim()}` },
        body: JSON.stringify({ model: models[0], messages: [{ role: 'user', content: 'Ping' }], max_tokens: 5, temperature: 0.1 })
      });
      if (res.ok) return { success: true, message: `Connected to NVIDIA NIM (${models[0]}).`, corsBlocked: false, statusCode: res.status };
      const errText = await res.text();
      return { success: false, message: `HTTP ${res.status}: ${errText.slice(0, 200)}`, corsBlocked: false, statusCode: res.status };
    } catch (err: any) {
      const isCors = err?.name === 'TypeError' || err?.message?.toLowerCase().includes('failed to fetch');
      return {
        success: false,
        corsBlocked: isCors,
        message: isCors
          ? 'Browser CORS policy blocked the request. NVIDIA NIM endpoints may not include Access-Control-Allow-Origin headers for browser clients. Use a proxy or server-side relay.'
          : (err?.message || 'Network error')
      };
    }
  }

  public async callChatCompletion(params: {
    model: string;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ content: string; success: boolean; error?: string; isLiveAPI?: boolean }> {
    if (!this.hasApiKey() || !params.model) return { content: '', success: false, error: 'Missing API key or model ID', isLiveAPI: false };
    try {
      this.apiCallCount++;
      const res = await fetch(`${this.settings.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.settings.apiKey.trim()}` },
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature ?? 0.3,
          max_tokens: params.maxTokens ?? 1024
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 150)}`);
      }
      const data = await res.json();
      return {
        content: data.choices?.[0]?.message?.content || '',
        success: true,
        isLiveAPI: true
      };
    } catch (err: any) {
      console.error(`[NVIDIA NIM] ${params.model} call failed`, err);
      return {
        content: '',
        success: false,
        error: err?.message || 'Request failed',
        isLiveAPI: false
      };
    }
  }
}

export const nvidiaService = new NvidiaService();
