import { CONFIG } from "../utils/config.js";
import axios from "axios";

export class CallbackService {
  static async sendFinalResult(sessionId, session) {
    
    // ============ 10 SECOND DELAY (REQUIRED BY EVALUATION) ============
    console.log(`⏱️ Waiting 10 seconds before sending callback...`);
    await this.delay(10000);
    console.log(`✅ Delay complete - preparing callback`);

    const intelligence = session.intelligence || {};
    
    // ============ ENSURE ALL ARRAYS EXIST ============
    const ensureArray = (arr) => Array.isArray(arr) ? arr : [];
    
    // ============ DEDUPLICATE ALL ARRAYS ============
    const phoneNumbers = [...new Set(ensureArray(intelligence.phoneNumbers))];
    const bankAccounts = [...new Set(ensureArray(intelligence.bankAccounts))];
    const upiIds = [...new Set(ensureArray(intelligence.upiIds))];
    const phishingLinks = [...new Set(ensureArray(intelligence.phishingLinks))];
    const emailAddresses = [...new Set(ensureArray(intelligence.emailAddresses))];
    
    // ============ ENSURE PROPER FORMATTING ============
    const formattedPhones = phoneNumbers.map(phone => {
      // Already in +91- format? Keep it
      if (phone.includes('+91-')) return phone;
      // 10-digit number? Add +91-
      if (/^[6-9]\d{9}$/.test(phone)) return `+91-${phone}`;
      // +91 without hyphen? Add hyphen
      if (phone.startsWith('+91') && !phone.includes('-')) {
        return phone.replace('+91', '+91-');
      }
      return phone;
    });
    
    // ============ BUILD EXTRACTED INTELLIGENCE OBJECT ============
    const extractedIntelligence = {};
    
    if (formattedPhones.length > 0) {
      extractedIntelligence.phoneNumbers = formattedPhones;
    }
    if (bankAccounts.length > 0) {
      extractedIntelligence.bankAccounts = bankAccounts;
    }
    if (upiIds.length > 0) {
      extractedIntelligence.upiIds = upiIds;
    }
    if (phishingLinks.length > 0) {
      extractedIntelligence.phishingLinks = phishingLinks;
    }
    if (emailAddresses.length > 0) {
      extractedIntelligence.emailAddresses = emailAddresses;
    }
    
    // ============ EXACT PAYLOAD STRUCTURE REQUIRED ============
    const payload = {
      sessionId: sessionId,
      scamDetected: session.scamDetected || false,
      totalMessagesExchanged: session.conversationHistory?.length || 0,
      extractedIntelligence: extractedIntelligence,
      agentNotes: this.generateAgentNotes(session, {
        phoneCount: formattedPhones.length,
        bankCount: bankAccounts.length,
        upiCount: upiIds.length,
        linkCount: phishingLinks.length,
        emailCount: emailAddresses.length,
        employeeCount: ensureArray(intelligence.employeeIDs).length,
        bankNames: ensureArray(intelligence.bankNames)
      })
    };
    
    // ============ LOG PAYLOAD FOR DEBUGGING ============
    console.log('\n' + '='.repeat(60));
    console.log('📤 FINAL CALLBACK PAYLOAD:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(payload, null, 2));
    console.log('='.repeat(60));
    
    // ============ SEND TO GUVI API ============
    try {
      const response = await axios.post(CONFIG.CALLBACK_URL, payload, { 
        timeout: CONFIG.CALLBACK_TIMEOUT || 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Callback successful for session: ${sessionId}`);
      console.log(`📡 Response:`, response.status);
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Callback failed: ${error.message}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data:`, error.response.data);
      }
      return { success: false };
    }
  }
  
  // ===============================
  // ⏰ 10 SECOND DELAY
  // ===============================
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ===============================
  // 📝 AGENT NOTES GENERATOR
  // ===============================
  static generateAgentNotes(session, counts) {
    const tactics = [];
    const extractedItems = [];
    const intelligence = session.intelligence || {};
    
    // ============ BUILD TACTICS LIST ============
    if (counts.phoneCount > 0) {
      tactics.push('phone number harvesting');
      extractedItems.push(`${counts.phoneCount} phone number${counts.phoneCount > 1 ? 's' : ''}`);
    }
    if (counts.bankCount > 0) {
      tactics.push('bank account harvesting');
      extractedItems.push(`${counts.bankCount} bank account${counts.bankCount > 1 ? 's' : ''}`);
    }
    if (counts.upiCount > 0) {
      tactics.push('UPI ID harvesting');
      extractedItems.push(`${counts.upiCount} UPI ID${counts.upiCount > 1 ? 's' : ''}`);
    }
    if (counts.linkCount > 0) {
      tactics.push('phishing link sharing');
      extractedItems.push(`${counts.linkCount} phishing link${counts.linkCount > 1 ? 's' : ''}`);
    }
    if (counts.emailCount > 0) {
      tactics.push('email harvesting');
      extractedItems.push(`${counts.emailCount} email address${counts.emailCount > 1 ? 'es' : ''}`);
    }
    if (counts.employeeCount > 0) {
      tactics.push('fake employee ID');
    }
    
    // ============ ADD BEHAVIORAL TACTICS ============
    if (session.otpRequests > 2) tactics.push('repeated OTP requests');
    if (session.threatCount > 1) tactics.push('threat tactics');
    if (session.repetitionCount > 2) tactics.push('scripted responses');
    
    // ============ BANK NAMES ============
    const bankNames = counts.bankNames || [];
    const bankContext = bankNames.length > 0 
      ? ` claiming to be from ${bankNames.join('/').toUpperCase()}` 
      : '';
    
    // ============ BUILD THE NOTES ============
    const tacticsText = tactics.length > 0 
      ? tactics.join(', ') 
      : 'scam attempt detected';
    
    let notes = `Scammer used ${tacticsText}${bankContext}. `;
    
    if (extractedItems.length > 0) {
      notes += `Extracted ` + extractedItems.join(', ') + `. `;
    }
    
    // ============ ADD SCAMMER CLAIMS ============
    if (intelligence.suspiciousKeywords?.includes('bank_impersonation')) {
      notes += `Scammer impersonated bank official. `;
    }
    if (intelligence.suspiciousKeywords?.includes('authority_claim')) {
      notes += `Claimed authority from fraud department. `;
    }
    
    notes += `Engaged for ${session.conversationHistory?.length || 0} messages.`;
    
    return notes;
  }
  
  // ===============================
  // 🎯 SMART EXIT LOGIC
  // ===============================
  static shouldEndSession(session) {
    if (!session) return false;
    
    const userMessages = session.conversationHistory?.filter(m => m?.sender === 'user') || [];
    const turnCount = userMessages.length;
    
    // ============ EXIT CONDITIONS ============
    
    // 1. MAX TURNS (8 is safe, 9 max)
    if (turnCount >= 8) {
      console.log(`✅ EXIT: Max turns (${turnCount}) reached`);
      return true;
    }
    
    // Need at least 4 turns for meaningful extraction
    if (turnCount < 4) return false;
    
    const intel = session.intelligence || {};
    
    // ============ COUNT UNIQUE EXTRACTIONS ============
    const phoneCount = [...new Set(intel.phoneNumbers || [])].length;
    const bankCount = [...new Set(intel.bankAccounts || [])].length;
    const upiCount = [...new Set(intel.upiIds || [])].length;
    const emailCount = [...new Set(intel.emailAddresses || [])].length;
    const linkCount = [...new Set(intel.phishingLinks || [])].length;
    
    // Count unique data TYPES (not just items)
    const uniqueTypes = [];
    if (phoneCount > 0) uniqueTypes.push('phone');
    if (bankCount > 0) uniqueTypes.push('bank');
    if (upiCount > 0) uniqueTypes.push('upi');
    if (emailCount > 0) uniqueTypes.push('email');
    if (linkCount > 0) uniqueTypes.push('link');
    
    const typeCount = uniqueTypes.length;
    
    // ============ EXIT STRATEGY ============
    
    // Got 2+ different types of data? Exit early
    if (typeCount >= 2 && turnCount >= 5) {
      console.log(`✅ EXIT: Collected ${typeCount} unique data types (${uniqueTypes.join(', ')})`);
      return true;
    }
    
    // Got 1 type but with multiple items? Exit if enough turns
    if (typeCount === 1 && turnCount >= 6) {
      const totalItems = phoneCount + bankCount + upiCount + emailCount + linkCount;
      if (totalItems >= 2) {
        console.log(`✅ EXIT: Collected ${totalItems} items of ${uniqueTypes[0]}`);
        return true;
      }
    }
    
    // Threat level too high? Exit
    if (session.threatCount > 3 && turnCount >= 5) {
      console.log(`✅ EXIT: High threat level (${session.threatCount})`);
      return true;
    }
    
    // OTP request spam? Exit
    if (session.otpRequests > 4 && turnCount >= 5) {
      console.log(`✅ EXIT: Too many OTP requests (${session.otpRequests})`);
      return true;
    }
    
    return false;
  }
}