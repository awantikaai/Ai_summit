import { REPLIES } from "./replies.js";
import { PerplexityService } from "../service/perplexity.js";
import { CONFIG } from "./config.js";

export class ReplyGenerator {

  static async generateReply(detected, session, messageText, conversationHistory) {

    // Initialize memory tracking if not exists
    if (!session.memory) {
      session.memory = {
        askedName: false,
        askedPhone: false,
        askedCallBack: false,
        askedOTP: false,
        askedTransaction: false,
        askedAccount: false,
        askedUPI: false,
        askedEmployeeID: false,
        askedBranchCode: false,
        askedOfficialEmail: false,
        questionedOfficial: false,
        
        extractedInfo: {
          scammerName: null,
          scammerPhone: null,
          scammerID: null,
          accountNumber: null,
          upiId: null,
          bankName: null,
          email: null
        },
        
        currentPhase: 1,
        phaseCompleted: {
          phase1: false, phase2: false, phase3: false, phase4: false, phase5: false
        },
        
        threatCount: 0,
        otpRequests: 0,
        lastTopics: [],
        
        authorityChallenged: false,
        cyberMentioned: false,
        branchMentioned: false,
        tollfreeMentioned: false,
        askedVictimPhone: false,
        phoneMentionCount: 0,
        
        isFirstMessage: session.turnCount === 0,
        usedPerplexity: false
      };
    }

    // ============ CHECK FOR AMBIGUOUS MESSAGES ============
    // If no clear scam indicators and early turn, use Perplexity
    const hasClearScamIndicators = this.hasScamIndicators(detected);
    const isAmbiguous = !hasClearScamIndicators && session.turnCount < CONFIG.PERPLEXITY_TRIGGER_TURNS_MAX;
    
    if (isAmbiguous && CONFIG.USE_PERPLEXITY) {
      console.log('🤔 Ambiguous message detected - using Perplexity');
      session.memory.usedPerplexity = true;
      const category = await PerplexityService.selectCategory(messageText, conversationHistory, CONFIG);
      const reply = PerplexityService.getReply(category, session);
      if (reply) {
        console.log(`🎯 Perplexity category: ${category}`);
        return reply;
      }
    }

    // ============ SPECIAL HANDLING FOR GREETINGS ============
    const isGreeting = this.isGreetingOnly(detected, session.lastScammerMessage);
    
    if (isGreeting && session.turnCount === 0) {
      console.log('👋 Greeting detected - responding normally');
      return this.getReply("greeting_response", session);
    }

    // Update counters
    this.updateCountersAndExtract(detected, session);
    this.determineCurrentPhase(session);

    // PHASE 6: EXIT (Turns 9-10)
    if (session.memory.currentPhase >= 6 || session.turnCount >= 9) {
      session.memory.currentPhase = 6;
      return this.getPhase6ExitResponse(session);
    }
    
    // PHASE 5: ESCALATION (Turns 7-8)
    if (session.memory.currentPhase >= 5 || 
        (session.memory.threatCount >= 3 && session.memory.otpRequests >= 2) ||
        session.turnCount >= 7) {
      session.memory.currentPhase = 5;
      return this.getPhase5EscalationResponse(detected, session);
    }
    
    // PHASE 4: AUTHORITY CHALLENGE (Turns 5-6)
    if (session.memory.currentPhase >= 4 ||
        (session.memory.extractedInfo.accountNumber && session.memory.extractedInfo.scammerPhone) ||
        session.memory.otpRequests >= 2 ||
        session.turnCount >= 5) {
      session.memory.currentPhase = 4;
      return this.getPhase4AuthorityResponse(detected, session);
    }
    
    // PHASE 3: INTELLIGENCE EXTRACTION (Turns 3-4)
    if (session.memory.currentPhase >= 3 || session.turnCount >= 3) {
      session.memory.currentPhase = 3;
      return this.getPhase3ExtractionResponse(detected, session);
    }
    
    // PHASE 2: CURIOSITY (Turn 2)
    if (session.memory.currentPhase >= 2 || session.turnCount >= 2) {
      session.memory.currentPhase = 2;
      return this.getPhase2CuriosityResponse(detected, session);
    }
    
    // PHASE 1: CONFUSION (Turn 1) - Only if not a greeting
    return this.getPhase1ConfusionResponse(session);
  }

  // ===============================
  // Check if message has scam indicators
  // ===============================
  static hasScamIndicators(detected) {
    return detected.hasOTP || detected.hasPIN || detected.hasAccount || 
           detected.hasUPI || detected.hasPhone || detected.hasThreat ||
           detected.hasUrgency || detected.hasLink || detected.hasBank ||
           detected.hasFakeOffer || detected.hasInvestment || detected.hasLottery ||
           detected.hasVirus || detected.hasKYC || detected.hasRefund ||
           detected.hasGiftCard || detected.hasJob || detected.hasLoan ||
           detected.hasEmployeeID || detected.hasEmail;
  }

  // ===============================
  // Check if message is just a greeting
  // ===============================
  static isGreetingOnly(detected, message) {
    if (!message) return false;
    
    const lowerMsg = message.toLowerCase();
    
    const isGreeting = /^(hi|hello|hey|namaste|नमस्ते|kaise ho|kya haal|good morning|good evening|good afternoon|how are you|kaisa hai)/i.test(lowerMsg);
    const hasScamIndicators = this.hasScamIndicators(detected);
    
    return isGreeting && !hasScamIndicators;
  }

  // ===============================
  // PHASE 1: CONFUSION (Turn 1)
  // ===============================
  static getPhase1ConfusionResponse(session) {
    if (!session.memory.phaseCompleted.phase1) {
      session.memory.phaseCompleted.phase1 = true;
      session.memory.lastTopics.unshift('confused');
    }
    return this.getReply("victim_confused", session);
  }

  static getPhase2CuriosityResponse(detected, session) {
    if (!session.memory.phaseCompleted.phase2) {
      session.memory.phaseCompleted.phase2 = true;
      if (!session.memory.askedTransaction) {
        session.memory.askedTransaction = true;
        session.memory.lastTopics.unshift('transaction');
        return this.getReply("victim_worried", session);
      }
    }
    
    if (detected.hasThreat && !session.memory.askedWhyBlock) {
      session.memory.askedWhyBlock = true;
      return "Aisa kyun ho raha hai? Mujhe samajh nahi aaya.";
    }
    
    return this.getReply("victim_worried", session);
  }

  static getPhase3ExtractionResponse(detected, session) {
    
    // Email extraction
    if (detected.hasEmail && detected.extractedEmail && !session.memory.extractedInfo.email) {
      session.memory.extractedInfo.email = detected.extractedEmail;
      session.memory.lastTopics.unshift('email');
      return this.getReplyWithParam("email_provided", "{email}", detected.extractedEmail, session);
    }
    
    if (detected.hasEmailRequest && !session.memory.askedEmail) {
      session.memory.askedEmail = true;
      return this.getReply("email_send_request", session);
    }
    
    // Name extraction
    if (!session.memory.askedName && !session.memory.extractedInfo.scammerName && detected.extractedName) {
      session.memory.askedName = true;
      session.memory.extractedInfo.scammerName = detected.extractedName;
      session.memory.lastTopics.unshift('name');
      return this.getReply("ask_scammer_name", session);
    }
    
    // Phone extraction
    if (!session.memory.askedPhone && !session.memory.extractedInfo.scammerPhone && detected.phoneNumber) {
      session.memory.askedPhone = true;
      session.memory.extractedInfo.scammerPhone = detected.phoneNumber;
      session.memory.lastTopics.unshift('phone');
      return this.getReplyWithParam("phone_scammer_curious", "{phone}", detected.phoneNumber, session);
    }
    
    // Account extraction
    if (detected.hasAccount && detected.accountNumber && !session.memory.extractedInfo.accountNumber) {
      session.memory.extractedInfo.accountNumber = detected.accountNumber;
      session.memory.lastTopics.unshift('account_shocked');
      return this.getReplyWithParam("account_shocked", "{account}", detected.accountNumber, session);
    }
    
    // UPI extraction
    if (detected.hasUPI && detected.upiId && !session.memory.extractedInfo.upiId) {
      session.memory.extractedInfo.upiId = detected.upiId;
      session.memory.lastTopics.unshift('upi_confirm');
      return this.getReplyWithParam("upi_confirm", "{upi}", detected.upiId, session);
    }
    
    // Phone number context
    if (detected.hasPhone && detected.phoneNumber) {
      return this.handlePhoneNumber(detected.phoneNumber, session);
    }
    
    // Investment/Lottery/Job/Loan/GiftCard
    if (detected.hasFakeOffer || detected.hasLottery) {
      return this.getReply("lottery_surprised", session);
    }
    if (detected.hasInvestment) {
      return this.getReply("investment_curious", session);
    }
    if (detected.hasJob) {
      return this.getReply("job_interested", session);
    }
    if (detected.hasLoan) {
      return this.getReply("loan_interested", session);
    }
    if (detected.hasGiftCard) {
      return this.getReply("giftcard_curious", session);
    }
    
    if (!session.memory.phaseCompleted.phase3) {
      session.memory.phaseCompleted.phase3 = true;
      return this.getReply("victim_asking", session);
    }
    
    return this.getReply("victim_asking", session);
  }

  static getPhase4AuthorityResponse(detected, session) {
    
    if (!session.memory.askedEmployeeID) {
      session.memory.askedEmployeeID = true;
      session.memory.lastTopics.unshift('employee_id');
      return this.getReply("ask_employee_id", session);
    }
    
    if (!session.memory.askedBranchCode) {
      session.memory.askedBranchCode = true;
      session.memory.lastTopics.unshift('branch_code');
      return this.getReply("ask_branch_code", session);
    }
    
    if (!session.memory.questionedOfficial) {
      session.memory.questionedOfficial = true;
      session.memory.lastTopics.unshift('official');
      return this.getReply("ask_official_number", session);
    }
    
    if (!session.memory.phaseCompleted.phase4) {
      session.memory.phaseCompleted.phase4 = true;
    }
    
    return this.getReply("authority_believe", session);
  }

  static getPhase5EscalationResponse(detected, session) {
    
    if (!session.memory.cyberMentioned) {
      session.memory.cyberMentioned = true;
      session.memory.lastTopics.unshift('cyber');
      return this.getReply("cyber_threat", session);
    }
    
    if (!session.memory.branchMentioned) {
      session.memory.branchMentioned = true;
      session.memory.lastTopics.unshift('branch');
      return this.getReply("branch_visit", session);
    }
    
    if (!session.memory.tollfreeMentioned) {
      session.memory.tollfreeMentioned = true;
      return this.getReply("tollfree_curious", session);
    }
    
    if (!session.memory.phaseCompleted.phase5) {
      session.memory.phaseCompleted.phase5 = true;
    }
    
    return this.getReply("cyber_threat", session);
  }

  static getPhase6ExitResponse(session) {
    const exitReplies = [
      "Main branch ja raha hoon aur wahan complaint register karunga.",
      "Main SBI ke official number 1800 425 3800 pe call kar raha hoon.",
      "Main cyber cell mein complaint file kar dunga. Aapka number note kar liya.",
      "Is conversation ko yahin end karte hain. Main official channel se verify karunga.",
      "Thank you for the information. Main SBI customer care se confirm kar lunga."
    ];
    
    const index = session.turnCount % exitReplies.length;
    return exitReplies[index];
  }

  static handlePhoneNumber(phoneNumber, session) {
    const lastMessage = session.lastScammerMessage?.toLowerCase() || '';
    const currentMessage = session.conversationHistory[session.conversationHistory.length - 1]?.text?.toLowerCase() || '';
    const fullContext = lastMessage + ' ' + currentMessage;

    const isVictimPhone = fullContext.includes('aapke') || fullContext.includes('aapka') ||
                          fullContext.includes('your') || 
                          (fullContext.includes('otp') && fullContext.includes('number')) ||
                          fullContext.includes('इस नंबर पे') || fullContext.includes('aaya hai');

    const isScammerPhone = fullContext.includes('mera') || fullContext.includes('my') ||
                           fullContext.includes('hamara') || fullContext.includes('call me') ||
                           fullContext.includes('mujhe call') || fullContext.includes('इस नंबर से');

    session.memory.phoneMentionCount = (session.memory.phoneMentionCount || 0) + 1;

    if (isVictimPhone && !session.memory.askedVictimPhone) {
      session.memory.askedVictimPhone = true;
      session.memory.lastTopics.unshift('phone_victim');
      return this.getReplyWithParam("phone_victim_confirm", "{phone}", phoneNumber, session);
    }
    else if (isScammerPhone && !session.memory.extractedInfo.scammerPhone) {
      session.memory.extractedInfo.scammerPhone = phoneNumber;
      session.memory.lastTopics.unshift('phone_scammer');
      return this.getReplyWithParam("phone_scammer_curious", "{phone}", phoneNumber, session);
    }
    else if (session.memory.extractedInfo.scammerPhone && session.memory.phoneMentionCount > 1) {
      return this.getReplyWithParam("phone_scammer_compare", "{phone}", phoneNumber, session);
    }
    else {
      return this.getReplyWithParam("phone_ambiguous", "{phone}", phoneNumber, session);
    }
  }

  static updateCountersAndExtract(detected, session) {
    if (detected.hasThreat) {
      session.memory.threatCount = (session.memory.threatCount || 0) + 1;
    }
    if (detected.hasOTP) {
      session.memory.otpRequests = (session.memory.otpRequests || 0) + detected.otpRequestCount;
    }
  }

  static determineCurrentPhase(session) {
    if (session.memory.extractedInfo.accountNumber && 
        session.memory.extractedInfo.scammerPhone && 
        session.memory.otpRequests >= 3 &&
        session.turnCount >= 8) {
      session.memory.currentPhase = 6;
      return;
    }
    
    if ((session.memory.threatCount >= 3 && session.memory.otpRequests >= 2) ||
        (session.memory.extractedInfo.accountNumber && session.memory.extractedInfo.scammerPhone) ||
        session.turnCount >= 7) {
      session.memory.currentPhase = Math.max(session.memory.currentPhase, 5);
      return;
    }
    
    if ((session.memory.extractedInfo.scammerName || session.memory.otpRequests >= 2) ||
        session.turnCount >= 5) {
      session.memory.currentPhase = Math.max(session.memory.currentPhase, 4);
      return;
    }
    
    if (session.turnCount >= 3) {
      session.memory.currentPhase = Math.max(session.memory.currentPhase, 3);
      return;
    }
    
    if (session.turnCount >= 2) {
      session.memory.currentPhase = Math.max(session.memory.currentPhase, 2);
    }
  }

  static getReply(key, session) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) return this.getContextualFallback(session);

    const index = (session.turnCount + session.memory.otpRequests + session.memory.threatCount) % replies.length;
    return replies[index];
  }

  static getReplyWithParam(key, placeholder, value, session) {
    const reply = this.getReply(key, session);
    return reply.replace(new RegExp(placeholder.replace('{', '\\{').replace('}', '\\}'), 'g'), value);
  }

  static getContextualFallback(session) {
    const fallbacks = [
      "Mujhe samajh nahi aaya. Aap hi batao kya karna hai?",
      "Main confuse hoon. Thoda explain karo.",
      "Mera account safe hai na? Aap batao.",
      "Kya exact problem hai? Main tension mein hoon.",
      "Aap guide karo, main aapke bharose hoon."
    ];
    const index = session.turnCount % fallbacks.length;
    return fallbacks[index];
  }
}