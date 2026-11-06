"use client";

import React, { useState } from "react";
import { Sparkles, Send, Bot, User, Loader2 } from "lucide-react";
import { CopilotChatResponse } from "@/types";
import { sendCopilotChat } from "@/lib/api";

export const CopilotChat: React.FC = () => {
  const [messages, setMessages] = useState<Array<{ sender: "user" | "bot"; text: string; mode?: string }>>([
    {
      sender: "bot",
      text: "Hello! I am your PayPilot Business Copilot. Ask me anything about your cashflow, settled revenue, or pending order approvals.",
      mode: "DETERMINISTIC_DEMO",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    "What is our verified revenue?",
    "Explain our pending customer orders",
    "Should I approve the Stratos Dynamics order?",
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    setMessages((prev) => [...prev, { sender: "user", text: query }]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const response: CopilotChatResponse = await sendCopilotChat(query);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: response.reply,
          mode: response.mode,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "I'm having trouble analyzing your ledger right now. Please try asking again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col h-[480px]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Copilot Business Assistant</h3>
            <p className="text-[11px] text-slate-500">Live Q&A grounded in your commerce ledger</p>
          </div>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
          Grounded Business Assistant
        </span>
      </div>

      {/* Message history */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start space-x-2 ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.sender === "bot" && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <Sparkles className="h-3 w-3" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed shadow-xs ${
                msg.sender === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none"
                  : "bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-none"
              }`}
            >
              <p>{msg.text}</p>
              {msg.mode && msg.mode !== "DETERMINISTIC_DEMO" && (
                <span className="mt-1 block text-[10px] opacity-75 font-mono">
                  Source: {msg.mode}
                </span>
              )}
            </div>
            {msg.sender === "user" && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                <User className="h-3 w-3" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span>Analyzing ledger context...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="pt-3 pb-2 flex flex-wrap gap-1.5">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            disabled={loading}
            className="rounded-full bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-[11px] text-slate-700 transition-colors cursor-pointer text-left"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input row */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center space-x-2 pt-2 border-t border-slate-100"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your revenue or orders..."
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 disabled:bg-slate-200 transition-colors cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};
