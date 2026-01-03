// Multi-provider LLM client service for security analysis

import type { SupportedProvider } from '../../utils/analysis-types';

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface LLMError {
  code: 'RATE_LIMIT' | 'INVALID_KEY' | 'NETWORK_ERROR' | 'API_ERROR' | 'PARSE_ERROR';
  message: string;
  retryAfterMs?: number;
  rawResponse?: string;
}

const ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
} as const;

const DEFAULT_TIMEOUT = 120000; // 2 minutes

export class LLMClientService {
  async call(
    provider: SupportedProvider,
    model: string,
    apiKey: string,
    request: LLMRequest,
  ): Promise<LLMResponse> {
    switch (provider) {
      case 'openai':
        return this.callOpenAI(apiKey, model, request);
      case 'anthropic':
        return this.callAnthropic(apiKey, model, request);
      case 'openrouter':
        return this.callOpenRouter(apiKey, model, request);
      default:
        throw this.createError('API_ERROR', `Unsupported provider: ${provider}`);
    }
  }

  private async callOpenAI(
    apiKey: string,
    model: string,
    request: LLMRequest,
  ): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const response = await fetch(ENDPOINTS.openai, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
          max_tokens: request.maxTokens,
          temperature: request.temperature ?? 0.3,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response, 'openai');
      }

      const data = await response.json();

      return {
        content: data.choices[0]?.message?.content || '',
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleFetchError(error);
    }
  }

  private async callAnthropic(
    apiKey: string,
    model: string,
    request: LLMRequest,
  ): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const response = await fetch(ENDPOINTS.anthropic, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: request.maxTokens,
          temperature: request.temperature ?? 0.3,
          system: request.systemPrompt,
          messages: [{ role: 'user', content: request.userPrompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response, 'anthropic');
      }

      const data = await response.json();

      // Extract text from content blocks
      const textContent = data.content
        ?.filter((block: { type: string }) => block.type === 'text')
        .map((block: { text: string }) => block.text)
        .join('');

      return {
        content: textContent || '',
        usage: {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleFetchError(error);
    }
  }

  private async callOpenRouter(
    apiKey: string,
    model: string,
    request: LLMRequest,
  ): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const response = await fetch(ENDPOINTS.openrouter, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': chrome.runtime.getURL(''),
          'X-Title': 'Shortcuts Scanner',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
          max_tokens: request.maxTokens,
          temperature: request.temperature ?? 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response, 'openrouter');
      }

      const data = await response.json();

      return {
        content: data.choices[0]?.message?.content || '',
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleFetchError(error);
    }
  }

  private async handleErrorResponse(
    response: Response,
    _provider: SupportedProvider,
  ): Promise<never> {
    const status = response.status;

    // Try to get error details from response body
    let errorBody = '';
    let errorMessage = '';
    try {
      errorBody = await response.text();
      // Try to parse as JSON to extract error message
      const errorJson = JSON.parse(errorBody);
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message;
      } else if (errorJson.message) {
        errorMessage = errorJson.message;
      } else if (errorJson.error) {
        errorMessage =
          typeof errorJson.error === 'string' ? errorJson.error : JSON.stringify(errorJson.error);
      }
    } catch {
      // If not JSON, use the raw error body
      errorMessage = errorBody.slice(0, 200);
    }

    // Rate limit
    if (status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const retryAfterMs = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : 60000;

      throw this.createError(
        'RATE_LIMIT',
        errorMessage || 'Rate limited. Please wait before trying again.',
        retryAfterMs,
      );
    }

    // Invalid API key
    if (status === 401 || status === 403) {
      throw this.createError(
        'INVALID_KEY',
        errorMessage || 'Invalid API key. Please check your key in Settings.',
      );
    }

    // Payment required (e.g., insufficient credits)
    if (status === 402) {
      throw this.createError(
        'API_ERROR',
        errorMessage || 'Payment required. Please check your account credits or billing.',
      );
    }

    // Other API errors
    throw this.createError(
      'API_ERROR',
      errorMessage || `API error (${status})`,
      undefined,
      errorBody,
    );
  }

  private handleFetchError(error: unknown): LLMError {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return this.createError('NETWORK_ERROR', 'Request timed out. Please try again.');
      }
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        return this.createError('NETWORK_ERROR', 'Network error. Please check your connection.');
      }
      // Re-throw if it's already an LLMError
      if ('code' in error) {
        throw error;
      }
      // Return the error message for standard Error objects
      return this.createError('API_ERROR', error.message);
    }

    // Handle non-Error objects
    if (typeof error === 'object' && error !== null) {
      // Try to extract meaningful information from the error object
      if ('message' in error && typeof error.message === 'string') {
        return this.createError('API_ERROR', error.message);
      }
      // Fallback to JSON stringify for objects
      try {
        return this.createError('API_ERROR', `Unexpected error: ${JSON.stringify(error)}`);
      } catch {
        return this.createError('API_ERROR', 'An unexpected error occurred');
      }
    }

    return this.createError('API_ERROR', `Unexpected error: ${String(error)}`);
  }

  private createError(
    code: LLMError['code'],
    message: string,
    retryAfterMs?: number,
    rawResponse?: string,
  ): LLMError {
    const error: LLMError = { code, message };
    if (retryAfterMs !== undefined) error.retryAfterMs = retryAfterMs;
    if (rawResponse !== undefined) error.rawResponse = rawResponse;
    return error;
  }

  /**
   * Parse JSON from LLM response with fallback handling
   */
  parseJSON<T>(content: string): T {
    // Try direct parse first
    try {
      return JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch?.[1]) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch {
          // Fall through to error
        }
      }

      // Try to find JSON object in response
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[0]);
        } catch {
          // Fall through to error
        }
      }

      throw this.createError(
        'PARSE_ERROR',
        'Failed to parse AI response as JSON',
        undefined,
        content,
      );
    }
  }
}

export const llmClientService = new LLMClientService();
