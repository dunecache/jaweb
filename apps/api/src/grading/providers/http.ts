import type { ProviderName } from "@jaweb/shared";

import { GRADER_SYSTEM_PROMPT, gradeUserContent } from "../prompt";
import type { GradeInput, GradeProvider } from "../provider";
import { parseGradeResult, parseJsonText, timedTest } from "../provider";

type Config = {
  provider: ProviderName;
  model: string;
  apiKey: string | null;
  baseUrl?: string | null;
};

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  return (await response.json()) as unknown;
}

function fieldText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value;
}

function openAiCompatible(config: Config): GradeProvider {
  const base = (config.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const headers: Record<string, string> = config.apiKey
    ? { authorization: `Bearer ${config.apiKey}` }
    : {};
  async function grade(input: GradeInput) {
    const payload = await postJson(`${base}/chat/completions`, headers, {
      model: config.model,
      temperature: 0,
      max_tokens: 256,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: GRADER_SYSTEM_PROMPT },
        { role: "user", content: gradeUserContent(input) },
      ],
    });
    const choices = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
    const text = fieldText(choices?.[0]?.message?.content);
    if (!text) throw new Error("Empty provider response");
    return parseGradeResult(parseJsonText(text));
  }
  return {
    name: config.provider,
    grade,
    test: () =>
      timedTest(async () => {
        await grade({ question: "ping", modelAnswer: "ping", keyPoints: [], answer: "ping" });
      }),
  };
}

function google(config: Config): GradeProvider {
  const key = config.apiKey ?? "";
  async function grade(input: GradeInput) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(key)}`;
    const payload = await postJson(
      url,
      {},
      {
        systemInstruction: { parts: [{ text: GRADER_SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: gradeUserContent(input) }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 256,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              score: { type: "NUMBER" },
              verdict: { type: "STRING" },
              confidence: { type: "NUMBER" },
              feedback: { type: "STRING" },
            },
            required: ["score", "verdict", "confidence", "feedback"],
          },
        },
      },
    );
    const text = fieldText(
      (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> })
        .candidates?.[0]?.content?.parts?.[0]?.text,
    );
    if (!text) throw new Error("Empty Gemini response");
    return parseGradeResult(parseJsonText(text));
  }
  return {
    name: "google",
    grade,
    test: () =>
      timedTest(async () => {
        await grade({ question: "ping", modelAnswer: "ping", keyPoints: [], answer: "ping" });
      }),
  };
}

function anthropic(config: Config): GradeProvider {
  async function grade(input: GradeInput) {
    const payload = await postJson(
      "https://api.anthropic.com/v1/messages",
      {
        "x-api-key": config.apiKey ?? "",
        "anthropic-version": "2023-06-01",
      },
      {
        model: config.model,
        max_tokens: 256,
        temperature: 0,
        system: GRADER_SYSTEM_PROMPT,
        messages: [{ role: "user", content: gradeUserContent(input) }],
      },
    );
    const text = fieldText((payload as { content?: Array<{ text?: unknown }> }).content?.[0]?.text);
    if (!text) throw new Error("Empty Anthropic response");
    return parseGradeResult(parseJsonText(text));
  }
  return {
    name: "anthropic",
    grade,
    test: () =>
      timedTest(async () => {
        await grade({ question: "ping", modelAnswer: "ping", keyPoints: [], answer: "ping" });
      }),
  };
}

function ollama(config: Config): GradeProvider {
  const base = (config.baseUrl ?? "http://localhost:11434").replace(/\/$/, "");
  async function grade(input: GradeInput) {
    const payload = await postJson(
      `${base}/api/generate`,
      {},
      {
        model: config.model,
        stream: false,
        format: "json",
        options: { temperature: 0 },
        prompt: `${GRADER_SYSTEM_PROMPT}\n\n${gradeUserContent(input)}`,
      },
    );
    const text = fieldText((payload as { response?: unknown }).response);
    if (!text) throw new Error("Empty Ollama response");
    return parseGradeResult(parseJsonText(text));
  }
  return {
    name: "ollama",
    grade,
    test: () =>
      timedTest(async () => {
        await grade({ question: "ping", modelAnswer: "ping", keyPoints: [], answer: "ping" });
      }),
  };
}

export function httpProvider(config: Config): GradeProvider {
  switch (config.provider) {
    case "google":
      return google(config);
    case "anthropic":
      return anthropic(config);
    case "ollama":
      return ollama(config);
    default:
      return openAiCompatible(config);
  }
}
