import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, MessageSquare, Plus, Paperclip, Send, FileText, CheckCircle2, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/localDb';
import { askRoy, parseDocumentWithRoy } from '../lib/gemini';
import * as XLSX from 'xlsx';

// Guaranteed-unique ID — never collides even when called many times per ms
const uid = () => crypto.randomUUID();

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isMock?: boolean;
  isActionCard?: boolean;
  actionPayload?: Record<string, any>;
  targetTable?: string;
  flaggedIssues?: string[];
  actionCommitted?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  // Store history in Gemini format for multi-turn context
  history: { role: 'user' | 'model'; parts: { text: string }[] }[];
}

function ActionCard({ msg, onCommit }: { msg: Message, onCommit: (payload: any | any[], targetTable: string, msgId: string) => void }) {
  const [payload, setPayload] = useState<any | any[]>(msg.actionPayload || {});
  const [targetTable, setTargetTable] = useState(msg.targetTable || 'purchaseOrders');

  return (
    <div className="mt-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-500/20 p-4 shadow-inner">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold text-[10px] uppercase tracking-wider">
          <FileText className="w-3.5 h-3.5" /> Extracted Document Data
        </div>
        <select 
          value={targetTable}
          onChange={(e) => setTargetTable(e.target.value)}
          className="text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-1 text-gray-700 dark:text-gray-300"
        >
          <option value="purchaseOrders">Purchase Orders</option>
          <option value="clients">Clients</option>
          <option value="suppliers">Suppliers</option>
          <option value="stockItems">Stock Items</option>
        </select>
      </div>
      
      {msg.flaggedIssues && msg.flaggedIssues.length > 0 && (
        <div className="mb-4 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Anomalies Detected:
          </p>
          <ul className="list-disc pl-4 text-[11px] text-amber-600 dark:text-amber-300">
            {msg.flaggedIssues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(payload) ? (
        <div className="overflow-x-auto mb-4 border border-gray-200 dark:border-slate-700 rounded-lg max-h-64 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-100 dark:bg-slate-800 sticky top-0">
              <tr>
                {Object.keys(payload[0] || {}).map((key) => (
                  <th key={key} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800 text-xs">
              {payload.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  {Object.keys(payload[0] || {}).map((key) => (
                    <td key={key} className="px-3 py-1 whitespace-nowrap">
                      <input 
                        value={row[key] || ''} 
                        onChange={(e) => {
                          const newArr = [...payload];
                          newArr[idx] = { ...newArr[idx], [key]: e.target.value };
                          setPayload(newArr);
                        }}
                        className="w-full bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-indigo-500 focus:outline-none p-0.5"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-4">
          {Object.entries(payload).map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <span className="text-gray-400 dark:text-slate-500 block capitalize text-[10px]">{key}</span>
              <input 
                value={value as string || ''} 
                onChange={e => setPayload({...payload, [key]: e.target.value})}
                className="font-medium text-gray-900 dark:text-white bg-transparent border-b border-dashed border-gray-300 dark:border-slate-600 focus:border-indigo-500 focus:outline-none p-0.5"
              />
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => onCommit(payload, targetTable, msg.id)}
        className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg flex items-center justify-center gap-2 font-medium text-sm transition-colors shadow-md shadow-indigo-500/20"
      >
        <CheckCircle2 className="w-4 h-4" /> Confirm & Commit
      </button>
    </div>
  );
}

export function RoyFloatingCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('roy_sessions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [{ id: uid(), title: 'New Chat', messages: [], history: [] }];
  });
  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id ?? 'init');

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    localStorage.setItem('roy_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isLoading, isOpen]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: uid(),
      title: `Chat ${sessions.length + 1}`,
      messages: [],
      history: []
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  };

  const addMessage = (sessionId: string, msg: Message) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, messages: [...s.messages, msg] } : s
    ));
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!inputText.trim() && !pendingFile) || isLoading) return;

    if (pendingFile) {
      const cap = inputText.trim();
      setInputText('');
      setPendingFile(null);
      await processFile(pendingFile, cap);
      return;
    }

    const userText = inputText.trim();
    const sessionId = activeSessionId;
    setInputText('');
    setIsLoading(true);

    const userMsg: Message = { id: uid(), role: 'user', content: userText };
    addMessage(sessionId, userMsg);

    // Build new history with user message
    const updatedHistory = [
      ...activeSession.history,
      { role: 'user' as const, parts: [{ text: userText }] }
    ];

    try {
      // Gather real-time context from local DB
      const stockItems = await db.stockItems.toArray();
      const purchaseOrders = await db.purchaseOrders.toArray();
      
      const stockSummary = stockItems.map(s => `${s.name}: ${s.quantity} ${s.unit}`).join(', ') || 'No stock available';
      const poSummary = purchaseOrders.map(p => `${p.materialName} (${p.quantity} ${p.unit}) - ${p.status}`).join(', ') || 'No active purchase orders';
      
      const systemContext = `
[REAL-TIME DATABASE CONTEXT]
Current Inventory Stock:
${stockSummary}

Active Purchase Orders Pipeline:
${poSummary}
[END REAL-TIME DATABASE CONTEXT]
`;

      const result = await askRoy(userText, activeSession.history, systemContext);

      const assistantMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: result.text,
        isMock: result.isMock
      };

      // Add model response to history
      const finalHistory = [
        ...updatedHistory,
        { role: 'model' as const, parts: [{ text: result.text }] }
      ];

      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, userMsg, assistantMsg], history: finalHistory }
          : s
      ));
    } catch (err) {
      const errMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: '❌ Something went wrong connecting to Roy. Please try again.',
        isMock: true
      };
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, messages: [...s.messages, userMsg, errMsg] } : s
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const processFile = async (file: File, caption?: string) => {
    const sessionId = activeSessionId;
    setIsLoading(true);

    const userMsg: Message = {
      id: uid(),
      role: 'user',
      content: `📎 Uploaded: **${file.name}** (${(file.size / 1024).toFixed(1)} KB)${caption ? `\n\n*${caption}*` : ''}`
    };
    addMessage(sessionId, userMsg);

    try {
      let fileData: any;

      if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const text = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
        fileData = { text };
      } else if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        const getBase64 = () => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
        });
        const base64 = await getBase64();
        fileData = { inlineData: { data: base64, mimeType: file.type } };
      } else {
        const text = await file.text();
        fileData = { text };
      }

      const parsed = await parseDocumentWithRoy(fileData, file.name, caption);

      if (parsed) {
        const hasIssues = parsed.flaggedIssues && parsed.flaggedIssues.length > 0;
        const actionMsg: Message = {
          id: uid(),
          role: 'assistant',
          content: `I've analyzed **${file.name}**. It appears to be a **${parsed.documentType || 'Document'}** intended for \`${parsed.targetTable}\`.${hasIssues ? ' ⚠️ I found some issues you need to review.' : ' Review the extracted data below and confirm to commit.'}`,
          isActionCard: true,
          actionPayload: parsed.extractedData,
          targetTable: parsed.targetTable,
          flaggedIssues: parsed.flaggedIssues || []
        };
        addMessage(sessionId, actionMsg);
      } else {
        const mockPayload = {
          supplier: 'Mock Supplier',
          materialName: 'Mock Material',
          quantity: 100,
        };
        const actionMsg: Message = {
          id: uid(),
          role: 'assistant',
          content: `Running in **mock mode** (no API key). Here's a demo of how Roy would parse **${file.name}**. Add \`VITE_GEMINI_API_KEY\` to \`.env.local\` for live AI extraction.`,
          isActionCard: true,
          actionPayload: mockPayload,
          targetTable: 'purchaseOrders',
          flaggedIssues: ['This is a mock warning: Missing phone number', 'Mock warning: quantity looks suspicious'],
          isMock: true
        };
        addMessage(sessionId, actionMsg);
      }
    } catch (err) {
      const errMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: '❌ Failed to parse this file. Please ensure it is a valid document format.'
      };
      addMessage(sessionId, errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    // Reset so same file can be re-uploaded
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setPendingFile(file);
  };

  const handleCommitData = async (payload: any | any[], targetTable: string, messageId: string) => {
    try {
      const items = Array.isArray(payload) ? payload : [payload];

      if (targetTable === 'purchaseOrders') {
        const suppliers = await db.supplierProfiles.toArray();
        const supplierId = suppliers.length > 0 ? suppliers[0].id! : 1;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 30);
        
        const mapped = items.map(p => ({
          supplierId,
          materialName: p.materialName || p.material || 'Unknown Material',
          quantity: Number(p.quantity) || 1,
          unit: p.unit || 'MT',
          specifications: {
            gsm: p.gsm,
            grade: p.grade,
            dimensions: p.dimensions,
            notes: p.notes,
            unitPrice: p.unitPrice,
            currency: p.currency,
          },
          status: 'In Production' as const,
          orderDate: new Date().toISOString(),
          targetDate: targetDate.toISOString(),
          raw_metadata: p,
          syncStatus: 'pending' as const
        }));
        await db.purchaseOrders.bulkAdd(mapped);

      } else if (targetTable === 'clients') {
        const mapped = items.map(p => ({
          companyName: p.name || p.companyName || p.client || 'Standard Client Profile',
          tin: p.tin || p.vat || '',
          contactPerson: p.contactPerson || '',
          phone: p.phone || '',
          email: p.email || '',
          region: p.region || p.address || '',
          paymentTerms: p.paymentTerms || 'Standard',
          creditLimit: Number(p.creditLimit) || 0,
          creditCurrency: (p.preferredCurrency || p.currency || 'RWF') as 'RWF'|'USD',
          notes: p.notes || '',
          boxModels: p.boxModels || '',
          totalOrders: Number(p.totalOrders) || 0,
          totalQuantityProduced: Number(p.totalQuantityProduced) || 0,
          lastOrderDate: p.lastOrderDate || '',
          raw_metadata: p,
          syncStatus: 'pending' as const
        }));
        await db.clientProfiles.bulkAdd(mapped);

      } else if (targetTable === 'suppliers') {
        const mapped = items.map(p => {
          const contactArr = [];
          if (p.contactPerson) contactArr.push(p.contactPerson);
          if (p.phone) contactArr.push(p.phone);
          if (p.email) contactArr.push(p.email);
          if (p.tin || p.vat) contactArr.push(`TIN/VAT: ${p.tin || p.vat}`);

          return {
            name: p.name || p.companyName || p.supplier || 'Unknown Supplier',
            categories: p.categories || ['General'],
            contactInfo: contactArr.join(' | ') || 'No contact info',
            address: p.address || '',
            paymentTerms: p.paymentTerms || '',
            preferredCurrency: (p.preferredCurrency || p.currency || 'USD') as 'RWF'|'USD',
            leadTimeDays: Number(p.leadTimeDays) || 30,
            raw_metadata: p,
            syncStatus: 'pending' as const
          };
        });
        await db.supplierProfiles.bulkAdd(mapped);

      } else if (targetTable === 'stockItems') {
        const mapped = items.map(p => ({
          name: p.name || p.materialName || 'Unknown Item',
          category: p.category || 'General',
          quantity: Number(p.quantity) || 0,
          unit: p.unit || 'MT',
          reorderPoint: Number(p.reorderPoint || p.minThreshold) || 10,
          safetyStock: Number(p.safetyStock) || 0,
          unitCost: Number(p.unitCost) || 0,
          unitCostCurrency: (p.currency || 'USD') as 'RWF'|'USD',
          batchRef: p.batchRef || `B-${Date.now().toString().slice(-6)}`,
          attributes: p.attributes || {},
          lastUpdated: new Date().toISOString(),
          location: p.location || 'Warehouse A',
          raw_metadata: p,
          syncStatus: 'pending' as const
        }));
        await db.stockItems.bulkAdd(mapped);
      }

      // Mark message as committed
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId
          ? {
            ...s,
            messages: s.messages.map(m =>
              m.id === messageId
                ? { ...m, isActionCard: false, actionCommitted: true, content: `✅ Document data has been committed to **${targetTable}**!` }
                : m
            )
          }
          : s
      ));
    } catch (error) {
      alert('Failed to commit data: ' + error);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 group flex items-center gap-2 py-3 px-4 rounded-full shadow-2xl transition-all duration-300 border',
          'bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl',
          'border-indigo-200 dark:border-indigo-500/30',
          'text-indigo-600 dark:text-indigo-400',
          'hover:scale-105 hover:shadow-indigo-500/20 hover:bg-white dark:hover:bg-slate-800',
          isOpen && 'opacity-0 scale-90 pointer-events-none'
        )}
      >
        <Bot className="w-6 h-6" />
        <span className="text-sm font-semibold">Roy</span>
        <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
      </button>

      {/* Full Chat Window */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 w-[860px] h-[620px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-24px)]',
          'bg-white/97 dark:bg-slate-900/97 backdrop-blur-3xl',
          'shadow-2xl shadow-black/20 rounded-2xl border border-gray-200 dark:border-slate-700',
          'flex overflow-hidden transition-all duration-300 origin-bottom-right',
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        )}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-indigo-500/20 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-400 pointer-events-none">
            <FileText className="w-12 h-12 text-indigo-400 mb-3" />
            <p className="text-indigo-600 dark:text-indigo-300 font-semibold">Drop to let Roy parse this document</p>
          </div>
        )}

        {/* ── LEFT: Session Sidebar ─────────────────────── */}
        <div className="hidden sm:flex w-56 border-r border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30 flex-col shrink-0">
          <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-500" />
              <span className="font-bold text-gray-800 dark:text-white text-sm">Roy</span>
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-2">
            <button
              onClick={createNewSession}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors truncate',
                  activeSessionId === session.id
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white font-semibold border border-gray-100 dark:border-slate-600'
                    : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-50" />
                <span className="truncate">{session.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Chat Area ──────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {activeSession.messages.length === 0 && !isLoading && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-60 select-none">
                <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4 shadow-inner">
                  <Bot className="w-10 h-10 text-indigo-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-700 dark:text-white mb-2">Hi, I'm Roy ✨</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xs leading-relaxed">
                  Ask me anything about inventory, suppliers, or procurement — or drag-and-drop a document for instant AI parsing.
                </p>
              </div>
            )}

            {activeSession.messages.map(msg => (
              <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[82%] text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-indigo-500 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-md shadow-indigo-200 dark:shadow-indigo-900/20'
                    : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 border border-gray-100 dark:border-slate-700 shadow-sm'
                )}>
                  {/* Mock badge */}
                  {msg.isMock && msg.role === 'assistant' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full mb-2 border border-amber-200 dark:border-amber-500/20">
                      ⚠ Mock Mode
                    </span>
                  )}

                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Interactive Action Card */}
                  {msg.isActionCard && msg.actionPayload && !msg.actionCommitted && (
                    <ActionCard msg={msg} onCommit={handleCommitData} />
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 shadow-sm">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(delay => (
                      <span key={delay} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-slate-500">Roy is thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
            {pendingFile && (
              <div className="mb-2 flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-500/30">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">{pendingFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.txt,.csv,.json,image/*"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload a document for Roy to parse"
                className="p-2.5 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors shrink-0"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <div className="flex-1 flex items-center bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 focus-within:border-slate-300 dark:focus-within:border-slate-600 focus-within:ring-1 focus-within:ring-slate-300/50 dark:focus-within:ring-slate-600/50 transition-colors">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={pendingFile ? "Add a caption before sending..." : "Ask Roy about inventory, suppliers, procurement…"}
                  disabled={isLoading}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2.5 text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={(!inputText.trim() && !pendingFile) || isLoading}
                className="p-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-md shadow-indigo-500/20 shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 text-center">
              Drag & drop PDFs, CSVs, or images to parse with Roy's Document Intelligence
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
