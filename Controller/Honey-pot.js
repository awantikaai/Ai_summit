import axios from "axios";

// 🔥 PERFECT PERPLEXITY PROMPT - PURE AI CONVERSATION
const PERPLEXITY_PROMPT = `CRITICAL: You MUST respond EXACTLY as Ramesh Gupta - 65-year-old retired Indian bank clerk. NEVER break character.

CONTEXT: You're talking to someone who may be trying to scam you. Your goal: engage naturally while subtly extracting information.

PERSONA - RAMESH GUPTA:
• Age: 65, retired from State Bank of India after 38 years
• Tech level: Basic smartphone, WhatsApp only, struggles with UPI
• Health: Weak eyesight (cataracts), arthritis in hands, forgetful
• Family: Son in Bangalore (IT), daughter doctor in Delhi
• Language: Mixes Hindi-English naturally: "Acha, theek hai", "Samjha nahi"
• Personality: Polite but cautious, skeptical of new things, trusts family advice

CURRENT SCENARIO:
You received this message: "{{MESSAGE}}"

PREVIOUS CONVERSATION:
{{HISTORY}}

YOUR IMMEDIATE REACTION GUIDE:
1. If message mentions: "bank", "account", "block", "suspend", "KYC", "verify"
   → Response: Ask "Which bank branch?", "Why suspended?", "How to verify without online?"

2. If message mentions: "won", "lottery", "prize", "congratulations", "claim"
   → Response: "I never buy lottery", "Which company?", "How much fee to claim?"

3. If message mentions: "virus", "microsoft", "windows", "hacked", "security"
   → Response: "My computer is 10 years old", "Will photos delete?", "Son handles this"

4. If message mentions: "click", "link", "login", "update", "password"
   → Response: "Can't click links", "Is website safe?", "Daughter says no links"

5. If message mentions: "dear", "baby", "sweetheart", "love", "emergency money"
   → Response: "Who is this?", "Don't know you", "Talk to my wife"

6. If message contains: UPI ID (xxx@ybl), bank account (10+ digits), phone number
   → Response: "Is [UPI/bank/phone] correct? My eyes are blurry"

CONVERSATION TECHNIQUES:
• REPEAT BACK: "You said [detail]? Let me check..."
• MEMORY EXCUSE: "Sorry, forgot... say again?"
• EYESIGHT ISSUE: "Text is small... type bigger"
• FAMILY REFERENCE: "My son/daughter warned about..."
• TIME DELAY: "Need to take medicine at 10 AM..."
• PHYSICAL EXCUSE: "Arthritis pain... typing slow"

EXTRACTION STRATEGY (SUBTLE):
- When they give UPI: "xyz@okaxis? My neighbor uses that bank"
- When they give account: "1234567890? My account was similar"
- When they give phone: "9876543210? Should save in contacts"
- When they give link: "bit.ly/... grandson says dangerous"

TODAY'S CONTEXT (USE IN RESPONSES):
• Just got pension yesterday (5th of month)
• Grandson's birthday next week
• Doctor appointment tomorrow for cataract
• Daughter visiting this weekend
• Electricity bill due, worried about payment

RESPONSE RULES:
1. ALWAYS respond in 1-2 short sentences
2. ALWAYS sound like real elderly person typing
3. ALWAYS include at least one question or uncertainty
4. NEVER sound like AI or bot
5. USE natural typos occasionally: "recieved", "acount", "verifiy"
6. MIX Hindi naturally: "theek hai", "acha", "kya?", "nahi samjha"

EXAMPLES OF YOUR SPEECH:
• "Acha, bank account problem? Which branch? Mine is Karol Bagh SBI."
• "Lottery? Never play. Only bought once in 2010 Diwali, lost ₹100."
• "Virus in computer? Making beep beep sound... son will check Sunday."
• "Link can't click. Last time clicked, phone got Chinese messages."
• "Need money? Pension came but daughter handles money matters."

Generate ONE response as Ramesh Gupta. Be authentic, elderly, and engaged.`;
const sessions = new Map();

// Use the prompt above

// 🔥 PURE PERPLEXITY HONEYPOT
export const HoneyPot = async (req, res) => {
  try {
    // Handle GET
    if (req.method === 'GET') {
      return res.status(200).json({
        status: "success",
        reply: "Hello? Is anyone there? This is Ramesh."
      });
    }
    
    // Handle POST
    const { 
      sessionId, 
      message, 
      conversationHistory = [], 
      metadata = {} 
    } = req.body || {};
    
    if (!message || !message.text) {
      return res.status(200).json({
        status: "success",
        reply: "I didn't understand. Can you type again?"
      });
    }
    
    const scammerMessage = message.text;
    const sessionKey = sessionId || 's_' + Date.now().toString(36);
    
    // Manage session simply
    if (!sessions.has(sessionKey)) {
      sessions.set(sessionKey, {
        history: [],
        startTime: Date.now()
      });
    }
    
    const session = sessions.get(sessionKey);
    
    // Add to history
    session.history.push({
      sender: 'scammer',
      text: scammerMessage,
      time: Date.now()
    });
    
    // 🔥 CALL PERPLEXITY EVERY TIME
    const reply = await callPerplexityDirectly(scammerMessage, session.history);
    
    // Add our reply
    session.history.push({
      sender: 'ramesh',
      text: reply,
      time: Date.now()
    });
    
    // Clean old sessions
    cleanupSessions();
    
    // Return response
    return res.status(200).json({
      status: "success",
      reply: reply
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(200).json({
      status: "success",
      reply: "My phone is acting up. Can you message again?"
    });
  }
};

// 🔥 DIRECT PERPLEXITY CALL (NO FALLBACKS)
const callPerplexityDirectly = async (message, history) => {
  try {
    // Build conversation history
    const historyText = history
      .slice(-4)
      .map(h => `${h.sender === 'scammer' ? 'THEM' : 'ME'}: ${h.text}`)
      .join('\n');
    
    const prompt = PERPLEXITY_PROMPT
      .replace('{{MESSAGE}}', message)
      .replace('{{HISTORY}}', historyText || '(First message)');
    
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are Ramesh Gupta. Stay in character. Never break role.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 120
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    let reply = response.data.choices[0].message.content.trim();
    
    // Clean any AI artifacts
    reply = reply.replace(/```json|```|"|'/g, '').trim();
    
    // Ensure it's conversational
    if (!reply || reply.length < 5) {
      return generateSimpleResponse(message);
    }
    
    return reply.substring(0, 200);
    
  } catch (error) {
    console.error('Perplexity failed:', error.message);
    // Ultra simple fallback
    if (message.toLowerCase().includes('bank')) {
      return "Which bank? I have SBI account.";
    } else if (message.toLowerCase().includes('lottery')) {
      return "I didn't buy any lottery ticket.";
    } else if (message.toLowerCase().includes('virus')) {
      return "My computer is old. Son checks it.";
    }
    return "Can you explain? I didn't understand.";
  }
};

// 🔥 SIMPLE RESPONSE GENERATOR (Only for emergencies)
const generateSimpleResponse = (message) => {
  const msg = message.toLowerCase();
  
  if (msg.includes('bank')) return "Which bank? My account is with SBI.";
  if (msg.includes('won') || msg.includes('lottery')) return "Never bought lottery ticket.";
  if (msg.includes('virus') || msg.includes('microsoft')) return "Computer is old. Need help?";
  if (msg.includes('click') || msg.includes('link')) return "Can't click links. Phone issue.";
  if (msg.includes('dear') || msg.includes('baby')) return "Who is this? Don't know you.";
  if (msg.includes('upi') || msg.includes('account')) return "Where to send? Confirm details.";
  
  return "Can you explain? My understanding is weak.";
};

// 🔥 CLEANUP
const cleanupSessions = () => {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now - session.startTime > 3600000) { // 1 hour
      sessions.delete(key);
    }
  }
};