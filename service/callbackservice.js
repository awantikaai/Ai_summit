import { CONFIG } from "../utils/config.js";
import axios from "axios";

export class CallbackService {
  static async sendFinalResult(sessionId, session) {
    const intelligence = session.intelligence;
    
    // Format phone numbers with +91- prefix for consistency
    const formattedPhones = (intelligence.phoneNumbers || []).map(phone => {
      if (phone.length === 10 && !phone.startsWith('+91')) {
        return `+91-${phone}`;
      }
      return phone;
    });
    
    const payload = {
      sessionId: sessionId,
      scamDetected: session.scamDetected || false,
      totalMessagesExchanged: session.conversationHistory.length,
      extractedIntelligence: {
        bankAccounts: intelligence.bankAccounts || [],
        upiIds: intelligence.upiIds || [],
        phishingLinks: intelligence.phishingLinks || [],
        phoneNumbers: formattedPhones,
        emailAddresses: intelligence.emailAddresses || []  // ✅ Added emailAddresses
      },
      agentNotes: this.generateAgentNotes(session, intelligence)
    };
    
    console.log('\n📤 CALLBACK PAYLOAD:');
    console.log(JSON.stringify(payload, null, 2));
    
    try {
      await axios.post(CONFIG.CALLBACK_URL, payload, { timeout: CONFIG.CALLBACK_TIMEOUT });
      console.log(`✅ Callback sent for session: ${sessionId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Callback failed: ${error.message}`);
      return { success: false };
    }
  }
  
  static generateAgentNotes(session, intelligence) {
    const tactics = [];
    
    // Build tactics based on what was extracted (without using suspiciousKeywords)
    if (intelligence.bankAccounts?.length > 0) tactics.push('bank account harvesting');
    if (intelligence.upiIds?.length > 0) tactics.push('UPI ID harvesting');
    if (intelligence.phoneNumbers?.length > 0) tactics.push('phone number harvesting');
    if (intelligence.phishingLinks?.length > 0) tactics.push('phishing link sharing');
    if (intelligence.emailAddresses?.length > 0) tactics.push('email address harvesting');
    if (intelligence.employeeIDs?.length > 0) tactics.push('fake employee ID sharing');
    
    // Add urgency/threat detection based on session state
    if (session.threatCount > 2) tactics.push('multiple threats');
    if (session.otpRequests > 3) tactics.push('repeated OTP requests');
    if (session.repetitionCount > 2) tactics.push('message repetition');
    
    const tacticsText = tactics.length > 0 ? tactics.join(', ') : 'scam attempt detected';
    
    let notes = `Scammer used ${tacticsText}. `;
    
    // Add extraction summary
    const extracted = [];
    if (intelligence.bankAccounts?.length) extracted.push(`${intelligence.bankAccounts.length} bank accounts`);
    if (intelligence.upiIds?.length) extracted.push(`${intelligence.upiIds.length} UPI IDs`);
    if (intelligence.phoneNumbers?.length) extracted.push(`${intelligence.phoneNumbers.length} phone numbers`);
    if (intelligence.phishingLinks?.length) extracted.push(`${intelligence.phishingLinks.length} phishing links`);
    if (intelligence.emailAddresses?.length) extracted.push(`${intelligence.emailAddresses.length} email addresses`);
    if (intelligence.employeeIDs?.length) extracted.push(`${intelligence.employeeIDs.length} employee IDs`);
    
    if (extracted.length > 0) {
      notes += `Extracted ` + extracted.join(', ') + `. `;
    }
    
    notes += `Engaged for ${session.conversationHistory.length} messages. `;
    notes += `Repetition: ${session.repetitionCount || 0}, Emotion: ${session.emotionLevel || 0}`;
    
    return notes;
  }
  
  static shouldEndSession(session) {
    const userMessages = session.conversationHistory.filter(m => m.sender === 'user');
    const turnCount = userMessages.length;
    
    if (turnCount < CONFIG.MIN_TURNS) return false;
    if (turnCount >= CONFIG.MAX_TURNS) return true;
    
    if (session.scamDetected) {
      const intel = session.intelligence;
      
      const intelligenceCount = 
        (intel.bankAccounts?.length || 0) +
        (intel.upiIds?.length || 0) +
        (intel.phoneNumbers?.length || 0) +
        (intel.phishingLinks?.length || 0) +
        (intel.emailAddresses?.length || 0);
      
      if (intelligenceCount >= 2 && turnCount >= 5) return true;
      if (turnCount >= 9) return true;
    }
    return false;
  }
}