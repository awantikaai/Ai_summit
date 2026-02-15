import { CONFIG } from "../utils/config.js";
import axios from "axios";

export class CallbackService {
  static async sendFinalResult(sessionId, session) {
    const intelligence = session.intelligence;
    
    // Calculate engagement duration
    const startTime = session.startTime || Date.now() - (session.conversationHistory.length * 30000);
    const endTime = Date.now();
    const engagementDurationSeconds = Math.round((endTime - startTime) / 1000);
    
    // Format phone numbers with +91 prefix
    const formattedPhones = (intelligence.phoneNumbers || []).map(phone => {
      if (phone.length === 10 && !phone.startsWith('+91')) {
        return `+91-${phone}`;
      }
      if (phone.startsWith('+91') && !phone.includes('-')) {
        return phone.replace('+91', '+91-');
      }
      return phone;
    });
    
    // Determine scam type
    const scamType = this.determineScamType(intelligence, session);
    
    // Prepare payload in EXACT required format - NO suspiciousKeywords
    const finalOutput = {
      status: 'success',
      scamDetected: session.scamDetected || false,
      scamType: scamType,
      extractedIntelligence: {
        phoneNumbers: formattedPhones,
        bankAccounts: intelligence.bankAccounts || [],
        upiIds: intelligence.upiIds || [],
        phishingLinks: intelligence.phishingLinks || [],
        emailAddresses: intelligence.emailAddresses || []
      },
      engagementMetrics: {
        totalMessagesExchanged: session.conversationHistory.length,
        engagementDurationSeconds: engagementDurationSeconds
      },
      agentNotes: this.generateAgentNotes(session, intelligence)
    };

    console.log('\n📤 FINAL OUTPUT TO GUVI:');
    console.log(JSON.stringify(finalOutput, null, 2));
    
    try {
      const response = await axios.post(CONFIG.CALLBACK_URL, finalOutput, { 
        timeout: CONFIG.CALLBACK_TIMEOUT,
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`✅ Callback sent for session: ${sessionId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`❌ Callback failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  static determineScamType(intelligence, session) {
    const keywords = intelligence.suspiciousKeywords || [];
    
    if ((keywords.includes('bank_impersonation') || intelligence.bankAccounts?.length > 0) && 
        keywords.includes('otp_request')) {
      return 'bank_fraud';
    }
    
    if (keywords.includes('upi_request') || intelligence.upiIds?.length > 0) {
      return 'upi_fraud';
    }
    
    if (keywords.includes('phishing_link') || intelligence.phishingLinks?.length > 0) {
      return 'phishing';
    }
    
    if (keywords.includes('fake_offer')) {
      return 'lottery_fraud';
    }
    
    if (keywords.includes('kyc_expiry')) {
      return 'kyc_fraud';
    }
    
    if (keywords.includes('tech_support')) {
      return 'tech_support_scam';
    }
    
    if (session.scamDetected) {
      return 'generic_scam';
    }
    
    return 'unknown';
  }
  
  static generateAgentNotes(session, intelligence) {
    const tactics = [];
    
    if (intelligence.suspiciousKeywords?.includes('otp_request')) tactics.push('OTP harvesting');
    if (intelligence.suspiciousKeywords?.includes('upi_request')) tactics.push('UPI redirection');
    if (intelligence.suspiciousKeywords?.includes('urgency_tactic')) tactics.push('urgency');
    if (intelligence.suspiciousKeywords?.includes('account_block_threat')) tactics.push('account block threat');
    if (intelligence.suspiciousKeywords?.includes('bank_impersonation')) tactics.push('bank impersonation');
    
    // Determine claimed identity
    let claimedIdentity = '';
    if (intelligence.bankNames?.includes('SBI')) claimedIdentity = 'from SBI';
    else if (intelligence.bankNames?.includes('HDFC')) claimedIdentity = 'from HDFC';
    else if (intelligence.bankNames?.includes('ICICI')) claimedIdentity = 'from ICICI';
    
    const tacticsText = tactics.length > 0 ? tactics.join(', ') : 'multiple scam tactics';
    
    let notes = `Scammer used ${tacticsText}`;
    if (claimedIdentity) notes += `, claimed to be ${claimedIdentity}`;
    if (intelligence.employeeIDs?.length > 0) notes += `, provided fake ID: ${intelligence.employeeIDs[0]}`;
    
    notes += `. Extracted `;
    const extracted = [];
    if (intelligence.bankAccounts?.length) extracted.push(`${intelligence.bankAccounts.length} bank accounts`);
    if (intelligence.upiIds?.length) extracted.push(`${intelligence.upiIds.length} UPI IDs`);
    if (intelligence.phoneNumbers?.length) extracted.push(`${intelligence.phoneNumbers.length} phone numbers`);
    if (intelligence.phishingLinks?.length) extracted.push(`${intelligence.phishingLinks.length} phishing links`);
    if (intelligence.emailAddresses?.length) extracted.push(`${intelligence.emailAddresses.length} email addresses`);
    
    notes += extracted.join(', ') + `. `;
    notes += `Engaged for ${session.conversationHistory.length} messages.`;
    
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
      
      if (intelligenceCount >= 2 && turnCount >= 6) return true;
      if (intel.suspiciousKeywords?.length >= 8 && turnCount >= 5) return true;
      if (turnCount >= 10) return true;
    }
    return false;
  }
}