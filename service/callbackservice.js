import { CONFIG } from "../utils/config.js";

export class CallbackService {
  static async sendFinalResult(sessionId, session) {
    const intelligence = session.intelligence;
    const payload = {
      sessionId: sessionId,
      scamDetected: session.scamDetected || false,
      totalMessagesExchanged: session.conversationHistory.length,
      extractedIntelligence: {
        bankAccounts: intelligence.bankAccounts,
        upiIds: intelligence.upiIds,
        phishingLinks: intelligence.phishingLinks,
        phoneNumbers: intelligence.phoneNumbers,
        suspiciousKeywords: intelligence.suspiciousKeywords
      },
      agentNotes: this.generateAgentNotes(session, intelligence)
    };
    try {
      await axios.post(CONFIG.CALLBACK_URL, payload, { timeout: CONFIG.CALLBACK_TIMEOUT });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }
  
  static generateAgentNotes(session, intelligence) {
    const tactics = [];
    if (intelligence.suspiciousKeywords.includes('otp_request')) tactics.push('OTP harvesting');
    if (intelligence.suspiciousKeywords.includes('upi_request')) tactics.push('UPI redirection');
    if (intelligence.suspiciousKeywords.includes('urgency_tactic')) tactics.push('urgency');
    if (intelligence.suspiciousKeywords.includes('account_block_threat')) tactics.push('account block threat');
    if (intelligence.suspiciousKeywords.includes('bank_impersonation')) tactics.push('bank impersonation');
    if (intelligence.suspiciousKeywords.includes('authority_claim')) tactics.push('authority claim');
    if (intelligence.suspiciousKeywords.includes('fine_threat')) tactics.push('fine threat');
    if (intelligence.suspiciousKeywords.includes('permanent_block_threat')) tactics.push('permanent block');
    if (intelligence.suspiciousKeywords.includes('phishing_link')) tactics.push('phishing');
    if (intelligence.suspiciousKeywords.includes('fake_offer')) tactics.push('fake offer');
    if (intelligence.suspiciousKeywords.includes('employee_id_shared')) tactics.push('fake employee ID');
    if (intelligence.suspiciousKeywords.includes('designation_shared')) tactics.push('fake designation');
    if (intelligence.suspiciousKeywords.includes('branch_code_shared')) tactics.push('fake branch code');
    
    const tacticsText = tactics.length > 0 ? tactics.join(', ') : 'multiple scam tactics';
    
    return `Scammer used ${tacticsText}. ` +
           `Extracted ${intelligence.bankAccounts.length} bank accounts, ` +
           `${intelligence.upiIds.length} UPI IDs, ` +
           `${intelligence.phoneNumbers.length} phone numbers, ` +
           `${intelligence.phishingLinks.length} phishing links, ` +
           `${intelligence.employeeIDs?.length || 0} employee IDs. ` +
           `Engaged for ${session.conversationHistory.length} messages. ` +
           `Repetition: ${session.repetitionCount}, Emotion: ${session.emotionLevel}`;
  }
  
  static shouldEndSession(session) {
    const userMessages = session.conversationHistory.filter(m => m.sender === 'user');
    const turnCount = userMessages.length;
    
    if (turnCount < CONFIG.MIN_TURNS) return false;
    if (turnCount >= CONFIG.MAX_TURNS) return true;
    
    if (session.scamDetected) {
      const intel = session.intelligence;
      
      // Require at least 2 intelligence items before exiting
      const intelligenceCount = 
        (intel.bankAccounts?.length || 0) +
        (intel.upiIds?.length || 0) +
        (intel.phoneNumbers?.length || 0) +
        (intel.phishingLinks?.length || 0);
      
      if (intelligenceCount >= 2 && turnCount >= 8) return true;
      if (intel.suspiciousKeywords?.length >= 8 && turnCount >= 7) return true;
      if (turnCount >= 12) return true;
    }
    return false;
  }
}
