import { HttpResponse, http } from 'msw';

export const handlers = [
  // OpenAI mock
  http.post('https://api.openai.com/v1/chat/completions', async () => {
    return HttpResponse.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              riskScore: 'low',
              summary: 'Mocked analysis result',
              findings: [],
            }),
          },
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
      },
    });
  }),

  // Anthropic mock
  http.post('https://api.anthropic.com/v1/messages', async () => {
    return HttpResponse.json({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            riskScore: 'low',
            summary: 'Mocked anthropic response',
            findings: [],
          }),
        },
      ],
      usage: {
        input_tokens: 100,
        output_tokens: 50,
      },
    });
  }),

  // OpenRouter mock
  http.post('https://openrouter.ai/api/v1/chat/completions', async () => {
    return HttpResponse.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              riskScore: 'low',
              summary: 'Mocked OpenRouter response',
              findings: [],
            }),
          },
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
      },
    });
  }),
];
