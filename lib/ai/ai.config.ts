/**
 * @file lib/ai/ai.config.ts
 * @description Centralized configuration and resilience wrapper for Google Gemini AI models.
 * Provides model instantiation via LangChain's Google GenAI integration and a fault-tolerant
 * wrapper (`safeCallGemini`) ensuring zero runtime crashes during API rate limits or outages.
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * Instantiates a configured Google Gemini Chat model.
 *
 * @param {number} [temperature=0.2] - Sampling temperature controlling response creativity (0.0 = deterministic, 1.0 = creative).
 * @returns {ChatGoogleGenerativeAI} Configured LangChain Google Generative AI Chat instance.
 */
export function getGeminiModel(temperature = 0.2): ChatGoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.warn("[Gemini AI] GOOGLE_API_KEY environment variable is not configured.");
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  return new ChatGoogleGenerativeAI({
    model: modelName,
    apiKey: apiKey || "dummy_key",
    temperature,
  });
}

/**
 * Execution result wrapper interface returned by safeCallGemini.
 *
 * @template T
 * @property {T} data - The output data payload from AI invocation or fallback value.
 * @property {boolean} isFallback - Flag indicating whether fallback data was returned instead of live AI output.
 * @property {string} [error] - Error message string if the execution failed or API key was missing.
 */
export interface SafeCallGeminiResult<T> {
  data: T;
  isFallback: boolean;
  error?: string;
}

/**
 * Production-grade resilience wrapper for Gemini AI calls.
 * Catches API key omissions, HTTP 429 rate limits, network timeouts, and model errors,
 * ensuring the application degrades gracefully by returning structured fallback data.
 *
 * @template T
 * @param {() => Promise<T>} callFn - Async function executing the Gemini AI invocation.
 * @param {T} fallbackValue - Default payload to return if the AI call fails or is unavailable.
 * @param {string} [errorContext="AI Operation"] - Context string for descriptive error logging.
 * @returns {Promise<SafeCallGeminiResult<T>>} Object containing result payload, fallback status, and optional error message.
 */
export async function safeCallGemini<T>(
  callFn: () => Promise<T>,
  fallbackValue: T,
  errorContext = "AI Operation"
): Promise<SafeCallGeminiResult<T>> {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      console.warn(`[Gemini AI] Skipping ${errorContext}: GOOGLE_API_KEY is missing.`);
      return { data: fallbackValue, isFallback: true, error: "GOOGLE_API_KEY not configured" };
    }

    const data = await callFn();
    return { data, isFallback: false };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Gemini AI Error] ${errorContext} failed:`, errorMsg);
    return { data: fallbackValue, isFallback: true, error: errorMsg };
  }
}
