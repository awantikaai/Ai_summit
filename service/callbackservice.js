import { CONFIG } from "../utils/config.js";
import axios from "axios";

export class CallbackService {
  static async sendFinalResult(sessionId, session) {
    
    // ============ 10 SECOND DELAY BEFORE CALLBACK ============
    console.log(`⏱️ Waiting 10 seconds before sending callback...`);
    await this.delay(10000);
    console.log(`✅ Delay complete - sending callback now`);

    const intelligence = session.intelligence;
    
    // Calculate engagement duration
    const startTime = session.startTime || Date.now() - (session.conversationHistory.length * 60000);
    const endTime = Date.now();
    const engagementDurationSeconds = Math.round((endTime - startTime) / 1000);
    
    // DEDUPLICATE all arrays using Set
    const uniquePhoneNumbers = [...new Set(intelligence.phoneNumbers || [])];
    const uniqueBankAccounts = [...new Set(intelligence.bankAccounts || [])];
    const uniqueUpiIds = [...new Set(intelligence.upiIds || [])];
    const uniquePhishingLinks = [...new Set(intelligence.phishingLinks || [])];
    const uniqueEmailAddresses = [...new Set(intelligence.emailAddresses || [])];
    const uniqueEmployeeIDs = [...new Set(intelligence.employeeIDs || [])];
    
    // Format phone numbers with +91- prefix
    const formattedPhones = uniquePhoneNumbers.map(phone => {
      if (phone.length === 10 && !phone.startsWith('+91')) {
        return `+91-${phone}`;
      }
      return phone;
    });
    
    // ============ BUILD EXTRACTED INTELLIGENCE - ONLY UNIQUE VALUES ============
    const extractedIntelligence = {};
    
    if (formattedPhones.length > 0) {
      extractedIntelligence.phoneNumbers = formattedPhones;
    }
    if (uniqueBankAccounts.length > 0) {
      extractedIntelligence.bankAccounts = uniqueBankAccounts;
    }
    if (uniqueUpiIds.length > 0) {
      extractedIntelligence.upiIds = uniqueUpiIds;
    }
    if (uniquePhishingLinks.length > 0) {
      extractedIntelligence.phishingLinks = uniquePhishingLinks;
    }
    if (uniqueEmailAddresses.length > 0) {
      extractedIntelligence.emailAddresses = uniqueEmailAddresses;
    }
    if (uniqueEmployeeIDs.length > 0) {
      extractedIntelligence.employeeIDs = uniqueEmployeeIDs;
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
      agentNotes: this.generateAgentNotes(session, {
        phoneCount: formattedPhones.length,
        bankCount: uniqueBankAccounts.length,
        upiCount: uniqueUpiIds.length,
        linkCount: uniquePhishingLinks.length,
        emailCount: uniqueEmailAddresses.length,
        empCount: uniqueEmployeeIDs.length
      })
    };
    
    console.log('\n📤 CALLBACK PAYLOAD (Deduplicated):');
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
  
  static generateAgentNotes(session, counts) {
    const tactics = [];
    const extractedItems = [];
    
    if (counts.phoneCount > 0) {
      tactics.push('phone number harvesting');
      extractedItems.push(`${counts.phoneCount} phone numbers`);
    }
    if (counts.bankCount > 0) {
      tactics.push('bank account harvesting');
      extractedItems.push(`${counts.bankCount} bank accounts`);
    }
    if (counts.upiCount > 0) {
      tactics.push('UPI ID harvesting');
      extractedItems.push(`${counts.upiCount} UPI IDs`);
    }
    if (counts.linkCount > 0) {
      tactics.push('phishing link sharing');
      extractedItems.push(`${counts.linkCount} phishing links`);
    }
    if (counts.emailCount > 0) {
      tactics.push('email address harvesting');
      extractedItems.push(`${counts.emailCount} email addresses`);
    }
    if (counts.empCount > 0) {
      tactics.push('employee ID sharing');
      extractedItems.push(`${counts.empCount} employee IDs`);
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
  
  // ============ SMART EXIT LOGIC ============
  static shouldEndSession(session) {
    const userMessages = session.conversationHistory.filter(m => m.sender === 'user');
    const turnCount = userMessages.length;
    
    if (turnCount < 5) return false;
    
    const intel = session.intelligence;
    
    // Get unique counts
    const phoneCount = [...new Set(intel.phoneNumbers || [])].length;
    const bankCount = [...new Set(intel.bankAccounts || [])].length;
    const upiCount = [...new Set(intel.upiIds || [])].length;
    const linkCount = [...new Set(intel.phishingLinks || [])].length;
    const emailCount = [...new Set(intel.emailAddresses || [])].length;
    
    // Count unique data types (not total items)
    const extractionTypes = [];
    if (phoneCount > 0) extractionTypes.push('phone');
    if (bankCount > 0) extractionTypes.push('bank');
    if (upiCount > 0) extractionTypes.push('upi');
    if (linkCount > 0) extractionTypes.push('link');
    if (emailCount > 0) extractionTypes.push('email');
    
    const typeCount = extractionTypes.length;
    
    // EXIT: Got 2+ unique data types AND at least 5 turns
    if (typeCount >= 2 && turnCount >= 5) {
      console.log(`✅ EXIT: Collected ${typeCount} unique data types in ${turnCount} turns`);
      return true;
    }
    
    // EXIT: Got phone + (bank/UPI) AND 5+ turns
    if (phoneCount > 0 && (bankCount > 0 || upiCount > 0) && turnCount >= 5) {
      console.log(`✅ EXIT: Got phone + other data`);
      return true;
    }
    
    // EXIT: Max turns
    if (turnCount >= 10) {
      console.log(`✅ EXIT: Max turns reached`);
      return true;
    }
    
    return false;
  }
}