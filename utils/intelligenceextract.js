// utils/intelligenceextract.js
import { PATTERNS } from "./pattern.js";

export class IntelligenceExtractor {
  static createEmptyStore() {
    return {
      // Primary extracted data (for callback)
      bankAccounts: [],
      upiIds: [],
      phishingLinks: [],
      phoneNumbers: [],
      emailAddresses: [],
      
      // Secondary data (for agentNotes & internal)
      suspiciousKeywords: [],
      employeeIDs: [],
      branchCodes: [],
      designations: [],
      bankNames: [],
      transactionIDs: [],
      ifscCodes: [],
      caseReferences: []
    };
  }

  static extractFromHistory(conversationHistory) {
    const intelligence = this.createEmptyStore();
    
    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      console.warn('⚠️ Invalid conversation history');
      return intelligence;
    }
    
    conversationHistory.forEach(msg => {
      if (msg?.sender === 'scammer' && msg?.text) {
        this.extractFromText(msg.text, intelligence);
      }
    });
    
    // DEDUPLICATE EVERYTHING
    for (const key in intelligence) {
      if (Array.isArray(intelligence[key])) {
        intelligence[key] = [...new Set(intelligence[key])];
      }
    }
    
    console.log(`📊 Extraction Summary:`, this.getExtractionSummary(intelligence));
    return intelligence;
  }

  static extractFromText(text, intelligence) {
    if (!text || typeof text !== 'string') return;
    
    // ============ BANK ACCOUNTS (10 POINTS) ============
    this.extractBankAccounts(text, intelligence);
    
    // ============ UPI IDs (10 POINTS) ============
    this.extractUPIIds(text, intelligence);
    
    // ============ PHONE NUMBERS (10 POINTS) ============
    this.extractPhoneNumbers(text, intelligence);
    
    // ============ EMAIL ADDRESSES (10 POINTS) ============
    this.extractEmailAddresses(text, intelligence);
    
    // ============ PHISHING LINKS (10 POINTS) ============
    this.extractPhishingLinks(text, intelligence);
    
    // ============ ENHANCED EXTRACTIONS (AgentNotes) ============
    this.extractEmployeeInfo(text, intelligence);
    this.extractBankNames(text, intelligence);
    this.extractIFSC(text, intelligence);
    this.extractTransactionIDs(text, intelligence);
    this.extractCaseReferences(text, intelligence);
    
    // ============ SUSPICIOUS KEYWORDS ============
    this.extractKeywords(text, intelligence);
  }

  // ===============================
  // 🏦 BANK ACCOUNT EXTRACTION - ULTIMATE
  // ===============================
  static extractBankAccounts(text, intelligence) {
    // Pattern 1: Exact 16-digit
    const accounts16 = text.match(/\b\d{16}\b/g);
    if (accounts16) {
      accounts16.forEach(acc => {
        if (this.isValidBankAccount(acc) && !intelligence.bankAccounts.includes(acc)) {
          intelligence.bankAccounts.push(acc);
          console.log(`✅ Bank Account (16-digit): ${acc}`);
        }
      });
    }
    
    // Pattern 2: 12-15 digit
    const accounts12_15 = text.match(/\b\d{12,15}\b/g);
    if (accounts12_15) {
      accounts12_15.forEach(acc => {
        if (this.isValidBankAccount(acc) && !intelligence.bankAccounts.includes(acc)) {
          intelligence.bankAccounts.push(acc);
          console.log(`✅ Bank Account: ${acc}`);
        }
      });
    }
    
    // Pattern 3: Formatted XXXX-XXXX-XXXX-XXXX
    const formatted = text.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g);
    if (formatted) {
      formatted.forEach(acc => {
        const clean = acc.replace(/[\s-]/g, '');
        if (this.isValidBankAccount(clean) && !intelligence.bankAccounts.includes(clean)) {
          intelligence.bankAccounts.push(clean);
          console.log(`✅ Bank Account (formatted): ${clean}`);
        }
      });
    }
    
    // Pattern 4: With context "account number: 1234567890123456"
    const contextMatches = text.match(/(?:account|a\/c|खाता|अकाउंट)[\s#:]*(\d{9,18})/gi);
    if (contextMatches) {
      contextMatches.forEach(match => {
        const digits = match.replace(/\D/g, '');
        if (this.isValidBankAccount(digits) && !intelligence.bankAccounts.includes(digits)) {
          intelligence.bankAccounts.push(digits);
          console.log(`✅ Bank Account (context): ${digits}`);
        }
      });
    }
  }

  static isValidBankAccount(acc) {
    // Must be 9-18 digits, not all zeros, not sequential 123456...
    if (acc.length < 9 || acc.length > 18) return false;
    if (/^0+$/.test(acc)) return false;
    if (/^123456789/.test(acc)) return false; // Test data pattern
    return true;
  }

  // ===============================
  // 💳 UPI ID EXTRACTION - ULTIMATE
  // ===============================
  static extractUPIIds(text, intelligence) {
    // Pattern 1: Standard UPI format
    const upis = text.match(/[\w.\-]+@[\w.\-]+/gi);
    if (upis) {
      upis.forEach(upi => {
        const clean = upi.toLowerCase().trim().replace(/[.,;:!?]$/, '');
        if (this.isValidUPI(clean) && !intelligence.upiIds.includes(clean)) {
          intelligence.upiIds.push(clean);
          console.log(`✅ UPI ID: ${clean}`);
        }
      });
    }
    
    // Pattern 2: With spaces "UPI ID: username @ bank"
    const spacedMatches = text.match(/(?:upi|pay)[\s:]*([a-z0-9._-]+)\s*@\s*([a-z0-9._-]+)/gi);
    if (spacedMatches) {
      spacedMatches.forEach(match => {
        const clean = match.replace(/\s+/g, '').toLowerCase();
        if (this.isValidUPI(clean) && !intelligence.upiIds.includes(clean)) {
          intelligence.upiIds.push(clean);
          console.log(`✅ UPI ID (spaced): ${clean}`);
        }
      });
    }
  }

  static isValidUPI(upi) {
    if (!upi.includes('@')) return false;
    if (upi.length < 5 || upi.length > 50) return false;
    const [username, handle] = upi.split('@');
    if (!username || !handle) return false;
    if (username.length < 2) return false;
    return true;
  }

  // ===============================
  // 📱 PHONE NUMBER EXTRACTION - ULTIMATE (10 POINTS)
  // ===============================
  static extractPhoneNumbers(text, intelligence) {
    // Pattern 1: 10-digit Indian mobile
    const phones = text.match(/\b[6-9]\d{9}\b/g);
    if (phones) {
      phones.forEach(phone => {
        const formatted = `+91-${phone}`;
        if (!intelligence.phoneNumbers.includes(formatted)) {
          intelligence.phoneNumbers.push(formatted);
          console.log(`✅ Phone (+91 format): ${formatted}`);
        }
      });
    }
    
    // Pattern 2: With +91 prefix
    const phones91 = text.match(/\+91\s*([6-9]\d{9})\b/g);
    if (phones91) {
      phones91.forEach(phone => {
        const clean = phone.replace('+91', '').replace(/\s/g, '');
        const formatted = `+91-${clean}`;
        if (!intelligence.phoneNumbers.includes(formatted)) {
          intelligence.phoneNumbers.push(formatted);
          console.log(`✅ Phone (+91): ${formatted}`);
        }
      });
    }
    
    // Pattern 3: With 0 prefix
    const phones0 = text.match(/0([6-9]\d{9})\b/g);
    if (phones0) {
      phones0.forEach(phone => {
        const clean = phone.slice(1);
        const formatted = `+91-${clean}`;
        if (!intelligence.phoneNumbers.includes(formatted)) {
          intelligence.phoneNumbers.push(formatted);
          console.log(`✅ Phone (0): ${formatted}`);
        }
      });
    }
    
    // Pattern 4: Toll-free numbers
    const tollfree = text.match(/\b1800[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g);
    if (tollfree) {
      tollfree.forEach(phone => {
        const clean = phone.replace(/\s/g, '');
        if (!intelligence.phoneNumbers.includes(clean)) {
          intelligence.phoneNumbers.push(clean);
          console.log(`✅ Toll-free: ${clean}`);
        }
      });
    }
    
    // Pattern 5: International format
    const intl = text.match(/\+\d{1,3}[\s-]?\d{6,12}\b/g);
    if (intl) {
      intl.forEach(phone => {
        if (!intelligence.phoneNumbers.includes(phone)) {
          intelligence.phoneNumbers.push(phone);
          console.log(`✅ International: ${phone}`);
        }
      });
    }
  }

  // ===============================
  // ✉️ EMAIL EXTRACTION - NEW (10 POINTS)
  // ===============================
  static extractEmailAddresses(text, intelligence) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex);
    
    if (emails) {
      emails.forEach(email => {
        const clean = email.toLowerCase().trim();
        if (this.isValidEmail(clean) && !intelligence.emailAddresses.includes(clean)) {
          intelligence.emailAddresses.push(clean);
          console.log(`✅ Email: ${clean}`);
        }
      });
    }
    
    // Pattern 2: Obfuscated emails "user at domain dot com"
    const obfuscated = text.match(/([a-z0-9._-]+)\s*(?:at|@)\s*([a-z0-9.-]+)\s*(?:dot|\.)\s*([a-z]{2,})/gi);
    if (obfuscated) {
      obfuscated.forEach(match => {
        const email = match.replace(/\s+(?:at|@)\s+/g, '@').replace(/\s+(?:dot|\.)\s+/g, '.');
        const clean = email.toLowerCase().replace(/\s/g, '');
        if (this.isValidEmail(clean) && !intelligence.emailAddresses.includes(clean)) {
          intelligence.emailAddresses.push(clean);
          console.log(`✅ Email (obfuscated): ${clean}`);
        }
      });
    }
  }

  static isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  // ===============================
  // 🔗 PHISHING LINK EXTRACTION - ULTIMATE
  // ===============================
  static extractPhishingLinks(text, intelligence) {
    const patterns = [
      /\bhttps?:\/\/[^\s<>"']+/gi,
      /\bwww\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s<>"']*/gi,
      /\b(?:bit\.ly|tinyurl|rb\.gy|ow\.ly|is\.gd|shorturl|short\.link)\/[a-zA-Z0-9]+/gi,
      /\b[a-zA-Z0-9.-]+\.(?:xyz|top|club|online|site|live|link|click)\b/gi
    ];
    
    patterns.forEach(pattern => {
      const links = text.match(pattern);
      if (links) {
        links.forEach(link => {
          const normalized = link.toLowerCase().trim();
          if (!intelligence.phishingLinks.includes(normalized)) {
            intelligence.phishingLinks.push(normalized);
            console.log(`✅ Link: ${normalized}`);
          }
        });
      }
    });
  }

  // ===============================
  // 👤 EMPLOYEE INFO EXTRACTION
  // ===============================
  static extractEmployeeInfo(text, intelligence) {
    // Employee IDs
    const empMatches = text.match(PATTERNS.employee_id) || 
                      text.match(/\b(?:emp|employee|staff)[\s#:]*([A-Z0-9]{4,10})\b/i);
    if (empMatches) {
      const empId = empMatches[0].replace(/[^A-Z0-9]/ig, '');
      if (!intelligence.employeeIDs.includes(empId)) {
        intelligence.employeeIDs.push(empId);
        console.log(`✅ Employee ID: ${empId}`);
      }
    }
    
    // Branch Codes
    const branchMatches = text.match(PATTERNS.branch_code) ||
                         text.match(/\b\d{3,8}\b/g);
    if (branchMatches) {
      branchMatches.forEach(code => {
        if (code.length >= 3 && code.length <= 8 && !intelligence.branchCodes.includes(code)) {
          intelligence.branchCodes.push(code);
          console.log(`✅ Branch Code: ${code}`);
        }
      });
    }
    
    // Designations
    const desigMatches = text.match(/\b(?:manager|officer|supervisor|head|clerk|agent|representative|कर्मचारी|मैनेजर)\b/i);
    if (desigMatches) {
      const desig = desigMatches[0].toLowerCase();
      if (!intelligence.designations.includes(desig)) {
        intelligence.designations.push(desig);
        console.log(`✅ Designation: ${desig}`);
      }
    }
  }

  // ===============================
  // 🏛️ BANK NAMES EXTRACTION
  // ===============================
  static extractBankNames(text, intelligence) {
    const bankNames = [
      'sbi', 'state bank', 'hdfc', 'icici', 'axis', 'kotak', 
      'pnb', 'canara', 'union', 'yesbank', 'bank of india', 
      'indian bank', 'central bank', 'bandhan'
    ];
    
    const bankRegex = new RegExp(`\\b(?:${bankNames.join('|')})\\b`, 'gi');
    const matches = text.match(bankRegex);
    
    if (matches) {
      matches.forEach(bank => {
        const clean = bank.toLowerCase();
        if (!intelligence.bankNames.includes(clean)) {
          intelligence.bankNames.push(clean);
          console.log(`✅ Bank Name: ${clean}`);
        }
      });
    }
  }

  // ===============================
  // 🔢 IFSC CODE EXTRACTION
  // ===============================
  static extractIFSC(text, intelligence) {
    const ifscRegex = /\b[A-Z]{4}0[A-Z0-9]{6}\b/;
    const matches = text.match(ifscRegex);
    
    if (matches) {
      matches.forEach(ifsc => {
        if (!intelligence.ifscCodes) {
          intelligence.ifscCodes = [];
        }
        if (!intelligence.ifscCodes.includes(ifsc)) {
          intelligence.ifscCodes.push(ifsc);
          console.log(`✅ IFSC: ${ifsc}`);
        }
      });
    }
  }

  // ===============================
  // 🔑 TRANSACTION ID EXTRACTION
  // ===============================
  static extractTransactionIDs(text, intelligence) {
    const txnPatterns = [
      /\b(?:txn|trans|ref|reference)[\s#:]*([A-Z0-9]{8,20})\b/i,
      /\b[A-Z0-9]{12,20}\b/g
    ];
    
    txnPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(txn => {
          const clean = txn.replace(/[^A-Z0-9]/ig, '');
          if (clean.length >= 8 && clean.length <= 20) {
            if (!intelligence.transactionIDs) {
              intelligence.transactionIDs = [];
            }
            if (!intelligence.transactionIDs.includes(clean)) {
              intelligence.transactionIDs.push(clean);
              console.log(`✅ Transaction ID: ${clean}`);
            }
          }
        });
      }
    });
  }

  // ===============================
  // 📋 CASE REFERENCES EXTRACTION
  // ===============================
  static extractCaseReferences(text, intelligence) {
    const casePatterns = [
      /(?:case|complaint|ticket|sr|service request)[\s#:]*([A-Z0-9]{6,15})/gi,
      /(?:केस|शिकायत)[\s#:]*([A-Z0-9]{6,15})/gi
    ];
    
    casePatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          if (!intelligence.caseReferences) {
            intelligence.caseReferences = [];
          }
          if (!intelligence.caseReferences.includes(match[1])) {
            intelligence.caseReferences.push(match[1]);
            console.log(`✅ Case Reference: ${match[1]}`);
          }
        }
      }
    });
  }

  // ===============================
  // 🔍 KEYWORD EXTRACTION
  // ===============================
  static extractKeywords(text, intelligence) {
    const keywordMap = {
      otp: 'otp_request',
      pin: 'pin_request',
      upi: 'upi_request',
      urgent: 'urgency_tactic',
      block: 'account_block_threat',
      compromised: 'security_breach_claim',
      bank: 'bank_impersonation',
      department: 'authority_claim',
      official: 'authority_claim',
      tollfree: 'tollfree_mention',
      fine: 'fine_threat',
      permanent: 'permanent_block_threat',
      transfer: 'transfer_request',
      link: 'phishing_link',
      fake_offer: 'fake_offer'
    };
    
    for (const [key, value] of Object.entries(keywordMap)) {
      if (PATTERNS[key]?.test(text)) {
        if (!intelligence.suspiciousKeywords.includes(value)) {
          intelligence.suspiciousKeywords.push(value);
        }
      }
    }
  }

  // ===============================
  // 📊 EXTRACTION SUMMARY
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
      employeeIds: intelligence.employeeIDs?.length || 0,
      bankNames: intelligence.bankNames?.length || 0
    };
  }
}