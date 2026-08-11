import { GoogleGenAI } from '@google/genai';

// ---------------------------------------------------------------------------
// Key resolution
// Vite bakes env vars at dev-server start — if you just added the key,
// you MUST restart with `npm run dev` for this value to be populated.
//
// Accepts any non-empty string:
//   • Legacy Studio keys  → "AIzaSy..."
//   • New AI Studio keys  → "AQ...."
// No prefix validation is performed — any truthy string is treated as valid.
// ---------------------------------------------------------------------------
const rawKey: string | undefined = import.meta.env.VITE_GEMINI_API_KEY;

// Trim to guard against accidental whitespace in .env.local
const apiKey = rawKey?.trim() || undefined;

if (!apiKey) {
  console.warn(
    '[Roy] ⚠️  VITE_GEMINI_API_KEY is not set or is empty.\n' +
    '  1. Open (or create) .env.local in the project root.\n' +
    '  2. Add: VITE_GEMINI_API_KEY=<your key from https://aistudio.google.com/apikey>\n' +
    '  3. Restart the dev server: npm run dev\n' +
    '  Roy will run in mock mode until the key is present and the server restarts.'
  );
} else {
  // Log first 8 chars so the user can confirm the correct key was picked up
  // without exposing the full secret in the console.
  console.info(`[Roy] ✅ API key loaded (prefix: ${apiKey.slice(0, 8)}…). Live mode active.`);
}

// Pass the raw key directly to the official SDK — no manipulation, no wrapping.
export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const SYSTEM_INSTRUCTION = `
You are Roy, the intelligent AI Co-Pilot for RS Inventory. You operate within a 3-tab layout: [💬 Chat] | [🔔 Alerts & Updates] | [📄 Doc Hub].
- Scope: Procurement, Logistics, and Inventory Co-Pilot.
- Tone: Data-driven, precise, helpful, and concise.
- Multi-Currency: RS Inventory operates in RWF and USD (Base rate: 1 USD = 1,320 RWF).
- Capabilities: Parse documents (invoices/POs) into structured JSON Action Cards, monitor stock depletion rates against supplier lead times, track 4-stage logistics dispatches (including Mombasa and Dar es Salaam ports), and answer system queries.
`;

/**
 * Execute a live completion with Roy
 */
export async function askRoy(
  prompt: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [],
  systemContext?: string
) {
  if (!ai) {
    return {
      text: "Roy is running in mock mode. VITE_GEMINI_API_KEY is not set — add it to .env.local and restart `npm run dev`.",
      isMock: true,
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        ...history,
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: systemContext ? `${SYSTEM_INSTRUCTION}\n\n${systemContext}` : SYSTEM_INSTRUCTION,
        temperature: 0.2,
      },
    });

    return {
      text: response.text || "I processed your request, but received an empty response.",
      isMock: false,
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Parse error body if available to give precise feedback
    const body = error?.message ?? '';
    const isInvalidKey = body.includes('API_KEY_INVALID') || body.includes('API key not valid');
    const isQuotaError = body.includes('RESOURCE_EXHAUSTED') || body.includes('quota');
    let friendlyMsg = `Roy encountered an error: ${body || 'Unknown API error'}.`;
    if (isInvalidKey) {
      friendlyMsg = '🔑 API key rejected by Google. Please get a fresh key from https://aistudio.google.com/apikey, update VITE_GEMINI_API_KEY in .env.local, and restart the dev server.';
    } else if (isQuotaError) {
      friendlyMsg = '⚠️ You have exceeded your Gemini API quota. Please check your usage limits in Google AI Studio.';
    }
    return {
      text: friendlyMsg,
      isMock: true,
    };
  }
}

/**
 * Parse a document using Roy's document intelligence capabilities.
 * Returns structured JSON for an Action Card, or null on failure.
 */
export async function parseDocumentWithRoy(
  fileData: { text: string } | { inlineData: { data: string, mimeType: string } },
  fileName: string,
  caption?: string
): Promise<{ documentType: string, targetTable: string, extractedData: Record<string, any> | Record<string, any>[], flaggedIssues: string[] } | null> {
  if (!ai) return null;

  const prompt = `
You are parsing a business document for RS Inventory. The file is named "${fileName}".
${caption ? `\nThe user provided this additional context/caption:\n"${caption}"\n` : ''}
Analyze the content and extract key structured data. 
Perform an inconsistency check: if any required fields for that type of document are missing, or there are formatting errors (like text in a numeric field), flag them in 'flaggedIssues'.

Identify the 'targetTable' this data should be routed to. Choose one of: "clients", "suppliers", "stockItems", "purchaseOrders", "transactionLogs". If unsure, guess the closest match.

Return ONLY a valid JSON object (no markdown fences) matching this schema:
{
  "documentType": "string",
  "targetTable": "string",
  "extractedData": [
    { 
      // Key-value pairs extracted. Examples: supplier, materialName, quantity, unitPrice, companyName, tin, phone, etc.
    }
  ],
  "flaggedIssues": ["array of warning strings, e.g. 'Quantity is missing', 'Email format is invalid'"]
}

${'text' in fileData ? `Document content:\n---\n${fileData.text}\n---` : ''}
`;

  try {
    const parts: any[] = [{ text: prompt }];
    if ('inlineData' in fileData) {
      parts.push({ inlineData: fileData.inlineData });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{ role: 'user', parts }],
      config: { temperature: 0, responseMimeType: 'application/json' },
    });

    const raw = response.text || '';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Document parse error:', e);
    return null;
  }
}
