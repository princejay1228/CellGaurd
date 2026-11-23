/**
 * NVIDIA NIM API Service
 * Handles direct OpenAI-compatible API calls to NVIDIA Inference Microservices (NIM)
 * Base URL: https://integrate.api.nvidia.com/v1
 */

export interface NIMSettings {
  apiKey: string;
  baseUrl: string;
  model1: string;
  model2: string;
  model3: string;
  model4: string;
  nemotronModel: string;
  enabledModels: {
    model1: boolean;
    model2: boolean;
    model3: boolean;
    model4: boolean;
  };
}

export const DEFAULT_NIM_SETTINGS: NIMSettings = {
  apiKey: '',
  baseUrl: 'https://integrate.api.nvidia.com/v1',
  model1: 'meta/llama-3.3-70b-instruct',
  model2: 'deepseek-ai/deepseek-r1',
  model3: 'mistralai/mistral-large-2-instruct',
  model4: 'nvidia/llama-3.1-nemotron-70b-instruct',
  nemotronModel: 'nvidia/nemotron-3-ultra-550b-a55b',
  enabledModels: {
    model1: true,
    model2: true,
    model3: true,
    model4: true
  }
};

const STORAGE_KEY = 'cellguard_nim_config';

class NvidiaService {
  private settings: NIMSettings = { ...DEFAULT_NIM_SETTINGS };
  private apiCallCount: number = 0;
  private corsTested: boolean = false;
  private corsSupported: boolean = false;
  private lastCorsError: string | null = null;

  constructor() {
    this.loadSettings();
  }

  public loadSettings(): NIMSettings {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          this.settings = { ...DEFAULT_NIM_SETTINGS, ...parsed };
        }
      } catch (e) {
        console.error('Failed to load NIM settings from localStorage', e);
      }
    }
    return this.settings;
  }

  public saveSettings(newSettings: Partial<NIMSettings>): NIMSettings {
    this.settings = { ...this.settings, ...newSettings };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch (e) {
        console.error('Failed to save NIM settings', e);
      }
    }
    return this.settings;
  }

  public clearApiKey(): void {
    this.settings.apiKey = '';
    this.saveSettings({ apiKey: '' });
  }

  public getSettings(): NIMSettings {
    return { ...this.settings };
  }

  public getApiCallCount(): number {
    return this.apiCallCount;
  }

  public hasApiKey(): boolean {
    return !!this.settings.apiKey && this.settings.apiKey.trim().length > 5;
  }

  /**
   * Tests direct browser CORS connectivity to NVIDIA NIM endpoint
   */
  public async testConnection(): Promise<{
    success: boolean;
    message: string;
    corsBlocked: boolean;
    statusCode?: number;
  }> {
    if (!this.hasApiKey()) {
      return {
        success: false,
        message: 'No NVIDIA API key provided. Please enter a valid API key (nvapi-...).',
        corsBlocked: false
      };
    }

    const testUrl = `${this.settings.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    try {
      this.apiCallCount++;
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey.trim()}`
        },
        body: JSON.stringify({
          model: this.settings.model1,
          messages: [{ role: 'user', content: 'Ping. Respond with single word "PONG".' }],
          max_tokens: 10,
          temperature: 0.1
        })
      });

      this.corsTested = true;
      if (response.ok) {
        this.corsSupported = true;
        this.lastCorsError = null;
        return {
          success: true,
          message: `Connected successfully to NVIDIA NIM API (${this.settings.model1})!`,
          corsBlocked: false,
          statusCode: response.status
        };
      } else {
        const errorText = await response.text();
        this.corsSupported = true; // Not CORS blocked, but API rejected (e.g. invalid key or model)
        return {
          success: false,
          message: `NVIDIA API responded with HTTP ${response.status}: ${errorText.slice(0, 150)}`,
          corsBlocked: false,
          statusCode: response.status
        };
      }
    } catch (err: any) {
      this.corsTested = true;
      const isCors = err?.name === 'TypeError' || err?.message?.toLowerCase().includes('failed to fetch');
      this.corsSupported = !isCors;
      this.lastCorsError = isCors
        ? 'Direct browser request was blocked by browser CORS policy. NVIDIA NIM endpoints typically do not include Access-Control-Allow-Origin headers for client-side web apps. In this browser environment, CellGuard AI provides realistic battery physics AI simulation, or you can configure a local proxy.'
        : err?.message || 'Network error';

      return {
        success: false,
        message: this.lastCorsError || 'Connection failed',
        corsBlocked: isCors
      };
    }
  }

  /**
   * Executes a Chat Completion request to NVIDIA NIM
   */
  public async callChatCompletion(params: {
    model: string;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ content: string; isLiveAPI: boolean }> {
    if (!this.hasApiKey()) {
      return {
        content: '',
        isLiveAPI: false
      };
    }

    const url = `${this.settings.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    try {
      this.apiCallCount++;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey.trim()}`
        },
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature ?? 0.3,
          max_tokens: params.maxTokens ?? 1024
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      return { content, isLiveAPI: true };
    } catch (err) {
      console.warn(`[NVIDIA NIM] API call failed for ${params.model}. Falling back to high-fidelity simulated response.`, err);
      return { content: '', isLiveAPI: false };
    }
  }
}

export const nvidiaService = new NvidiaService();
