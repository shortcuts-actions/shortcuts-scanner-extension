import { faker } from '@faker-js/faker';

export const apiKeyFactory = {
  /**
   * Generate a valid OpenAI API key
   */
  openai: () => `sk-proj-${faker.string.alphanumeric(48)}`,

  /**
   * Generate a valid Anthropic API key
   */
  anthropic: () => `sk-ant-api03-${faker.string.alphanumeric(95)}`,

  /**
   * Generate a valid OpenRouter API key
   */
  openrouter: () => `sk-or-v1-${faker.string.alphanumeric(64)}`,

  /**
   * Generate a password
   */
  password: (strong = true) => {
    if (strong) {
      // Generate a strong password that meets requirements
      const upper = faker.string.alpha({ length: 3, casing: 'upper' });
      const lower = faker.string.alpha({ length: 3, casing: 'lower' });
      const numbers = faker.string.numeric(3);
      const special = '!@#$%';
      return `${upper}${lower}${numbers}${special}`;
    }
    return faker.internet.password({ length: 8 });
  },

  /**
   * Generate a random provider name
   */
  provider: () => faker.helpers.arrayElement(['openai', 'anthropic', 'openrouter'] as const),
};
