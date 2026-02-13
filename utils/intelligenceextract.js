
export class IntelligenceExtractor {
  static createEmptyStore() {
    return {
      bankAccounts: [],
      upiIds: [],
      phishingLinks: [],
      phoneNumbers: [],
      suspiciousKeywords: [],
      employeeIDs: [],
      branchCodes: [],
      designations: []
    };
  }

  static extractFromHistory(conversationHistory) {
    const intelligence = this.createEmptyStore();
    conversationHistory.forEach(msg => {
      if (msg.sender === 'scammer') {
        this.extractFromText(msg.text, intelligence);
      }
    });
    intelligence.bankAccounts = [...new Set(intelligence.bankAccounts)];
    intelligence.upiIds = [...new Set(intelligence.upiIds)];
    intelligence.phishingLinks = [...new Set(intelligence.phishingLinks)];
    intelligence.phoneNumbers = [...new Set(intelligence.phoneNumbers)];
    intelligence.suspiciousKeywords = [...new Set(intelligence.suspiciousKeywords)];
    intelligence.employeeIDs = [...new Set(intelligence.employeeIDs)];
    intelligence.branchCodes = [...new Set(intelligence.branchCodes)];
    intelligence.designations = [...new Set(intelligence.designations)];
    return intelligence;
  }

  static extractFromText(text, intelligence) {
    // Bank accounts
    const accounts16 = text.match(/\b\d{16}\b/g);
    if (accounts16) {
      accounts16.forEach(acc => {
        if (!intelligence.bankAccounts.includes(acc)) {
          intelligence.bankAccounts.push(acc);
        }
      });
    }
    const accounts12_15 = text.match(/\b\d{12,15}\b/g);
    if (accounts12_15) {
      accounts12_15.forEach(acc => {
        if (!intelligence.bankAccounts.includes(acc)) {
          intelligence.bankAccounts.push(acc);
        }
      });
    }
    const formatted = text.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g);
    if (formatted) {
      formatted.forEach(acc => {
        const clean = acc.replace(/[\s-]/g, '');
        if (!intelligence.bankAccounts.includes(clean)) {
          intelligence.bankAccounts.push(clean);
        }
      });
    }
    
    // UPI IDs
    const upis = text.match(/[\w.\-]+@[\w.\-]+/gi);
    if (upis) {
      upis.forEach(upi => {
        const clean = upi.toLowerCase().trim().replace(/[.,;:!?]$/, '');
        if (clean.includes('@') && clean.length > 3 && !intelligence.upiIds.includes(clean)) {
          intelligence.upiIds.push(clean);
        }
      });
    }
    
    // Phone numbers
    const phones = text.match(/\b[6-9]\d{9}\b/g);
    if (phones) {
      phones.forEach(phone => {
        if (!intelligence.phoneNumbers.includes(phone)) {
          intelligence.phoneNumbers.push(phone);
        }
      });
    }
    const phones91 = text.match(/\+91\s*([6-9]\d{9})\b/g);
    if (phones91) {
      phones91.forEach(phone => {
        const clean = phone.replace('+91', '').replace(/\s/g, '');
        if (!intelligence.phoneNumbers.includes(clean)) {
          intelligence.phoneNumbers.push(clean);
        }
      });
    }
    
    // Links
    const links = text.match(PATTERNS.link);
    if (links) {
      links.forEach(link => {
        const normalized = link.toLowerCase().trim();
        if (!intelligence.phishingLinks.includes(normalized)) {
          intelligence.phishingLinks.push(normalized);
        }
      });
    }
    
    // Employee IDs, Branch Codes, Designations
    const empIds = text.match(/\b[A-Z0-9]{4,10}\b/g);
    if (empIds) {
      empIds.forEach(id => {
        if (id.length >= 4 && id.length <= 10 && !intelligence.employeeIDs.includes(id)) {
          intelligence.employeeIDs.push(id);
        }
      });
    }
    
    const branchCodes = text.match(/\b\d{3,8}\b/g);
    if (branchCodes) {
      branchCodes.forEach(code => {
        if (code.length >= 3 && code.length <= 8 && !intelligence.branchCodes.includes(code)) {
          intelligence.branchCodes.push(code);
        }
      });
    }
    
    // Keywords
    if (PATTERNS.otp.test(text) || PATTERNS.otp_hindi.test(text)) 
      intelligence.suspiciousKeywords.push('otp_request');
    if (PATTERNS.pin.test(text)) 
      intelligence.suspiciousKeywords.push('pin_request');
    if (PATTERNS.upi.test(text) || intelligence.upiIds.length > 0) 
      intelligence.suspiciousKeywords.push('upi_request');
    if (PATTERNS.urgent.test(text) || PATTERNS.urgent_hindi.test(text)) 
      intelligence.suspiciousKeywords.push('urgency_tactic');
    if (PATTERNS.block.test(text)) 
      intelligence.suspiciousKeywords.push('account_block_threat');
    if (PATTERNS.compromised.test(text)) 
      intelligence.suspiciousKeywords.push('security_breach_claim');
    if (PATTERNS.bank.test(text)) 
      intelligence.suspiciousKeywords.push('bank_impersonation');
    if (PATTERNS.department.test(text) || PATTERNS.official.test(text)) 
      intelligence.suspiciousKeywords.push('authority_claim');
    if (PATTERNS.tollfree.test(text))
      intelligence.suspiciousKeywords.push('tollfree_mention');
    if (PATTERNS.fine.test(text))
      intelligence.suspiciousKeywords.push('fine_threat');
    if (PATTERNS.permanent.test(text))
      intelligence.suspiciousKeywords.push('permanent_block_threat');
    if (PATTERNS.transfer.test(text))
      intelligence.suspiciousKeywords.push('transfer_request');
    if (PATTERNS.link.test(text))
      intelligence.suspiciousKeywords.push('phishing_link');
    if (PATTERNS.fake_offer.test(text))
      intelligence.suspiciousKeywords.push('fake_offer');
    if (PATTERNS.employee_id.test(text))
      intelligence.suspiciousKeywords.push('employee_id_shared');
    if (PATTERNS.designation.test(text))
      intelligence.suspiciousKeywords.push('designation_shared');
    if (PATTERNS.branch_code.test(text))
      intelligence.suspiciousKeywords.push('branch_code_shared');
  }
}
