import { CONFIG } from "../utils/config.js";
import axios from "axios";

export class CallbackService {
  static async sendFinalResult(sessionId, session) {
    
    // ============ ADD 10 SECOND DELAY BEFORE CALLBACK ============
    console.log(`⏱️ Waiting 10 seconds before sending callback...`);
    await this.delay(10000); // 10 seconds delay
    console.log(`✅ Delay complete - sending callback now`);

    const intelligence = session.intelligence;
    
    // Calculate engagement duration
    const startTime = session.startTime || Date.now() - (session.conversationHistory.length * 60000);
    const endTime = Date.now();
    const engagementDurationSeconds = Math.round((endTime - startTime) / 1000);
    
    // Format phone numbers with +91- prefix for consistency
    const formattedPhones = (intelligence.phoneNumbers || []).map(phone => {
      if (phone.length === 10 && !phone.startsWith('+91')) {
        return `+91-${phone}`;
      }
      return phone;
    });
    
    // ============ BUILD EXTRACTED INTELLIGENCE - ONLY INCLUDE WHAT WAS ACTUALLY EXTRACTED ============
    const extractedIntelligence = {};
    
    if (intelligence.phoneNumbers?.length > 0) {
      extractedIntelligence.phoneNumbers = formattedPhones;
    }
    if (intelligence.bankAccounts?.length > 0) {
      extractedIntelligence.bankAccounts = intelligence.bankAccounts;
    }
    if (intelligence.upiIds?.length > 0) {
      extractedIntelligence.upiIds = intelligence.upiIds;
    }
    if (intelligence.phishingLinks?.length > 0) {
      extractedIntelligence.phishingLinks = intelligence.phishingLinks;
    }
    if (intelligence.emailAddresses?.length > 0) {
      extractedIntelligence.emailAddresses = intelligence.emailAddresses;
    }
    if (intelligence.employeeIDs?.length > 0) {
      extractedIntelligence.employeeIDs = intelligence.employeeIDs;
    }
    if (intelligence.cryptoWallets?.length > 0) {
      extractedIntelligence.cryptoWallets = intelligence.cryptoWallets;
    }
    if (intelligence.companyNames?.length > 0) {
      extractedIntelligence.companyNames = intelligence.companyNames;
    }
    if (intelligence.amounts?.length > 0) {
      extractedIntelligence.amounts = intelligence.amounts;
    }
    
    const payload = {
      sessionId: sessionId,
      scamDetected: session.scamDetected || false,
      totalMessagesExchanged: session.conversationHistory.length,
      engagementMetrics: {
        totalMessagesExchanged: session.conversationHistory.length,
        engagementDurationSeconds: engagementDurationSeconds
      },
      extractedIntelligence: extractedIntelligence,
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
  
  // ===============================
  // 10 SECOND DELAY FUNCTION
  // ===============================
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  static generateAgentNotes(session, intelligence) {
    const tactics = [];
    const extractedItems = [];
    
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
      tactics.push('employee ID sharing');
      extractedItems.push(`${intelligence.employeeIDs.length} employee IDs`);
    }
    if (intelligence.cryptoWallets?.length > 0) {
      tactics.push('crypto wallet sharing');
      extractedItems.push(`${intelligence.cryptoWallets.length} crypto wallets`);
    }
    
    if (session.threatCount > 2) tactics.push('multiple threats');
    if (session.otpRequests > 3) tactics.push('repeated OTP requests');
    
    const tacticsText = tactics.length > 0 ? tactics.join(', ') : 'scam attempt detected';
    
    let notes = `Scammer used ${tacticsText}. `;
    
    if (extractedItems.length > 0) {
      notes += `Extracted ` + extractedItems.join(', ') + `. `;
    }
    
    notes += `Engaged for ${session.conversationHistory.length} messages.`;
    
    return notes;
  }
  
  // ============ SMART EXIT LOGIC - Exit when we have enough data ============
  static shouldEndSession(session) {
    const userMessages = session.conversationHistory.filter(m => m.sender === 'user');
    const turnCount = userMessages.length;
    
    // Minimum 5 turns required for points
    if (turnCount < 5) return false;
    
    const intel = session.intelligence;
    const memory = session.memory;
    
    // Count what we've extracted
    const extractedTypes = [];
    if (intel.phoneNumbers?.length > 0) extractedTypes.push('phone');
    if (intel.bankAccounts?.length > 0) extractedTypes.push('bank');
    if (intel.upiIds?.length > 0) extractedTypes.push('upi');
    if (intel.phishingLinks?.length > 0) extractedTypes.push('link');
    if (intel.emailAddresses?.length > 0) extractedTypes.push('email');
    if (intel.employeeIDs?.length > 0) extractedTypes.push('employee');
    if (intel.cryptoWallets?.length > 0) extractedTypes.push('crypto');
    
    const extractionCount = extractedTypes.length;
    
    // ============ SMART EXIT CONDITIONS ============
    
    // EXIT CONDITION 1: Got 2+ types of data AND at least 5 turns
    if (extractionCount >= 2 && turnCount >= 5) {
      console.log(`✅ EXIT: Collected ${extractionCount} data types in ${turnCount} turns`);
      return true;
    }
    
    // EXIT CONDITION 2: Got 1 important data type + threat + 6+ turns
    if (extractionCount >= 1 && (memory?.threatCount >= 2 || session.threatCount >= 2) && turnCount >= 6) {
      console.log(`✅ EXIT: Got data + threats in ${turnCount} turns`);
      return true;
    }
    
    // EXIT CONDITION 3: Maximum turns reached (10)
    if (turnCount >= 10) {
      console.log(`✅ EXIT: Max turns (10) reached`);
      return true;
    }
    
    // EXIT CONDITION 4: Got phone AND (bank/UPI/email) AND 5+ turns
    if (intel.phoneNumbers?.length > 0 && 
        (intel.bankAccounts?.length > 0 || intel.upiIds?.length > 0 || intel.emailAddresses?.length > 0) &&
        turnCount >= 5) {
      console.log(`✅ EXIT: Got phone + other data in ${turnCount} turns`);
      return true;
    }
    
    return false;
  }
}