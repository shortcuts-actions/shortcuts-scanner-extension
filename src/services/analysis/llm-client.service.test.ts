import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMClientService, type LLMRequest } from './llm-client.service';

describe('LLMClientService', () => {
	let service: LLMClientService;
	let mockFetch: ReturnType<typeof vi.fn>;

	const baseRequest: LLMRequest = {
		systemPrompt: 'You are a helpful assistant',
		userPrompt: 'Test prompt',
		maxTokens: 1000,
		temperature: 0.3,
	};

	beforeEach(() => {
		service = new LLMClientService();
		mockFetch = vi.fn();
		globalThis.fetch = mockFetch;
		(globalThis as any).chrome = {
			runtime: {
				getURL: vi.fn(() => 'chrome-extension://test-id/'),
			},
		};
	});

	describe('call', () => {
		it('should route to OpenAI for openai provider', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					choices: [{ message: { content: 'response' } }],
					usage: { prompt_tokens: 10, completion_tokens: 20 },
				}),
			});

			await service.call('openai', 'gpt-4', 'test-key', baseRequest);

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.openai.com/v1/chat/completions',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						Authorization: 'Bearer test-key',
					}),
				}),
			);
		});

		it('should route to Anthropic for anthropic provider', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					content: [{ type: 'text', text: 'response' }],
					usage: { input_tokens: 10, output_tokens: 20 },
				}),
			});

			await service.call('anthropic', 'claude-3-opus-20240229', 'test-key', baseRequest);

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.anthropic.com/v1/messages',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'x-api-key': 'test-key',
						'anthropic-version': '2023-06-01',
					}),
				}),
			);
		});

		it('should route to OpenRouter for openrouter provider', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					choices: [{ message: { content: 'response' } }],
					usage: { prompt_tokens: 10, completion_tokens: 20 },
				}),
			});

			await service.call('openrouter', 'model-name', 'test-key', baseRequest);

			expect(mockFetch).toHaveBeenCalledWith(
				'https://openrouter.ai/api/v1/chat/completions',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						Authorization: 'Bearer test-key',
						'HTTP-Referer': 'chrome-extension://test-id/',
					}),
				}),
			);
		});

		it('should throw error for unsupported provider', async () => {
			await expect(
				service.call('unsupported' as any, 'model', 'key', baseRequest),
			).rejects.toMatchObject({
				code: 'API_ERROR',
				message: expect.stringContaining('Unsupported provider'),
			});
		});
	});

	describe('callOpenAI', () => {
		it('should make correct request to OpenAI API', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					choices: [{ message: { content: 'Test response' } }],
					usage: { prompt_tokens: 50, completion_tokens: 100 },
				}),
			});

			const result = await service.call('openai', 'gpt-4', 'openai-key', baseRequest);

			expect(result.content).toBe('Test response');
			expect(result.usage.inputTokens).toBe(50);
			expect(result.usage.outputTokens).toBe(100);
		});

		it('should include JSON response format for OpenAI', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					choices: [{ message: { content: '{}' } }],
					usage: {},
				}),
			});

			await service.call('openai', 'gpt-4', 'key', baseRequest);

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body);
			expect(body.response_format).toEqual({ type: 'json_object' });
		});

		it('should handle missing content in response', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					choices: [],
					usage: {},
				}),
			});

			const result = await service.call('openai', 'gpt-4', 'key', baseRequest);
			expect(result.content).toBe('');
		});

		it('should handle API errors', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 401,
				headers: { get: () => null },
				text: async () => 'Unauthorized',
			});

			await expect(service.call('openai', 'gpt-4', 'bad-key', baseRequest)).rejects.toBeDefined();
		});

		it('should handle network timeout', async () => {
			mockFetch.mockImplementation(
				() =>
					new Promise((_, reject) => {
						setTimeout(() => reject(new DOMException('The user aborted a request', 'AbortError')), 1);
					}),
			);

			await expect(service.call('openai', 'gpt-4', 'key', baseRequest)).rejects.toMatchObject({
				code: 'NETWORK_ERROR',
				message: expect.stringContaining('timed out'),
			});
		});
	});

	describe('callAnthropic', () => {
		it('should make correct request to Anthropic API', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					content: [{ type: 'text', text: 'Claude response' }],
					usage: { input_tokens: 30, output_tokens: 70 },
				}),
			});

			const result = await service.call('anthropic', 'claude-3-opus-20240229', 'key', baseRequest);

			expect(result.content).toBe('Claude response');
			expect(result.usage.inputTokens).toBe(30);
			expect(result.usage.outputTokens).toBe(70);
		});

		it('should include anthropic headers', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					content: [{ type: 'text', text: 'response' }],
					usage: {},
				}),
			});

			await service.call('anthropic', 'claude-3-opus-20240229', 'key', baseRequest);

			const callArgs = mockFetch.mock.calls[0][1];
			expect(callArgs.headers['anthropic-version']).toBe('2023-06-01');
			expect(callArgs.headers['anthropic-dangerous-direct-browser-access']).toBe('true');
		});

		it('should handle multiple text blocks', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					content: [
						{ type: 'text', text: 'Part 1' },
						{ type: 'text', text: 'Part 2' },
					],
					usage: {},
				}),
			});

			const result = await service.call('anthropic', 'claude-3-opus-20240229', 'key', baseRequest);
			expect(result.content).toBe('Part 1Part 2');
		});

		it('should filter non-text content blocks', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					content: [
						{ type: 'text', text: 'Text content' },
						{ type: 'image', data: 'binary' },
					],
					usage: {},
				}),
			});

			const result = await service.call('anthropic', 'claude-3-opus-20240229', 'key', baseRequest);
			expect(result.content).toBe('Text content');
		});
	});

	describe('callOpenRouter', () => {
		it('should make correct request to OpenRouter API', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					choices: [{ message: { content: 'OpenRouter response' } }],
					usage: { prompt_tokens: 40, completion_tokens: 60 },
				}),
			});

			const result = await service.call('openrouter', 'model', 'key', baseRequest);

			expect(result.content).toBe('OpenRouter response');
			expect(result.usage.inputTokens).toBe(40);
			expect(result.usage.outputTokens).toBe(60);
		});

		it('should include OpenRouter specific headers', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					choices: [{ message: { content: 'response' } }],
					usage: {},
				}),
			});

			await service.call('openrouter', 'model', 'key', baseRequest);

			const callArgs = mockFetch.mock.calls[0][1];
			expect(callArgs.headers['HTTP-Referer']).toBe('chrome-extension://test-id/');
			expect(callArgs.headers['X-Title']).toBe('Shortcuts Scanner');
		});
	});

	describe('error handling', () => {
		it('should handle forbidden errors', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 403,
				headers: { get: () => null },
				text: async () => 'Forbidden',
			});

			await expect(service.call('openai', 'gpt-4', 'key', baseRequest)).rejects.toBeDefined();
		});

		it('should handle 500 server error', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 500,
				headers: { get: () => null },
				text: async () => 'Internal server error',
			});

			await expect(service.call('openai', 'gpt-4', 'key', baseRequest)).rejects.toMatchObject({
				code: 'API_ERROR',
			});
		});

		it('should handle network error', async () => {
			mockFetch.mockRejectedValue(new Error('Failed to fetch'));

			await expect(service.call('openai', 'gpt-4', 'key', baseRequest)).rejects.toMatchObject({
				code: 'NETWORK_ERROR',
			});
		});

		it('should handle rate limit errors', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 429,
				headers: { get: () => null },
				text: async () => 'Rate limited',
			});

			await expect(service.call('openai', 'gpt-4', 'key', baseRequest)).rejects.toBeDefined();
		});
	});

	describe('parseJSON', () => {
		it('should parse valid JSON', () => {
			const result = service.parseJSON('{"key": "value"}');
			expect(result).toEqual({ key: 'value' });
		});

		it('should parse JSON from markdown code block', () => {
			const markdown = '```json\n{"key": "value"}\n```';
			const result = service.parseJSON(markdown);
			expect(result).toEqual({ key: 'value' });
		});

		it('should parse JSON from code block without language', () => {
			const markdown = '```\n{"key": "value"}\n```';
			const result = service.parseJSON(markdown);
			expect(result).toEqual({ key: 'value' });
		});

		it('should extract JSON object from text', () => {
			const text = 'Here is the result: {"key": "value"} and more text';
			const result = service.parseJSON(text);
			expect(result).toEqual({ key: 'value' });
		});

		it('should handle nested JSON', () => {
			const json = '{"outer": {"inner": "value"}}';
			const result = service.parseJSON(json);
			expect(result).toEqual({ outer: { inner: 'value' } });
		});

		it('should throw PARSE_ERROR for invalid JSON', () => {
			expect(() => service.parseJSON('invalid json')).toThrow();
			try {
				service.parseJSON('invalid json');
			} catch (error) {
				expect((error as any).code).toBe('PARSE_ERROR');
				expect((error as any).message).toContain('Failed to parse');
			}
		});

		it('should include raw response in parse error', () => {
			try {
				service.parseJSON('completely invalid');
			} catch (error) {
				expect((error as any).rawResponse).toBe('completely invalid');
			}
		});

		it('should handle arrays', () => {
			const result = service.parseJSON('[1, 2, 3]');
			expect(result).toEqual([1, 2, 3]);
		});

		it('should handle complex nested structures', () => {
			const complex = JSON.stringify({
				users: [
					{ name: 'Alice', age: 30 },
					{ name: 'Bob', age: 25 },
				],
				metadata: { count: 2 },
			});
			const result = service.parseJSON<{ users: any[]; metadata: { count: number } }>(complex);
			expect(result.users).toHaveLength(2);
			expect(result.metadata.count).toBe(2);
		});
	});

	describe('timeout handling', () => {
		it('should timeout after 2 minutes', async () => {
			vi.useFakeTimers();

			mockFetch.mockImplementation(
				() =>
					new Promise((_, reject) => {
						setTimeout(() => {
							reject(new DOMException('The user aborted a request', 'AbortError'));
						}, 125000); // 2:05 minutes
					}),
			);

			const promise = service.call('openai', 'gpt-4', 'key', baseRequest);

			vi.advanceTimersByTime(125000); // Advance past 2 minutes

			await expect(promise).rejects.toMatchObject({
				code: 'NETWORK_ERROR',
			});

			vi.useRealTimers();
		});
	});

	describe('integration scenarios', () => {
		it('should handle successful OpenAI request with all fields', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					choices: [
						{
							message: {
								content: JSON.stringify({
									analysis: 'complete',
									findings: [],
								}),
							},
						},
					],
					usage: {
						prompt_tokens: 100,
						completion_tokens: 200,
					},
				}),
			});

			const result = await service.call('openai', 'gpt-4', 'key', {
				systemPrompt: 'You are an analyzer',
				userPrompt: 'Analyze this',
				maxTokens: 2000,
				temperature: 0.5,
			});

			expect(result.content).toContain('analysis');
			expect(result.usage.inputTokens).toBe(100);
			expect(result.usage.outputTokens).toBe(200);

			const parsed = service.parseJSON<{ analysis: string; findings: any[] }>(result.content);
			expect(parsed.analysis).toBe('complete');
		});

		it('should handle rate limit with retry header', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 429,
				headers: { get: (key: string) => (key === 'Retry-After' ? '120' : null) },
				text: async () => 'Too many requests',
			});

			await expect(service.call('openai', 'gpt-4', 'key', baseRequest)).rejects.toBeDefined();
		});
	});
});
