// controllers/honeypotController.js

import axios from 'axios';

// ==============================================
// IN-MEMORY SESSION STORE
// ==============================================
const sessions = new Map();

// ==============================================
// CONFIGURATION
// ==============================================
const CONFIG = {
  SCAM_THRESHOLD: 40,
  MIN_TURNS: 6,
  MAX_TURNS: 10,
  CALLBACK_URL: 'https://hackathon.guvi.in/api/updateHoneyPotFinalResult'
};

// ==============================================
// SCAM PATTERNS - COMPREHENSIVE DETECTION
// ==============================================
const PATTERNS = {
  // Credential harvesting
  otp: /\b(?:otp|one\s*time\s*(?:password|pin|code)|verification\s*code|security\s*code)\b/i,
  pin: /\b(?:pin|mpin|atm\s*pin|debit\s*pin|card\s*pin)\b/i,
  password: /\b(?:password|passcode|login\s*details|internet\s*banking\s*password)\b/i,
  cvv: /\b(?:cvv|cvc|security\s*number|card\s*verification)\b/i,
  
  // Payment requests
  upi: /\b(?:upi|gpay|phonepe|paytm|amazon\s*pay|bh?im|unified\s*payments?)\b/i,
  upiId: /[\w.\-]+@(?:ybl|ok\w+|ibl|paytm|axl|sbi|hdfc|icici|yesbank|unionbank|pnb|canara|kotak)/i,
  transfer: /\b(?:neft|rtgs|imps|transfer|send\s*money|fund\s*transfer|payment|transaction|refund)\b/i,
  account: /\b(?:\d{9,18}|\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/,
  
  // Phishing
  link: /\b(?:https?:\/\/|www\.|bit\.ly|tinyurl|shorturl|rb\.gy|ow\.ly|is\.gd|s\.h|safelinks)\S+/i,
  
  // Urgency tactics
  urgent: /\b(?:urgent|immediate|now|turant|abhi|asap|quick|fast|today|within|time\s*sensitive|right\s*away|at\s*once)\b/i,
  deadline: /\b(?:deadline|expire?|valid\s*only|limited|last\s*chance|before\s*it's\s*too\s*late|closing\s*soon)\b/i,
  
  // Threats & fear tactics
  block: /\b(?:block|freeze|suspend|lock|deactivate|restrict|disable|hold)\b/i,
  legal: /\b(?:legal|court|case|police|cyber\s*cell|complaint|fine|penalty|action|notice)\b/i,
  compromised: /\b(?:compromised|hacked|breach|unauthorized|fraud|suspicious|risk|unusual|alert)\b/i,
  
  // Authority claims
  bank: /\b(?:sbi|hdfc|icici|axis|kotak|pnb|canara|union|yesbank|bank\s*of\s*baroda|central\s*bank|rbi|reserve\s*bank)\b/i,
  department: /\b(?:fraud\s*team|security\s*team|risk\s*team|customer\s*support|helpdesk|technical\s*team|verification\s*team|support\s*team)\b/i,
  official: /\b(?:official|authorized|verified|registered|licensed|certified)\b/i,
  
  // Contact information
  phone: /\b(?:\+91|0)?[6-9]\d{9}\b/,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
};

// ==============================================
// HUMAN-LIKE REPLY DATABASE
// ==============================================
const REPLIES = {
  // Turn 1-2: Initial confusion
  initial: [
    "Why is my account being blocked? I haven't done anything wrong.",
    "What happened to my account? Can you explain?",
    "I didn't receive any notification about this.",
    "Which bank is this from? I have multiple accounts.",
    "Is this about my savings account or current account?"
  ],
  
  // Turn 3-4: Seeking clarification
  clarification: [
    "Can you tell me which branch this is from?",
    "What's your name and employee ID?",
    "How do I know this is really from my bank?",
    "Should I call the customer care number on my card?",
    "Why are you asking for these details over chat?"
  ],
  
  // Credential requests
  credential: [
    "Bank never asks for OTP. Are you sure you're from the bank?",
    "I can't share my PIN with anyone, it's confidential.",
    "Why do you need my password? This seems suspicious.",
    "I thought we're not supposed to share verification codes.",
    "The bank always says never share OTP with anyone."
  ],
  
  // Payment requests
  payment: [
    "Why do I need to make a payment? I didn't request any service.",
    "I'm not comfortable sharing my UPI ID.",
    "Which account should I transfer to?",
    "This sounds like a scam. Real banks don't ask for payments like this.",
    "I'd rather visit the branch and pay there."
  ],
  
  // Threats & urgency
  threat: [
    "Why is it so urgent? Can I visit the branch tomorrow?",
    "How can my account be blocked when I've done nothing wrong?",
    "This feels like a scare tactic. I'm going to call my bank.",
    "I'd like to verify this with my relationship manager first.",
    "Can you send me an official email about this?"
  ],
  
  // Authority challenges
  authority: [
    "Which department did you say you're from?",
    "What's your employee ID? I'll verify with your branch.",
    "Can you give me your direct extension number?",
    "I know the branch manager, let me confirm with him.",
    "Send me an official communication on my registered email."
  ],
  
  // Suspicion growing (Turns 5-7)
  suspicious: [
    "This is starting to feel like a scam. I'm not comfortable.",
    "I think I should report this to cyber crime cell.",
    "Let me call the bank's toll-free number to verify.",
    "I'm going to visit my branch right now.",
    "This doesn't follow RBI guidelines at all."
  ],
  
  // Exit statements
  exit: [
    "I'm not proceeding further without branch verification.",
    "I'm reporting this to the cyber crime department.",
    "I've noted your number and will file a complaint.",
    "My bank manager will contact your branch directly.",
    "I'm ending this conversation and contacting my bank."
  ]
};

// ==============================================
// INTELLIGENCE EXTRACTION ENGINE
// ==============================================
class IntelligenceExtractor {
  static createEmptyStore() {
    return {
      bankAccounts: [],
      upiIds: [],
      phishingLinks: [],
      phoneNumbers: [],
      suspiciousKeywords: []
    };
  }

  static extractFromHistory(conversationHistory) {
    const intelligence = this.createEmptyStore();
    
    conversationHistory.forEach(msg => {
      if (msg.sender === 'scammer') {
        this.extractFromText(msg.text, intelligence);
      }
    });
    
    return intelligence;
  }

  static extractFromText(text, intelligence) {
    const lower = text.toLowerCase();
    
    // Extract bank accounts
    const accounts = text.match(PATTERNS.account);
    if (accounts) {
      accounts.forEach(acc => {
        const clean = acc.replace(/[\s-]/g, '');
        if (clean.length >= 9 && clean.length <= 18 && !intelligence.bankAccounts.includes(clean)) {
          intelligence.bankAccounts.push(clean);
        }
      });
    }
    
    // Extract UPI IDs
    const upis = text.match(PATTERNS.upiId);
    if (upis) {
      upis.forEach(upi => {
        const normalized = upi.toLowerCase();
        if (!intelligence.upiIds.includes(normalized)) {
          intelligence.upiIds.push(normalized);
        }
      });
    }
    
    // Extract phone numbers
    const phones = text.match(PATTERNS.phone);
    if (phones) {
      phones.forEach(phone => {
        let clean = phone.replace(/[\s-]/g, '').replace('+91', '');
        if (clean.startsWith('0')) clean = clean.slice(1);
        if (clean.length === 10 && !intelligence.phoneNumbers.includes(clean)) {
          intelligence.phoneNumbers.push(clean);
        }
      });
    }
    
    // Extract phishing links
    const links = text.match(PATTERNS.link);
    if (links) {
      links.forEach(link => {
        const normalized = link.toLowerCase().trim();
        if (!intelligence.phishingLinks.includes(normalized)) {
          intelligence.phishingLinks.push(normalized);
        }
      });
    }
    
    // Extract suspicious keywords
    this.extractKeywords(text, intelligence);
  }

  static extractKeywords(text, intelligence) {
    const lower = text.toLowerCase();
    
    const keywordMappings = [
      { pattern: PATTERNS.otp, keyword: 'otp_request' },
      { pattern: PATTERNS.pin, keyword: 'pin_request' },
      { pattern: PATTERNS.password, keyword: 'password_request' },
      { pattern: PATTERNS.cvv, keyword: 'cvv_request' },
      { pattern: PATTERNS.upi, keyword: 'upi_request' },
      { pattern: PATTERNS.transfer, keyword: 'transfer_request' },
      { pattern: PATTERNS.link, keyword: 'phishing_link' },
      { pattern: PATTERNS.urgent, keyword: 'urgency_tactic' },
      { pattern: PATTERNS.deadline, keyword: 'deadline_pressure' },
      { pattern: PATTERNS.block, keyword: 'account_block_threat' },
      { pattern: PATTERNS.legal, keyword: 'legal_threat' },
      { pattern: PATTERNS.compromised, keyword: 'security_breach_claim' },
      { pattern: PATTERNS.bank, keyword: 'bank_impersonation' },
      { pattern: PATTERNS.department, keyword: 'official_department_claim' },
      { pattern: PATTERNS.official, keyword: 'authority_claim' }
    ];
    
    keywordMappings.forEach(({ pattern, keyword }) => {
      if (pattern.test(lower) || pattern.test(text)) {
        if (!intelligence.suspiciousKeywords.includes(keyword)) {
          intelligence.suspiciousKeywords.push(keyword);
        }
      }
    });
  }
}

// ==============================================
// SCAM DETECTION ENGINE
// ==============================================
class ScamDetector {
  static analyze(text) {
    const lower = text.toLowerCase();
    
    const signals = {
      credential: PATTERNS.otp.test(lower) || PATTERNS.pin.test(lower) || PATTERNS.password.test(lower) || PATTERNS.cvv.test(lower),
      payment: PATTERNS.upi.test(lower) || PATTERNS.transfer.test(lower) || PATTERNS.upiId.test(text),
      phishing: PATTERNS.link.test(text),
      urgency: PATTERNS.urgent.test(lower) || PATTERNS.deadline.test(lower),
      threat: PATTERNS.block.test(lower) || PATTERNS.legal.test(lower) || PATTERNS.compromised.test(lower),
      authority: PATTERNS.bank.test(lower) || PATTERNS.department.test(lower) || PATTERNS.official.test(lower)
    };

    const riskScore = this.calculateRiskScore(signals);
    const isScam = riskScore >= CONFIG.SCAM_THRESHOLD;

    return { signals, riskScore, isScam };
  }

  static calculateRiskScore(signals) {
    let score = 0;
    if (signals.credential) score += 30;
    if (signals.payment) score += 25;
    if (signals.phishing) score += 25;
    if (signals.urgency) score += 15;
    if (signals.threat) score += 15;
    if (signals.authority) score += 10;
    
    // Bonus for dangerous combinations
    if (signals.credential && signals.payment) score += 20;
    if (signals.credential && signals.phishing) score += 20;
    if (signals.threat && signals.urgency) score += 15;
    if (signals.credential && signals.urgency) score += 10;
    
    return Math.min(score, 100);
  }

  static shouldExit(session) {
    const turnCount = session.conversationHistory.filter(m => m.sender === 'user').length;
    
    // Need minimum engagement
    if (turnCount < CONFIG.MIN_TURNS) return false;
    
    // Exit conditions
    if (turnCount >= CONFIG.MAX_TURNS) return true;
    
    if (session.scamDetected) {
      const intelligence = session.intelligence;
      
      // Exit if we've collected enough intelligence
      if (intelligence.bankAccounts.length >= 2) return true;
      if (intelligence.upiIds.length >= 2) return true;
      if (intelligence.phishingLinks.length >= 1) return true;
      if (intelligence.phoneNumbers.length >= 2) return true;
      if (intelligence.suspiciousKeywords.length >= 5) return true;
      
      // Exit on high risk combo
      const lastMessage = session.conversationHistory[session.conversationHistory.length - 1]?.text || '';
      const analysis = this.analyze(lastMessage);
      if (analysis.riskScore >= 80) return true;
      if (analysis.signals.credential && analysis.signals.payment) return true;
    }
    
    return false;
  }
}

// ==============================================
// REPLY GENERATION ENGINE
// ==============================================
class ReplyGenerator {
  static generateReply(session, scamDetected, signals) {
    const turnCount = session.conversationHistory.filter(m => m.sender === 'user').length;
    
    // PHASE 1: Initial confusion (Turns 1-2)
    if (turnCount <= 2) {
      return REPLIES.initial[turnCount - 1] || REPLIES.initial[0];
    }
    
    // PHASE 2: Clarification seeking (Turns 3-4)
    if (turnCount <= 4) {
      return REPLIES.clarification[Math.floor(Math.random() * REPLIES.clarification.length)];
    }
    
    // If scam not detected yet, stay confused
    if (!scamDetected) {
      return REPLIES.clarification[Math.floor(Math.random() * REPLIES.clarification.length)];
    }
    
    // PHASE 3: Respond to specific scam tactics
    if (turnCount <= 7) {
      if (signals.credential) {
        return REPLIES.credential[Math.floor(Math.random() * REPLIES.credential.length)];
      }
      if (signals.payment) {
        return REPLIES.payment[Math.floor(Math.random() * REPLIES.payment.length)];
      }
      if (signals.threat || signals.urgency) {
        return REPLIES.threat[Math.floor(Math.random() * REPLIES.threat.length)];
      }
      if (signals.authority) {
        return REPLIES.authority[Math.floor(Math.random() * REPLIES.authority.length)];
      }
      return REPLIES.suspicious[Math.floor(Math.random() * REPLIES.suspicious.length)];
    }
    
    // PHASE 4: Exit phase
    return REPLIES.exit[Math.floor(Math.random() * REPLIES.exit.length)];
  }
}

// ==============================================
// CALLBACK SERVICE - MANDATORY FOR SCORING
// ==============================================
class CallbackService {
  static async sendFinalResult(sessionId, session) {
    // Extract intelligence from entire conversation history
    const extractedIntelligence = IntelligenceExtractor.extractFromHistory(
      session.conversationHistory
    );
    
    // Generate agent notes
    const agentNotes = this.generateAgentNotes(session, extractedIntelligence);
    
    // Prepare payload EXACTLY as per spec
    const payload = {
      sessionId: sessionId,
      scamDetected: session.scamDetected || false,
      totalMessagesExchanged: session.conversationHistory.length,
      extractedIntelligence: {
        bankAccounts: extractedIntelligence.bankAccounts,
        upiIds: extractedIntelligence.upiIds,
        phishingLinks: extractedIntelligence.phishingLinks,
        phoneNumbers: extractedIntelligence.phoneNumbers,
        suspiciousKeywords: extractedIntelligence.suspiciousKeywords
      },
      agentNotes: agentNotes
    };

    console.log('\n' + '='.repeat(80));
    console.log('📤 SENDING MANDATORY CALLBACK TO GUVI');
    console.log('='.repeat(80));
    console.log(`Session ID: ${sessionId}`);
    console.log(`Messages Exchanged: ${session.conversationHistory.length}`);
    console.log(`Scam Detected: ${session.scamDetected}`);
    console.log('\n📊 EXTRACTED INTELLIGENCE:');
    console.log(`   Bank Accounts: ${extractedIntelligence.bankAccounts.length}`);
    console.log(`   UPI IDs: ${extractedIntelligence.upiIds.length}`);
    console.log(`   Phone Numbers: ${extractedIntelligence.phoneNumbers.length}`);
    console.log(`   Phishing Links: ${extractedIntelligence.phishingLinks.length}`);
    console.log(`   Suspicious Keywords: ${extractedIntelligence.suspiciousKeywords.length}`);
    console.log('\n📝 Agent Notes:', agentNotes);
    console.log('='.repeat(80));

    try {
      const response = await axios.post(CONFIG.CALLBACK_URL, payload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('\n✅ CALLBACK SUCCESSFUL');
      console.log(`   Status: ${response.status}`);
      console.log('='.repeat(80) + '\n');
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('\n❌ CALLBACK FAILED');
      console.error(`   Error: ${error.message}`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data:`, error.response.data);
      }
      console.error('='.repeat(80) + '\n');
      
      return { success: false, error: error.message };
    }
  }

  static generateAgentNotes(session, intelligence) {
    const tactics = [];
    
    if (intelligence.suspiciousKeywords.includes('urgency_tactic')) tactics.push('urgency');
    if (intelligence.suspiciousKeywords.includes('deadline_pressure')) tactics.push('deadline pressure');
    if (intelligence.suspiciousKeywords.includes('account_block_threat')) tactics.push('account block threat');
    if (intelligence.suspiciousKeywords.includes('legal_threat')) tactics.push('legal threat');
    if (intelligence.suspiciousKeywords.includes('bank_impersonation')) tactics.push('bank impersonation');
    if (intelligence.suspiciousKeywords.includes('official_department_claim')) tactics.push('authority claim');
    if (intelligence.suspiciousKeywords.includes('otp_request')) tactics.push('OTP harvesting');
    if (intelligence.suspiciousKeywords.includes('upi_request')) tactics.push('UPI payment redirection');
    if (intelligence.suspiciousKeywords.includes('phishing_link')) tactics.push('phishing');
    
    const tacticsText = tactics.length > 0 
      ? tactics.join(', ') 
      : 'multiple scam tactics';
    
    return `Scammer used ${tacticsText}. ` +
           `Extracted ${intelligence.bankAccounts.length} bank accounts, ` +
           `${intelligence.upiIds.length} UPI IDs, ` +
           `${intelligence.phoneNumbers.length} phone numbers, ` +
           `${intelligence.phishingLinks.length} phishing links. ` +
           `Engaged for ${session.conversationHistory.length} total messages.`;
  }
}

// ==============================================
// 🏆 MAIN CONTROLLER - EXACTLY AS REQUESTED
// ==============================================
export const honey_pot = async (req, res) => {
    try {
        // Validate request
        if (!req.body.sessionId || !req.body.message || !req.body.message.text) {
            return res.status(400).json({
                status: 'error',
                error: 'Invalid request format'
            });
        }

        const { 
            sessionId, 
            message, 
            conversationHistory = [], 
            metadata = {} 
        } = req.body;

        // Initialize session if new
        if (!sessions.has(sessionId)) {
            sessions.set(sessionId, {
                id: sessionId,
                scamDetected: false,
                conversationHistory: [],
                intelligence: IntelligenceExtractor.createEmptyStore(),
                metadata: metadata
            });
        }

        const session = sessions.get(sessionId);

        // Add scammer's message to history
        session.conversationHistory.push({
            sender: 'scammer',
            text: message.text,
            timestamp: message.timestamp || Date.now()
        });

        // Analyze current message
        const analysis = ScamDetector.analyze(message.text);
        
        // Extract intelligence from this message
        IntelligenceExtractor.extractFromText(message.text, session.intelligence);
        
        // Update scam detection status
        if (!session.scamDetected && analysis.isScam) {
            session.scamDetected = true;
            console.log(`\n🚨 SCAM DETECTED in session ${sessionId} at turn ${session.conversationHistory.length}`);
        }

        // Generate appropriate reply
        const reply = ReplyGenerator.generateReply(
            session,
            session.scamDetected,
            analysis.signals
        );

        // Add bot's reply to history
        session.conversationHistory.push({
            sender: 'user',
            text: reply,
            timestamp: Date.now()
        });

        // Check if session should end
        const shouldEndSession = ScamDetector.shouldExit(session);

        // MANDATORY: Send callback to GUVI when session ends
        if (shouldEndSession) {
            await CallbackService.sendFinalResult(sessionId, session);
            sessions.delete(sessionId); // Cleanup
        }

        // Return response in exact format leaderboard expects
        return res.json({
            status: 'success',
            reply: reply
        });

    } catch (error) {
        console.error('❌ Controller error:', error);
        
        // Always return a reply even on error
        return res.json({
            status: 'success',
            reply: "I don't understand. Can you please explain again?"
        });
    }
};

