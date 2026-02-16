import dotenv from 'dotenv'
dotenv.config("../.env")
export const CONFIG = {
  SCAM_THRESHOLD: 45,
  MIN_TURNS: 6,
  MAX_TURNS: 8,
  CALLBACK_URL: 'https://hackathon.guvi.in/api/updateHoneyPotFinalResult',
  CALLBACK_TIMEOUT: 5000,
  USE_PERPLEXITY: true,
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY  ,
  PERPLEXITY_URL: 'https://api.perplexity.ai/chat/completions',
  PERPLEXITY_TIMEOUT: 2500,
  PERPLEXITY_TRIGGER_TURNS_MAX: 3

  
};
console.log('🔑 PERPLEXITY_API_KEY loaded:', process.env.PERPLEXITY_API_KEY ? '✅ YES' : '❌ NO');
console.log('🔑 Key length:', process.env.PERPLEXITY_API_KEY?.length || 0);