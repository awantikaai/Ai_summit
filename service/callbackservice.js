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
    
    // ============ BUILD EXTRACTED INTELLIGENCE - ONLY INCLUDE WHAT WAS ACTUALLY EXTRACTED ============
    const extractedIntelligence = {};
    
    // Only add phoneNumbers if they were actually extracted
    if (intelligence.phoneNumbers && intelligence.phoneNumbers.length > 0) {
      extractedIntelligence.phoneNumbers = formattedPhones;
      console.log(`📞 Including ${intelligence.phoneNumbers.length} phone numbers in callback`);
    }
    
    // Only add bankAccounts if they were actually extracted
    if (intelligence.bankAccounts && intelligence.bankAccounts.length > 0) {
      extractedIntelligence.bankAccounts = intelligence.bankAccounts;
      console.log(`💰 Including ${intelligence.bankAccounts.length} bank accounts in callback`);
    }
    
    // Only add upiIds if they were actually extracted
    if (intelligence.upiIds && intelligence.upiIds.length > 0) {
      extractedIntelligence.upiIds = intelligence.upiIds;
      console.log(`💳 Including ${intelligence.upiIds.length} UPI IDs in callback`);
    }
    
    // Only add phishingLinks if they were actually extracted
    if (intelligence.phishingLinks && intelligence.phishingLinks.length > 0) {
      extractedIntelligence.phishingLinks = intelligence.phishingLinks;
      console.log(`🔗 Including ${intelligence.phishingLinks.length} phishing links in callback`);
    }
    
    // Only add emailAddresses if they were actually extracted
    if (intelligence.emailAddresses && intelligence.emailAddresses.length > 0) {
      extractedIntelligence.emailAddresses = intelligence.emailAddresses;
      console.log(`📧 Including ${intelligence.emailAddresses.length} email addresses in callback`);
    }
    
    // Only add employeeIDs if they were actually extracted
    if (intelligence.employeeIDs && intelligence.employeeIDs.length > 0) {
      extractedIntelligence.employeeIDs = intelligence.employeeIDs;
      console.log(`🆔 Including ${intelligence.employeeIDs.length} employee IDs in callback`);
    }
    
    const payload = {
      sessionId: sessionId,
      scamDetected: session.scamDetected || false,
      totalMessagesExchanged: session.conversationHistory.length,
      extractedIntelligence: extractedIntelligence,  // Only contains fields that were actually extracted
      agentNotes: this.generateAgentNotes(session, intelligence)
    };
    
    console.log('\n📤 CALLBACK PAYLOAD (Only extracted data):');
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
    const extractedItems = [];
    
    // Only add tactics for what was actually extracted
    if (intelligence.phoneNumbers?.length > 0) {
      tactics.push('phone number harvesting');
      extractedItems.push(`${intelligence.phoneNumbers.length} phone numbers`);
    }
    if (intelligence.bankAccounts?.length > 0) {
      tactics.push('bank account harvesting');
      extractedItems.push(`${intelligence.bankAccounts.length} bank accounts`);
    }
    if (intelligence.upiIds?.length > 0) {
      tactics.push('UPI ID harvesting');
      extractedItems.push(`${intelligence.upiIds.length} UPI IDs`);
    }
    if (intelligence.phishingLinks?.length > 0) {
      tactics.push('phishing link sharing');
      extractedItems.push(`${intelligence.phishingLinks.length} phishing links`);
    }
    if (intelligence.emailAddresses?.length > 0) {
      tactics.push('email address harvesting');
      extractedItems.push(`${intelligence.emailAddresses.length} email addresses`);
    }
    if (intelligence.employeeIDs?.length > 0) {
      tactics.push('fake employee ID sharing');
      extractedItems.push(`${intelligence.employeeIDs.length} employee IDs`);
    }
    
    // Add urgency/threat detection based on session state
    if (session.threatCount > 2) tactics.push('multiple threats');
    if (session.otpRequests > 3) tactics.push('repeated OTP requests');
    if (session.repetitionCount > 2) tactics.push('message repetition');
    
    const tacticsText = tactics.length > 0 ? tactics.join(', ') : 'scam attempt detected';
    
    let notes = `Scammer used ${tacticsText}. `;
    
    // Add extraction summary - only include what was actually extracted
    if (extractedItems.length > 0) {
      notes += `Extracted ` + extractedItems.join(', ') + `. `;
    } else {
      notes += `No intelligence extracted. `;
    }
    
    notes += `Engaged for ${session.conversationHistory.length} messages. `;
    
    // Only add optional stats if they exist
    if (session.repetitionCount) notes += `Repetition: ${session.repetitionCount}. `;
    if (session.emotionLevel) notes += `Emotion: ${session.emotionLevel}. `;
    
    return notes;
  }
  
  static shouldEndSession(session) {
    const userMessages = session.conversationHistory.filter(m => m.sender === 'user');
    const turnCount = userMessages.length;
    
    if (turnCount < CONFIG.MIN_TURNS) return false;
    if (turnCount >= CONFIG.MAX_TURNS) return true;
    
    if (session.scamDetected) {
      const intel = session.intelligence;
      
      // Count only what was actually extracted
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