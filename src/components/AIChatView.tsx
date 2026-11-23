import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  MessageSquare,
  Plus,
  Trash2,
  BrainCircuit,
  Zap,
  Activity,
  AlertCircle
} from 'lucide-react';
import { ChatConversation, ChatMessage, SensorReading, DebateTranscriptEntry } from '../types';
import { db } from '../db';
import { nvidiaService } from '../services/nvidiaService';

interface AIChatViewProps {
  currentReading: SensorReading | null;
}

export const AIChatView: React.FC<AIChatViewProps> = ({ currentReading }) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [chatMode, setChatMode] = useState<'quick' | 'debate'>('quick');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const loadConversations = async () => {
    const list = await db.chatConversations.orderBy('updatedAt').reverse().toArray();
    setConversations(list);
    if (list.length > 0 && !activeConversationId) {
      setActiveConversationId(list[0].id);
    } else if (list.length === 0) {
      createNewConversation();
    }
  };

  const loadMessages = async (convId: string) => {
    const msgs = await db.chatMessages.where('conversationId').equals(convId).sortBy('timestamp');
    setMessages(msgs);
  };

  const createNewConversation = async () => {
    const id = `conv-${Date.now()}`;
    const newConv: ChatConversation = {
      id,
      title: 'New Consultation',
      mode: chatMode,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.chatConversations.add(newConv);
    setConversations([newConv, ...conversations]);
    setActiveConversationId(id);
    setMessages([]);
  };

  const deleteConversation = async (convId: string) => {
    await db.chatConversations.delete(convId);
    await db.chatMessages.where('conversationId').equals(convId).delete();
    const remaining = conversations.filter(c => c.id !== convId);
    setConversations(remaining);
    if (activeConversationId === convId) {
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || isGenerating || !activeConversationId) return;

    setInputPrompt('');
    setIsGenerating(true);

    // 1. Add User message
    const userMsg: ChatMessage = {
      conversationId: activeConversationId,
      role: 'user',
      content: query,
      mode: chatMode,
      timestamp: Date.now()
    };
    await db.chatMessages.add(userMsg);
    setMessages(prev => [...prev, userMsg]);

    // Update conversation title if first message
    if (messages.length === 0) {
      const title = query.slice(0, 32) + (query.length > 32 ? '...' : '');
      await db.chatConversations.update(activeConversationId, { title, updatedAt: Date.now() });
      setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, title } : c));
    }

    // Telemetry Context
    const telemetryContext = currentReading
      ? `Real-Time ESP32 Hardware Telemetry:
- Voltage: ${currentReading.voltage.toFixed(3)} V
- Current: ${currentReading.current.toFixed(3)} A
- Temperature: ${currentReading.temperature.toFixed(2)} °C
- Power: ${currentReading.power.toFixed(3)} W
- SOC: ${currentReading.soc.toFixed(1)}%`
      : 'Hardware Status: ESP32 hardware currently disconnected. No live telemetry available.';

    const settings = nvidiaService.getSettings();

    try {
      if (!nvidiaService.hasApiKey()) {
        const errorMsg: ChatMessage = {
          conversationId: activeConversationId,
          role: 'assistant',
          content: '⚠️ NVIDIA API Key not configured. Please navigate to the Settings tab and enter your NVIDIA NIM API key to query live models.',
          modelId: 'System',
          mode: chatMode,
          timestamp: Date.now(),
          isLiveAPI: false
        };
        await db.chatMessages.add(errorMsg);
        setMessages(prev => [...prev, errorMsg]);
        setIsGenerating(false);
        return;
      }

      if (chatMode === 'quick') {
        // Quick Answer Mode: Nemotron direct synthesis
        const prompt = `System: You are NVIDIA Nemotron, specialized in battery electrochemistry, thermal management, and BMS diagnostics. Answer accurately and concisely based strictly on real context.
${telemetryContext}

User Query: ${query}`;

        const res = await nvidiaService.callChatCompletion({
          model: settings.nemotronModel || 'nvidia/nemotron-3-ultra-550b-a55b',
          messages: [{ role: 'user', content: prompt }]
        });

        const assistantMsg: ChatMessage = {
          conversationId: activeConversationId,
          role: 'assistant',
          content: res.success && res.content 
            ? res.content 
            : `⚠️ NVIDIA API Error: ${res.error || 'Unable to connect to NVIDIA API endpoint. Ensure CORS or proxy settings allow access.'}`,
          modelId: settings.nemotronModel || 'Nemotron',
          mode: 'quick',
          timestamp: Date.now(),
          isLiveAPI: res.isLiveAPI
        };
        await db.chatMessages.add(assistantMsg);
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        // Full Debate Mode: Query configured models
        const activeModelConfigs = [
          { key: 'model1', id: settings.model1, name: 'Agent 1' },
          { key: 'model2', id: settings.model2, name: 'Agent 2' },
          { key: 'model3', id: settings.model3, name: 'Agent 3' },
          { key: 'model4', id: settings.model4, name: 'Agent 4' },
        ].filter(m => (settings.enabledModels as any)[m.key]);

        const debateRounds: DebateTranscriptEntry[] = [];

        // Query each active model independently
        for (const modelCfg of activeModelConfigs) {
          const prompt = `You are ${modelCfg.name} evaluating lithium battery telemetry.
${telemetryContext}
User Query: ${query}
Provide your technical assessment, identifying key thermal or electrical factors.`;

          const res = await nvidiaService.callChatCompletion({
            model: modelCfg.id,
            messages: [{ role: 'user', content: prompt }]
          });

          if (res.success && res.content) {
            debateRounds.push({
              id: `chat-d-${modelCfg.name}-${Date.now()}`,
              timestamp: Date.now(),
              modelId: modelCfg.id,
              modelName: modelCfg.name,
              role: 'Analysis Agent',
              round: 1,
              type: 'initial',
              content: res.content,
              position: 'OPTIMAL',
              confidence: 90,
              isLiveAPI: true
            });
          }
        }

        // Arbiter synthesis with Nemotron
        let synthesis = '';
        if (debateRounds.length > 0) {
          const debateSummary = debateRounds.map(r => `[${r.modelName}]: ${r.content}`).join('\n\n');
          const arbiterPrompt = `You are NVIDIA Nemotron acting as lead battery arbiter.
${telemetryContext}
User Query: ${query}

Agent Perspectives:
${debateSummary}

Synthesize the final answer, noting any key divergences and final verdict.`;

          const arbiterRes = await nvidiaService.callChatCompletion({
            model: settings.nemotronModel || 'nvidia/nemotron-3-ultra-550b-a55b',
            messages: [{ role: 'user', content: arbiterPrompt }]
          });

          synthesis = arbiterRes.success && arbiterRes.content 
            ? arbiterRes.content 
            : 'Nemotron synthesis call failed. See individual agent responses above.';
        } else {
          synthesis = 'All configured debate model requests failed. Please check network/API key.';
        }

        const assistantMsg: ChatMessage = {
          conversationId: activeConversationId,
          role: 'assistant',
          content: synthesis,
          modelId: settings.nemotronModel || 'Nemotron Arbiter',
          mode: 'debate',
          timestamp: Date.now(),
          isLiveAPI: debateRounds.length > 0,
          debateData: {
            rounds: debateRounds,
            nemotronSynthesis: synthesis
          }
        };
        await db.chatMessages.add(assistantMsg);
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        conversationId: activeConversationId,
        role: 'assistant',
        content: `Error executing query: ${err?.message || 'Unknown network error.'}`,
        modelId: 'System',
        mode: chatMode,
        timestamp: Date.now(),
        isLiveAPI: false
      };
      await db.chatMessages.add(errorMsg);
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const sampleQuestions = [
    'Assess current battery safety and thermal dynamics.',
    'What is the estimated risk of degradation at current voltage?',
    'What charge/discharge limits are recommended for this state?',
    'Evaluate potential internal impedance issues.'
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(100vh-140px)] min-h-[550px]">
      {/* Sidebar: Conversation History */}
      <div className="md:col-span-1 rounded-2xl bg-[#141008] border border-stone-800 p-3 flex flex-col justify-between shadow-xl">
        <div>
          <button
            onClick={createNewConversation}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-red-950/40 mb-3"
          >
            <Plus className="w-4 h-4" /> New Consultation
          </button>

          <h5 className="text-[10px] font-mono tracking-wider uppercase text-stone-500 px-2 mb-2">
            Stored Conversations
          </h5>

          <div className="space-y-1 overflow-y-auto max-h-[380px] pr-1">
            {conversations.map(c => (
              <div
                key={c.id}
                onClick={() => setActiveConversationId(c.id)}
                className={`group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                  c.id === activeConversationId
                    ? 'bg-red-950/40 border border-red-700/40 text-amber-300'
                    : 'hover:bg-stone-900 text-stone-400 hover:text-stone-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                  <span className="truncate font-sans">{c.title}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Live Telemetry Pill in Sidebar */}
        <div className="p-2.5 rounded-xl bg-[#0a0806] border border-stone-800 text-[11px] font-mono text-stone-400 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <Activity className="w-3 h-3 text-red-500" /> 
            {currentReading ? 'ESP32 Hardware Online' : 'No Hardware Connected'}
          </div>
          {currentReading ? (
            <>
              <div className="flex justify-between">
                <span>V: {currentReading.voltage.toFixed(3)} V</span>
                <span>I: {currentReading.current.toFixed(3)} A</span>
              </div>
              <div className="flex justify-between">
                <span>T: {currentReading.temperature.toFixed(1)} °C</span>
                <span>SOC: {currentReading.soc.toFixed(1)}%</span>
              </div>
            </>
          ) : (
            <p className="text-[10px] text-stone-500">Connect ESP32 via BLE to stream real telemetry.</p>
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="md:col-span-3 rounded-2xl bg-[#141008] border border-stone-800 flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* Chat Mode Selector Header */}
        <div className="p-3.5 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2 bg-[#0c0906]">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                CellGuard AI Reasoning Engine
              </h3>
              <p className="text-[10px] text-stone-400 font-mono">
                Real NVIDIA NIM Reasoning & Multi-Agent Analysis
              </p>
            </div>
          </div>

          {/* Mode Switch: Quick vs Full Debate */}
          <div className="flex items-center p-0.5 rounded-xl bg-stone-900 border border-stone-800 text-xs font-mono">
            <button
              onClick={() => setChatMode('quick')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                chatMode === 'quick'
                  ? 'bg-red-600/20 text-amber-300 border border-red-600/40 font-semibold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Quick Answer (Nemotron)
            </button>
            <button
              onClick={() => setChatMode('debate')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                chatMode === 'debate'
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-600/40 font-semibold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-red-500" /> Multi-Agent Debate
            </button>
          </div>
        </div>

        {/* Message History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="p-3 rounded-2xl bg-red-950/30 border border-red-800/40 text-red-400">
                <Bot className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-200">
                  Ask CellGuard AI about battery performance, thermal hazard, or chemistry
                </h4>
                <p className="text-xs text-stone-400 max-w-md mt-1">
                  Queries leverage real NVIDIA NIM models and live ESP32 hardware telemetry.
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl text-left pt-2">
                {sampleQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(q)}
                    className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-red-600/50 text-xs text-stone-300 hover:text-amber-300 transition-all font-sans"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-red-950/50 border border-red-700/40 flex items-center justify-center text-amber-400 shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-md ${
                    m.role === 'user'
                      ? 'bg-red-700 text-white font-medium'
                      : 'bg-[#0a0806] border border-stone-800 text-stone-200'
                  }`}
                >
                  {/* Mode & Model Header for Assistant */}
                  {m.role === 'assistant' && (
                    <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 mb-2 pb-1.5 border-b border-stone-800">
                      <span className="text-amber-400 font-bold">{m.modelId || 'CellGuard Arbiter'}</span>
                      <span className="px-1.5 py-0.2 rounded bg-stone-900 border border-stone-800 text-stone-300">
                        {m.mode === 'debate' ? 'Multi-Agent Synthesis' : 'Quick Answer'}
                      </span>
                    </div>
                  )}

                  {/* If Debate Data is attached, render individual debate rounds */}
                  {m.debateData?.rounds && (
                    <div className="mb-3 space-y-2 border-b border-stone-800 pb-3">
                      <h6 className="text-[11px] font-mono font-bold text-amber-400 uppercase">
                        Agent Contributions:
                      </h6>
                      <div className="space-y-1.5">
                        {m.debateData.rounds.map((roundEntry, rIdx) => (
                          <div key={rIdx} className="p-2 rounded-lg bg-stone-900/70 border border-stone-800 text-xs font-sans">
                            <span className="font-bold text-red-400 font-mono text-[11px]">
                              {roundEntry.modelName}:
                            </span>{' '}
                            <span className="text-stone-300">{roundEntry.content}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans">
                    {m.content}
                  </div>

                  <div className="text-[9px] font-mono text-stone-500 mt-2 text-right">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-stone-800 flex items-center justify-center text-stone-300 shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {isGenerating && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-stone-900/80 border border-stone-800 text-xs font-mono text-amber-400 w-fit">
              <Sparkles className="w-4 h-4 animate-spin text-red-500" />
              <span>
                {chatMode === 'debate' ? 'Querying configured agents...' : 'Nemotron synthesizing response...'}
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Input Box */}
        <div className="p-3 border-t border-stone-800 bg-[#0c0906]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder={chatMode === 'debate' ? "Ask question for multi-agent debate..." : "Ask Nemotron quick question..."}
              disabled={isGenerating}
              className="flex-1 px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder:text-stone-500 text-xs font-sans focus:outline-none focus:border-red-600"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isGenerating}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-mono transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-red-950/40"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
