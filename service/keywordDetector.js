import { PATTERNS } from "../utils/pattern.js";

export default class KeywordDetector {
  static detectKeywords(text) {
    const detected = {
      // Original flags
      hasOTP: false, hasPIN: false, hasAccount: false, hasUPI: false, hasPhone: false,
      hasTollfree: false, hasUrgency: false, hasThreat: false, hasFine: false,
      hasPermanent: false, hasAuthority: false, hasCyber: false, hasBranch: false,
      hasFamily: false, hasResend: false, hasLink: false, hasFakeOffer: false,
      hasEmployeeID: false, hasDesignation: false, hasBranchCode: false,
      
      hasEmail: false,
      hasEmailRequest: false,
      hasEmailPasswordRequest: false,
      hasSuspiciousEmail: false,
      hasEmailContext: false,
      
      accountNumber: null, 
      upiId: null, 
      phoneNumber: null,
      extractedEmail: null,
      extractedName: null,
      
      // Counters
      otpRequestCount: 0, 
      threatCount: 0
    };
    
    // ============ OTP DETECTION ============
    if (PATTERNS.otp.test(text) || PATTERNS.otp_hindi.test(text)) {
      detected.hasOTP = true;
      detected.otpRequestCount++;
    }
    
    // ============ PIN DETECTION ============
    if (PATTERNS.pin.test(text)) detected.hasPIN = true;
    
    // ============ RESEND DETECTION ============
    if (PATTERNS.resend.test(text)) detected.hasResend = true;
    
    // ============ ACCOUNT NUMBER DETECTION ============
    const accountMatch = text.match(/\b\d{16}\b/) || text.match(/\b\d{12,16}\b/);
    if (accountMatch) {
      detected.hasAccount = true;
      detected.accountNumber = accountMatch[0];
    }
    
    // ============ UPI ID DETECTION ============
    const upiMatch = text.match(/[\w.\-]+@[\w.\-]+/i);
    if (upiMatch) {
      detected.hasUPI = true;
      detected.upiId = upiMatch[0].toLowerCase();
    }
    
    // ============ PHONE NUMBER DETECTION ============
    const phoneMatch = text.match(/\b[6-9]\d{9}\b/) || text.match(/\+91[\s-]?[6-9]\d{9}\b/);
    if (phoneMatch) {
      detected.hasPhone = true;
      let phone = phoneMatch[0];
      phone = phone.replace('+91', '').replace(/\s/g, '');
      detected.phoneNumber = phone;
    }
    
    // ============ EMAIL DETECTION ============
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
      detected.hasEmail = true;
      detected.extractedEmail = emailMatch[0].toLowerCase();
      
      // Check if email is suspicious (personal email claiming to be official)
      if ((emailMatch[0].includes('gmail.com') || emailMatch[0].includes('yahoo.com') || 
           emailMatch[0].includes('hotmail.com') || emailMatch[0].includes('outlook.com')) &&
          (text.toLowerCase().includes('bank') || text.toLowerCase().includes('sbi') || 
           text.toLowerCase().includes('official') || text.toLowerCase().includes('verify'))) {
        detected.hasSuspiciousEmail = true;
      }
    }
    
    // ============ EMAIL REQUEST DETECTION ============
    const emailRequestPattern = /(?:email|mail|ईमेल).{0,10}(?:bhej|send|forward|भेज|दो|दीजिए|पर)/i;
    detected.hasEmailRequest = emailRequestPattern.test(text);
    
    // ============ EMAIL PASSWORD REQUEST DETECTION ============
    const emailPasswordPattern = /(?:email|mail|ईमेल).{0,10}(?:password|pass|पासवर्ड|पास)/i;
    detected.hasEmailPasswordRequest = emailPasswordPattern.test(text);
    
    // ============ EMAIL CONTEXT DETECTION ============
    detected.hasEmailContext = /(?:email|mail|ईमेल)/i.test(text);
    
    // ============ NAME EXTRACTION ============
    const nameMatch = text.match(/(?:mera naam|my name is|main|मेरा नाम)\s+([A-Za-z\s]+?)(?:\s+hai|\s+हूँ|\.|,|$)/i);
    if (nameMatch && nameMatch[1]) {
      detected.extractedName = nameMatch[1].trim();
    }
    
    // ============ PATTERN-BASED DETECTIONS ============
    if (PATTERNS.tollfree.test(text)) detected.hasTollfree = true;
    
    if (PATTERNS.urgent.test(text) || PATTERNS.urgent_hindi.test(text) || PATTERNS.deadline.test(text)) 
      detected.hasUrgency = true;
    
    if (PATTERNS.block.test(text)) {
      detected.hasThreat = true;
      detected.threatCount++;
    }
    
    if (PATTERNS.fine.test(text)) detected.hasFine = true;
    if (PATTERNS.permanent.test(text)) detected.hasPermanent = true;
    
    if (PATTERNS.bank.test(text) || PATTERNS.department.test(text) || PATTERNS.official.test(text)) 
      detected.hasAuthority = true;
    
    if (PATTERNS.cyber.test(text)) detected.hasCyber = true;
    if (PATTERNS.branch.test(text)) detected.hasBranch = true;
    if (PATTERNS.family.test(text)) detected.hasFamily = true;
    if (PATTERNS.link.test(text)) detected.hasLink = true;
    if (PATTERNS.fake_offer.test(text)) detected.hasFakeOffer = true;
    if (PATTERNS.employee_id.test(text)) detected.hasEmployeeID = true;
    if (PATTERNS.designation.test(text)) detected.hasDesignation = true;
    if (PATTERNS.branch_code.test(text)) detected.hasBranchCode = true;
    
    return detected;
  }
  
  static hasAnyKeyword(detected) {
    return detected.hasOTP || detected.hasPIN || detected.hasAccount || detected.hasUPI ||
           detected.hasPhone || detected.hasTollfree || detected.hasUrgency || detected.hasThreat ||
           detected.hasFine || detected.hasPermanent || detected.hasAuthority || detected.hasCyber ||
           detected.hasBranch || detected.hasFamily || detected.hasResend || detected.hasLink ||
           detected.hasFakeOffer || detected.hasEmployeeID || detected.hasDesignation || 
           detected.hasBranchCode || detected.hasEmail || detected.hasEmailRequest;
  }
  
  static calculateRiskScore(detected) {
    let score = 0;
    
    // Original scoring
    if (detected.hasOTP) score += 35;
    if (detected.hasPIN) score += 30;
    if (detected.hasUPI) score += 25;
    if (detected.hasAccount) score += 20;
    if (detected.hasPhone) score += 15;
    if (detected.hasUrgency) score += 20;
    if (detected.hasThreat) score += 25;
    if (detected.hasFine) score += 20;
    if (detected.hasPermanent) score += 25;
    if (detected.hasAuthority) score += 15;
    if (detected.hasLink) score += 30;
    if (detected.hasFakeOffer) score += 25;
    if (detected.hasEmployeeID) score += 20;
    if (detected.hasDesignation) score += 15;
    if (detected.hasBranchCode) score += 15;
    
    // ============ NEW EMAIL SCORING ============
    if (detected.hasEmail) score += 10;
    if (detected.hasSuspiciousEmail) score += 20;
    if (detected.hasEmailPasswordRequest) score += 25;
    
    // Combination bonuses
    if (detected.hasOTP && detected.hasUPI) score += 20;
    if (detected.hasOTP && detected.hasAccount) score += 15;
    if (detected.hasThreat && detected.hasUrgency) score += 15;
    if (detected.hasEmail && detected.hasLink) score += 20; // Phishing email
    
    return Math.min(score, 100);
  }
}