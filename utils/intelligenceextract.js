import { PATTERNS } from "./pattern.js";

export class IntelligenceExtractor {
  static createEmptyStore() {
    return {
      // Primary extracted data (for callback)
      bankAccounts: [],
      upiIds: [],
      phishingLinks: [],
      phoneNumbers: [],
      emailAddresses: [],      // ✅ ADDED - Email extraction
      
      // Internal tracking (not sent to callback)
      suspiciousKeywords: [],  // Keep for internal logic
      employeeIDs: [],
      branchCodes: [],
      designations: [],
      bankNames: []             // For agentNotes
    };
  }

  static extractFromHistory(conversationHistory) {
    const intelligence = this.createEmptyStore();
    
    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      console.warn('⚠️ Invalid conversation history provided');
      return intelligence;
    }
    
    conversationHistory.forEach(msg => {
      if (msg?.sender === 'scammer' && msg?.text) {
        this.extractFromText(msg.text, intelligence);
      }
    });
    
    // Deduplicate all arrays
    for (const key in intelligence) {
      if (Array.isArray(intelligence[key])) {
        intelligence[key] = [...new Set(intelligence[key])];
      }
    }
    
    return intelligence;
  }

  static extractFromText(text, intelligence) {
    if (!text || typeof text !== 'string') return;
    
    // ============ BANK ACCOUNTS ============
    this.extractBankAccounts(text, intelligence);
    
    // ============ UPI IDs ============
    this.extractUPIIds(text, intelligence);
    
    // ============ PHONE NUMBERS ============
    this.extractPhoneNumbers(text, intelligence);
    
    // ============ EMAIL ADDRESSES ============
    this.extractEmailAddresses(text, intelligence);
    
    // ============ PHISHING LINKS ============
    this.extractLinks(text, intelligence);
    
    // ============ EMPLOYEE IDs, BRANCH CODES, DESIGNATIONS ============
    this.extractEmployeeInfo(text, intelligence);
    
    // ============ BANK NAMES ============
    this.extractBankNames(text, intelligence);
    
    // ============ SUSPICIOUS KEYWORDS (Internal only) ============
    this.extractKeywords(text, intelligence);
  }

  // ===============================
  // Bank Account Extraction
  // ===============================
  static extractBankAccounts(text, intelligence) {
    // 16-digit accounts (most common)
    const accounts16 = text.match(/\b\d{16}\b/g);
    if (accounts16) {
      accounts16.forEach(acc => {
        if (!intelligence.bankAccounts.includes(acc)) {
          intelligence.bankAccounts.push(acc);
          console.log(`✅ Extracted Bank Account (16-digit): ${acc}`);
        }
      });
    }
    
    // 12-15 digit accounts
    const accounts12_15 = text.match(/\b\d{12,15}\b/g);
    if (accounts12_15) {
      accounts12_15.forEach(acc => {
        if (!intelligence.bankAccounts.includes(acc)) {
          intelligence.bankAccounts.push(acc);
          console.log(`✅ Extracted Bank Account: ${acc}`);
        }
      });
    }
    
    // Formatted accounts (XXXX-XXXX-XXXX-XXXX)
    const formatted = text.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g);
    if (formatted) {
      formatted.forEach(acc => {
        const clean = acc.replace(/[\s-]/g, '');
        if (!intelligence.bankAccounts.includes(clean)) {
          intelligence.bankAccounts.push(clean);
          console.log(`✅ Extracted Bank Account (formatted): ${clean}`);
        }
      });
    }
  }

  // ===============================
  // UPI ID Extraction
  // ===============================
  static extractUPIIds(text, intelligence) {
    const upis = text.match(/[\w.\-]+@[\w.\-]+/gi);
    if (upis) {
      upis.forEach(upi => {
        const clean = upi.toLowerCase().trim().replace(/[.,;:!?]$/, '');
        if (clean.includes('@') && clean.length > 3 && !intelligence.upiIds.includes(clean)) {
          intelligence.upiIds.push(clean);
          console.log(`✅ Extracted UPI ID: ${clean}`);
        }
      });
    }
  }

  // ===============================
  // Phone Number Extraction
  // ===============================
  static extractPhoneNumbers(text, intelligence) {
    // Indian mobile numbers (10 digits starting with 6-9)
    const phones = text.match(/\b[6-9]\d{9}\b/g);
    if (phones) {
      phones.forEach(phone => {
        if (!intelligence.phoneNumbers.includes(phone)) {
          intelligence.phoneNumbers.push(phone);
          console.log(`✅ Extracted Phone: ${phone}`);
        }
      });
    }
    
    // Numbers with +91 prefix
    const phones91 = text.match(/\+91\s*([6-9]\d{9})\b/g);
    if (phones91) {
      phones91.forEach(phone => {
        const clean = phone.replace('+91', '').replace(/\s/g, '');
        if (!intelligence.phoneNumbers.includes(clean)) {
          intelligence.phoneNumbers.push(clean);
          console.log(`✅ Extracted Phone (+91): ${clean}`);
        }
      });
    }
    
    // Numbers with 0 prefix
    const phones0 = text.match(/0([6-9]\d{9})\b/g);
    if (phones0) {
      phones0.forEach(phone => {
        const clean = phone.slice(1);
        if (!intelligence.phoneNumbers.includes(clean)) {
          intelligence.phoneNumbers.push(clean);
          console.log(`✅ Extracted Phone (0): ${clean}`);
        }
      });
    }
  }

  // ===============================
  // Email Address Extraction - NEW
  // ===============================
  static extractEmailAddresses(text, intelligence) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex);
    if (emails) {
      emails.forEach(email => {
        const clean = email.toLowerCase().trim();
        if (!intelligence.emailAddresses.includes(clean)) {
          intelligence.emailAddresses.push(clean);
          console.log(`✅ Extracted Email: ${clean}`);
        }
      });
    }
  }

  // ===============================
  // Phishing Links Extraction
  // ===============================
  static extractLinks(text, intelligence) {
    const links = text.match(PATTERNS.link);
    if (links) {
      links.forEach(link => {
        const normalized = link.toLowerCase().trim();
        if (!intelligence.phishingLinks.includes(normalized)) {
          intelligence.phishingLinks.push(normalized);
          console.log(`✅ Extracted Link: ${normalized}`);
        }
      });
    }
  }

  // ===============================
  // Employee Info Extraction
  // ===============================
  static extractEmployeeInfo(text, intelligence) {
    // Employee IDs (alphanumeric, 4-10 chars)
    const empIds = text.match(/\b[A-Z0-9]{4,10}\b/g);
    if (empIds) {
      empIds.forEach(id => {
        if (id.length >= 4 && id.length <= 10 && !intelligence.employeeIDs.includes(id)) {
          intelligence.employeeIDs.push(id);
          console.log(`✅ Extracted Employee ID: ${id}`);
        }
      });
    }
    
    // Branch codes
    const branchCodes = text.match(/\b\d{3,8}\b/g);
    if (branchCodes) {
      branchCodes.forEach(code => {
        if (code.length >= 3 && code.length <= 8 && !intelligence.branchCodes.includes(code)) {
          intelligence.branchCodes.push(code);
          console.log(`✅ Extracted Branch Code: ${code}`);
        }
      });
    }
    
    // Designations
    const designationMatches = text.match(/\b(?:manager|officer|supervisor|head|clerk|agent|representative|कर्मचारी|मैनेजर)\b/i);
    if (designationMatches) {
      const desig = designationMatches[0].toLowerCase();
      if (!intelligence.designations.includes(desig)) {
        intelligence.designations.push(desig);
        console.log(`✅ Extracted Designation: ${desig}`);
      }
    }
  }

  // ===============================
  // Bank Names Extraction
  // ===============================
  static extractBankNames(text, intelligence) {
    const bankMatches = text.match(/\b(sbi|state bank|hdfc|icici|axis|kotak|pnb|canara|union|yesbank|bank of india|indian bank)\b/i);
    if (bankMatches) {
      const bank = bankMatches[0].toLowerCase();
      if (!intelligence.bankNames.includes(bank)) {
        intelligence.bankNames.push(bank);
        console.log(`✅ Extracted Bank Name: ${bank}`);
      }
    }
  }

  // ===============================
  // Keywords Extraction (Internal only)
  // ===============================
  static extractKeywords(text, intelligence) {
    if (PATTERNS.otp?.test(text) || PATTERNS.otp_hindi?.test(text)) 
      intelligence.suspiciousKeywords.push('otp_request');
    if (PATTERNS.pin?.test(text)) 
      intelligence.suspiciousKeywords.push('pin_request');
    if (PATTERNS.upi?.test(text) || intelligence.upiIds.length > 0) 
      intelligence.suspiciousKeywords.push('upi_request');
    if (PATTERNS.urgent?.test(text) || PATTERNS.urgent_hindi?.test(text)) 
      intelligence.suspiciousKeywords.push('urgency_tactic');
    if (PATTERNS.block?.test(text)) 
      intelligence.suspiciousKeywords.push('account_block_threat');
    if (PATTERNS.compromised?.test(text)) 
      intelligence.suspiciousKeywords.push('security_breach_claim');
    if (PATTERNS.bank?.test(text)) 
      intelligence.suspiciousKeywords.push('bank_impersonation');
    if (PATTERNS.department?.test(text) || PATTERNS.official?.test(text)) 
      intelligence.suspiciousKeywords.push('authority_claim');
    if (PATTERNS.tollfree?.test(text))
      intelligence.suspiciousKeywords.push('tollfree_mention');
    if (PATTERNS.fine?.test(text))
      intelligence.suspiciousKeywords.push('fine_threat');
    if (PATTERNS.permanent?.test(text))
      intelligence.suspiciousKeywords.push('permanent_block_threat');
    if (PATTERNS.transfer?.test(text))
      intelligence.suspiciousKeywords.push('transfer_request');
    if (PATTERNS.link?.test(text))
      intelligence.suspiciousKeywords.push('phishing_link');
    if (PATTERNS.fake_offer?.test(text))
      intelligence.suspiciousKeywords.push('fake_offer');
    if (PATTERNS.employee_id?.test(text))
      intelligence.suspiciousKeywords.push('employee_id_shared');
    if (PATTERNS.designation?.test(text))
      intelligence.suspiciousKeywords.push('designation_shared');
    if (PATTERNS.branch_code?.test(text))
      intelligence.suspiciousKeywords.push('branch_code_shared');
  }

  // ===============================
  // Helper: Get Extraction Summary
  // ===============================
  static getExtractionSummary(intelligence) {
    return {
      totalExtracted: 
        (intelligence.bankAccounts?.length || 0) +
        (intelligence.upiIds?.length || 0) +
        (intelligence.phoneNumbers?.length || 0) +
        (intelligence.phishingLinks?.length || 0) +
        (intelligence.emailAddresses?.length || 0),
      bankAccounts: intelligence.bankAccounts?.length || 0,
      upiIds: intelligence.upiIds?.length || 0,
      phones: intelligence.phoneNumbers?.length || 0,
      links: intelligence.phishingLinks?.length || 0,
      emails: intelligence.emailAddresses?.length || 0,
      employeeIds: intelligence.employeeIDs?.length || 0
    };
  }
}