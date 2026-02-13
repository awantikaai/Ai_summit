
export const CONFIG = {
  SCAM_THRESHOLD: 45,
  MIN_TURNS: 10,
  MAX_TURNS: 16,
  CALLBACK_URL: 'https://hackathon.guvi.in/api/updateHoneyPotFinalResult',
  CALLBACK_TIMEOUT: 5000,
  USE_PERPLEXITY: false,
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || '',
  PERPLEXITY_URL: 'https://api.perplexity.ai/chat/completions',
  PERPLEXITY_TIMEOUT: 2500,
  PERPLEXITY_TRIGGER_TURNS_MAX: 3
};
