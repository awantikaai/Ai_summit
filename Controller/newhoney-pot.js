import { CONFIG } from '../utils/config.js';
import { ReplyGenerator } from '../utils/replygenerator.js';
import { IntelligenceExtractor } from '../utils/intelligenceextract.js';
import  KeywordDetector from '../service/keywordDetector.js';
import { PerplexityService } from '../service/perplexity.js';
import { CallbackService } from '../service/callbackservice.js';

const sessions = new Map();

// ============ DELAY FUNCTION ============
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const honey_pot = async (req, res) => {
  try {
    if (!req.body.sessionId) {
      return res.status(400).json({ status: 'error', error: 'Missing sessionId' });
    }
    if (!req.body.message || !req.body.message.text) {
      return res.status(400).json({ status: 'error', error: 'Invalid message format' });
    }
    const { sessionId, message, conversationHistory = [], metadata = {} } = req.body;
    
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        id: sessionId,
        startTime: Date.now(), // Track when session started
        scamDetected: false,
        conversationHistory: [],
        intelligence: IntelligenceExtractor.createEmptyStore(),
        accountQuestioned: false,
        accountValidated: false,
        ifscValidated: false,
        caseValidated: false,
        employeeValidated: false,
        upiQuestioned: false,
        upiMentionCount: 0,
        authorityChallenged: false,
        otpRequests: 0,
        threatCount: 0,
        phoneMentionCount: 0,
        turnCount: 0,
        metadata: metadata,
        lockToExit: false,
        lastScammerMessage: '',
        repetitionCount: 0,
        emotionLevel: 0,
        pressureScore: 0,
        // Add memory for ReplyGenerator
        memory: null
      });
    }
    
    const session = sessions.get(sessionId);
    
    session.conversationHistory.push({
      sender: 'scammer',
      text: message.text,
      timestamp: message.timestamp || Date.now()
    });
    
    if (session.lastScammerMessage === message.text) {
      session.repetitionCount++;
    } else {
      session.repetitionCount = 0;
    }
    session.lastScammerMessage = message.text;
    
    const detected = KeywordDetector.detectKeywords(message.text);
    const hasKeywords = KeywordDetector.hasAnyKeyword(detected);
    const riskScore = KeywordDetector.calculateRiskScore(detected);
    
    IntelligenceExtractor.extractFromText(message.text, session.intelligence);
    
    session.pressureScore = 
      (session.otpRequests >= 3 ? 1 : 0) +
      (session.threatCount >= 2 ? 1 : 0) +
      (detected.hasPermanent ? 1 : 0) +
      (detected.hasFine ? 1 : 0) +
      (detected.hasCyber ? 1 : 0) +
      (session.repetitionCount >= 2 ? 1 : 0) +
      (detected.hasEmployeeID ? 1 : 0) +
      (detected.hasDesignation ? 1 : 0);
    
    if (session.lockToExit) {
      session.emotionLevel = 5;
    } else if (session.pressureScore >= 4 || session.otpRequests >= 5 || session.threatCount >= 4) {
      session.emotionLevel = 4;
    } else if (session.otpRequests >= 3 || session.threatCount >= 3 || session.repetitionCount >= 3) {
      session.emotionLevel = 3;
    } else if (session.otpRequests >= 2 || session.threatCount >= 2 || detected.hasAccount || detected.hasUPI) {
      session.emotionLevel = 2;
    } else if (session.turnCount >= 2) {
      session.emotionLevel = 1;
    } else {
      session.emotionLevel = 0;
    }
    
    if (!session.scamDetected && riskScore >= CONFIG.SCAM_THRESHOLD) {
      session.scamDetected = true;
      console.log(`🚨 SCAM DETECTED - Session: ${sessionId}, Risk: ${riskScore}`);
    }
    
    let reply;
    const turnCount = session.conversationHistory.filter(m => m.sender === 'user').length + 1;
    const isEarlyTurn = turnCount <= CONFIG.PERPLEXITY_TRIGGER_TURNS_MAX;
    
    // ============ ADD 10 SECOND DELAY BEFORE REPLY ============
    console.log(`⏱️ Waiting 10 seconds before replying (Turn ${turnCount})...`);
    await delay(10000);
    console.log(`✅ Delay complete - sending reply`);
    
    if (CONFIG.USE_PERPLEXITY && !hasKeywords && isEarlyTurn) {
      try {
        const category = await PerplexityService.selectCategory(message.text, session.conversationHistory, CONFIG);
        reply = PerplexityService.getReply(category, session);
      } catch (e) {
        reply = null;
      }
    }
    
    if (!reply) {
      reply = await ReplyGenerator.generateReply(detected, session, message.text, session.conversationHistory);
    }
    
    session.conversationHistory.push({
      sender: 'user',
      text: reply,
      timestamp: Date.now()
    });
    
    session.turnCount++;
    
    if (CallbackService.shouldEndSession(session, CONFIG)) {
      console.log(`\n🏁 Session ${sessionId} ending - Waiting 10 seconds before sending callback...`);
      
      // ============ ADD 10 SECOND DELAY BEFORE CALLBACK ============
      await delay(10000);
      console.log(`✅ 10 second delay complete - sending callback now`);
      
      await CallbackService.sendFinalResult(sessionId, session, CONFIG);
      sessions.delete(sessionId);
    }
    
    return res.json({ status: 'success', reply: reply });
    
  } catch (error) {
    console.error('❌ Controller error:', error);
    return res.json({
      status: 'success',
      reply: "Mujhe samajh nahi aaya, thoda aur batao."
    });
  }
};
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    const lastMessage = session.conversationHistory[session.conversationHistory.length - 1];
    if (lastMessage && (now - lastMessage.timestamp) > 3600000) {
      sessions.delete(sessionId);
      console.log(`🧹 Cleaned up stale session: ${sessionId}`);
    }
  }
}, 300000);