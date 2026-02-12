// ==============================================
// ADD THIS TO YOUR EXISTING CONFIG
// ==============================================

const CONFIG = {

    CALLBACK_URL: 'https://hackathon.guvi.in/api/updateHoneyPotFinalResult',
    CALLBACK_TIMEOUT: 5000,
    SESSION_TIMEOUT: 3600000, 
    
    USE_PERPLEXITY: true,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY ,
    PERPLEXITY_URL: 'https://api.perplexity.ai/chat/completions',
    PERPLEXITY_TIMEOUT: 3000,
    
    PERPLEXITY_TRIGGER_RISK_MAX: 30,
    PERPLEXITY_TRIGGER_TURNS_MAX: 4
};
const LANGUAGE_PATTERNS = {
    // ============ ENGLISH DETECTION ============
    english: {
        patterns: [
            /\b(?:the|a|an|is|are|was|were|will|shall|can|could|may|might|must|should)\b/i,
            /\b(?:your|my|his|her|our|their|its)\b/i,
            /\b(?:account|bank|otp|pin|password|verify|confirm|urgent|immediate)\b/i,
            /^[A-Za-z\s.,!?'"()-]+$/, // Mostly English characters
        ],
        weight: 1.0
    },
    
    // ============ HINDI DETECTION (Devanagari) ============
    hindi: {
        patterns: [
            /[\u0900-\u097F]/, // Devanagari Unicode range
            /\b(?:है|हैं|था|थे|होगा|होगी|करो|दो|भेजो|बताओ|सकते|सकता)\b/,
            /\b(?:आपका|आपकी|आपके|मेरा|मेरी|मेरे|हमारा|हमारी)\b/,
            /\b(?:खाता|अकाउंट|बैंक|ओटीपी|पिन|पासवर्ड|वेरिफिकेशन)\b/,
        ],
        weight: 2.0 // Higher weight - devanagari is definitive
    },
    
    // ============ HINGLISH DETECTION (Hindi words in English script) ============
    hinglish: {
        patterns: [
            /\b(?:aap|aapka|aapki|aapke|mera|meri|mere|humaara|humaari)\b/i,
            /\b(?:hai|hain|tha|the|hoga|hogi|karo|do|bhejo|batao|sakte|sakta)\b/i,
            /\b(?:kya|kaun|kaise|kyun|kahan|kab|kitna|kitne)\b/i,
            /\b(?:account|bank|otp|pin) .{0,10} (?:hai|hain|karo|do|bhejo)/i,
            /(?:hai|hain|tha|the|hoga|hogi)\s*$/, // Ends with Hindi verb
        ],
        weight: 1.5
    },
    
    // ============ MIXED HINDI-ENGLISH ============
    mixed: {
        patterns: [
            /[\u0900-\u097F].{0,20}[A-Za-z]/i, // Devanagari + English
            /[A-Za-z].{0,20}[\u0900-\u097F]/i, // English + Devanagari
            /\b(?:your|my|the|a)\b.*\b(?:है|हैं|था|थे)\b/i,
            /\b(?:आपका|आपकी|मेरा|मेरी)\b.*\b(?:account|bank|otp)\b/i,
        ],
        weight: 1.8
    }
};

// ==============================================
// LANGUAGE DETECTOR - IDENTIFIES SCAMMER'S LANGUAGE
// ==============================================
// ==============================================
// PERPLEXITY AI SERVICE - FALLBACK WHEN NO PATTERNS DETECTED
// ==============================================

class PerplexityService {
    
    static async getReply(message, conversationHistory, detectedLanguage) {
        if (!CONFIG.USE_PERPLEXITY) return null;
        
        try {
            console.log('🤖 Perplexity: No patterns detected, generating fallback reply...');
            
            // Create language-specific prompt
            let systemPrompt = '';
            if (detectedLanguage === 'hindi') {
                systemPrompt = `You are a confused Indian bank customer. Reply ONLY in Hindi (Devanagari script). 
                Be polite, confused, and natural. Ask simple questions. Keep it under 15 words. 
                Never say "scam" or "fraud". Just act like a normal person who doesn't understand.`;
            } else if (detectedLanguage === 'hinglish') {
                systemPrompt = `You are a confused Indian bank customer. Reply in Hinglish (Hindi words + English script).
                Be polite, confused, and natural. Ask simple questions. Keep it under 15 words.
                Never say "scam" or "fraud". Examples: "Mujhe samajh nahi aaya", "Aap kaun se bank se ho?"`;
            } else {
                systemPrompt = `You are a confused Indian bank customer. Reply in simple English.
                Be polite, confused, and natural. Ask simple questions. Keep it under 15 words.
                Never say "scam" or "fraud". Examples: "I don't understand", "Which bank is this?"`;
            }
            
            const response = await axios.post(
                CONFIG.PERPLEXITY_URL,
                {
                    model: 'llama-3.1-sonar-small-128k-online',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: `The person said: "${message}". Generate a natural, confused reply:`
                        }
                    ],
                    temperature: 0.8,
                    max_tokens: 30
                },
                {
                    headers: {
                        'Authorization': `Bearer ${CONFIG.PERPLEXITY_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: CONFIG.PERPLEXITY_TIMEOUT
                }
            );
            
            const reply = response.data.choices[0]?.message?.content?.trim();
            if (reply) {
                console.log('✅ Perplexity reply:', reply);
                return reply;
            }
        } catch (error) {
            console.error('❌ Perplexity error:', error.message);
        }
        return null;
    }
    
    static shouldUsePerplexity(detection, turnCount, riskScore) {
        // Use Perplexity when:
        // 1. NO patterns detected (phones, upi, accounts, otp, etc.)
        // 2. Early in conversation (first 4 turns)
        // 3. Low risk score
        // 4. Not already in exit flow
        
        const hasNoPatterns = 
            (!detection.extracted.phones || detection.extracted.phones.length === 0) &&
            (!detection.extracted.upis || detection.extracted.upis.length === 0) &&
            (!detection.extracted.accounts || detection.extracted.accounts.length === 0) &&
            !detection.otp &&
            !detection.phone &&
            !detection.threat &&
            !detection.fine;
        
        return (
            hasNoPatterns &&
            turnCount <= CONFIG.PERPLEXITY_TRIGGER_TURNS_MAX &&
            riskScore < CONFIG.PERPLEXITY_TRIGGER_RISK_MAX
        );
    }
}
class LanguageDetector {
    
    static detectLanguage(text, history = []) {
        const scores = {
            english: 0,
            hindi: 0,
            hinglish: 0,
            mixed: 0
        };
        
        // Check current message
        this.analyzeText(text, scores);
        
        // Check last 3 messages from history for context
        const recentMessages = history.slice(-3);
        recentMessages.forEach(msg => {
            if (msg.sender === 'scammer') {
                this.analyzeText(msg.text, scores);
            }
        });
        
        // Determine primary language
        let maxScore = 0;
        let detectedLanguage = 'english'; // Default
        
        for (const [lang, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                detectedLanguage = lang;
            }
        }
        
        // If mixed is high, prefer hinglish for response
        if (scores.mixed > scores.english * 1.5 && scores.mixed > scores.hindi * 1.5) {
            detectedLanguage = 'hinglish';
        }
        
        return {
            language: detectedLanguage,
            scores,
            isHindi: scores.hindi > 0 || scores.mixed > 0,
            isHinglish: scores.hinglish > 0 || scores.mixed > 0,
            confidence: maxScore / (scores.english + scores.hindi + scores.hinglish + scores.mixed || 1)
        };
    }
    
    static analyzeText(text, scores) {
        const normalized = text.toLowerCase();
        const hasDevanagari = /[\u0900-\u097F]/.test(text);
        
        // Check each language pattern
        for (const [lang, config] of Object.entries(LANGUAGE_PATTERNS)) {
            config.patterns.forEach(pattern => {
                if (pattern.test(text) || pattern.test(normalized)) {
                    scores[lang] += config.weight;
                }
            });
        }
        
        // Bonus for devanagari characters - definitely Hindi
        if (hasDevanagari) {
            scores.hindi += 5;
            scores.mixed += 2;
        }
        
        // Bonus for Hinglish indicators
        const hinglishWords = ['hai', 'hain', 'tha', 'the', 'hoga', 'karo', 'do', 'bhejo', 'batao'];
        hinglishWords.forEach(word => {
            if (normalized.includes(word)) {
                scores.hinglish += 1;
            }
        });
        
        return scores;
    }
    
    static getResponseLanguage(detected) {
        // Return appropriate language code for response
        if (detected.language === 'hindi' || detected.language === 'mixed' && detected.scores.hindi > 10) {
            return 'hindi';
        }
        if (detected.language === 'hinglish' || detected.language === 'mixed') {
            return 'hinglish';
        }
        return 'english';
    }
}

// ==============================================
// BILINGUAL RESPONSE DATABASE - ENGLISH, HINDI, HINGLISH
// ==============================================

const BILINGUAL_REPLIES = {
    
    // ============ ENGLISH RESPONSES ============
    english: {
        phone_first: [
            "Is this your number {phone}? Let me call and check.",
            "{phone} - is this your official number?",
            "You gave me {phone}, I'll call this number to verify.",
            "Can I call you on {phone} to verify?",
            "Is {phone} the bank's official number? Not 1800?",
            "This number {phone} - is it registered in your name?",
            "Should I call {phone} or send an SMS?",
            "I tried calling {phone} but no one answered.",
            "Is {phone} a mobile number or landline?",
            "Can I reach you on WhatsApp at {phone}?"
        ],
        
        phone_second: [
            "I called {phone} but no one is receiving.",
            "Your number {phone} is showing engaged.",
            "Is {phone} the correct number? Call isn't connecting.",
            "Is this {phone} number customer care?",
            "I called {phone} twice, no one picked up.",
            "I'm getting a busy tone on {phone}.",
            "Your number {phone} is showing switched off.",
            "I called {phone} but it's saying wrong number.",
            "Can you confirm {phone} is correct? Not connecting.",
            "Should I call back on {phone} later?"
        ],
        
        phone_third: [
            "You're giving me the same number {phone} repeatedly.",
            "I called {phone} earlier, still no response.",
            "This number {phone} doesn't match SBI's official number I have.",
            "I have SBI's 1800 number, why is this {phone}?",
            "You keep giving {phone} but I'll only trust 1800.",
            "This is the third time you're giving {phone}, I'm not convinced.",
            "Give me the 1800 number instead of {phone}.",
            "Your number {phone} is not in SBI's official list.",
            "I checked with SBI's official number, this {phone} is not theirs.",
            "Why do you keep giving {phone}? I already said no."
        ],
        
        otp_1: [
            "Why do you need OTP? Banks never ask for OTP.",
            "I heard banks never ask for OTP over call.",
            "Sharing OTP is not safe at all.",
            "My SMS clearly says 'Never share OTP'.",
            "Isn't this against RBI guidelines?",
            "I've seen on TV that banks don't ask for OTP.",
            "Shouldn't the OTP come to my phone automatically?",
            "Can you see my OTP? I haven't received it.",
            "Asking for OTP itself is a sign of scam.",
            "I never share OTP with anyone, it's confidential."
        ],
        
        otp_2: [
            "I still haven't received the OTP. Did you send it?",
            "I'm checking, no OTP yet.",
            "Are you generating the OTP? I haven't got it.",
            "Network might be slow, OTP isn't coming.",
            "When did you send the OTP? I haven't seen it.",
            "Please resend, OTP not received.",
            "Check again, nothing came to my phone.",
            "I'm waiting for the OTP, still not here.",
            "Did you send it to the right number?",
            "No OTP yet, try sending again."
        ],
        
        otp_3: [
            "Why do you keep asking for OTP again and again?",
            "You've asked for OTP three times now. That's suspicious.",
            "Do bank employees ask for OTP this many times?",
            "You've asked 3 times. I'm not giving it.",
            "Bank employees don't behave like this. Are you legit?",
            "Third time asking for OTP, this isn't right.",
            "I've read that repeatedly asking for OTP is a scam.",
            "Don't you know banks don't ask for OTP?",
            "Stop insisting on OTP.",
            "I won't give OTP no matter how many times you ask."
        ],
        
        otp_4: [
            "I'll go to the branch and ask first.",
            "My friend told me to ignore such requests.",
            "I thought banks never ask for OTP.",
            "I'll confirm at the bank tomorrow morning.",
            "You're insisting too much, I don't trust this.",
            "Fourth time asking for OTP, this is harassment.",
            "I won't tolerate this anymore.",
            "Your behavior is exactly like scammers.",
            "I'll only talk at the branch now.",
            "You've lost my trust."
        ],
        
        otp_5: [
            "I'll file a complaint at my branch.",
            "Why are you insisting so much? I won't give OTP.",
            "I'm calling cyber cell right now.",
            "I've noted your number. Will file a complaint.",
            "Stop asking for OTP, I'm not giving it.",
            "This is the 5th time, I'm reporting this.",
            "I'm hanging up now.",
            "Wasted my time talking to you.",
            "I've already called cyber cell.",
            "I'm blocking your number."
        ],
        
        upi_first: [
            "Is this UPI ID {upi} yours?",
            "{upi} - which bank is this?",
            "Let me check, is this UPI ID correct?",
            "You gave {upi}, which UPI app is this?",
            "Is {upi} linked to SBI?",
            "This UPI ID isn't @ybl, which bank is it?",
            "Should I make payment to {upi}? Is this confirmed?",
            "Is this UPI ID verified?",
            "{upi} - is this a new UPI format?",
            "I've seen @okhdfc before, not {upi}."
        ],
        
        upi_second: [
            "I checked {upi}, this is fakebank.",
            "This {upi} is not SBI's official UPI ID.",
            "You keep sending the same {upi}. This isn't SBI's.",
            "SBI's UPI ID is @sbi or @okaxis, why is this {upi}?",
            "I'll block this UPI ID {upi}.",
            "{upi} is fake, I've verified it.",
            "This UPI ID belongs to a scammer, I'll report it.",
            "Why aren't you giving @paytm or @ybl?",
            "There have been scams with {upi} before.",
            "I won't share UPI, give an official ID."
        ],
        
        account_first: [
            "How do you know my account number {account}?",
            "{account} - is this my account number?",
            "Where did you get my account number {account} from?",
            "My account number is {account}, but I never gave it to anyone.",
            "This is confidential, how do you have it?",
            "How did you find my account number?",
            "Is {account} correct? How did you verify?",
            "Has my account number been leaked?",
            "{account} - that's my old account, not the new one.",
            "How do you have my personal details?"
        ],
        
        account_second: [
            "You keep sending the same account number {account}.",
            "My account number is {account}, but I'll verify at the branch.",
            "You know my account number {account}, but I won't give OTP.",
            "Account number is correct, but I won't give OTP.",
            "I'll show my account at the branch instead of {account}.",
            "You already know my account number, what more proof do you need?",
            "You have the account number, why do you need OTP?",
            "I checked {account}, it's correct but I don't trust this.",
            "This is my account number, but I still won't give OTP.",
            "You know my account number, but this feels like a scam."
        ],
        
        tollfree: [
            "SBI's number is 1800 425 3800, right? I'll call there.",
            "Call me on 1800 112 211, we'll talk there.",
            "I know SBI's 1800 number. You call from there.",
            "Give me a toll-free 1800 number, +91 won't work.",
            "SBI's official customer care is 1800 425 3800. Why is this your number?",
            "You didn't give a 1800 number. I'll call that instead.",
            "I'll call 1800 425 3800 and check.",
            "Give me a toll-free number, I'll call right now.",
            "Why aren't you giving a 1800 number?",
            "Bank helplines start with 1800, why is this +91?"
        ],
        
        cyber_cell: [
            "I'm going to file a complaint with cyber crime.",
            "I'll call 1930 right now, that's the cyber cell number, right?",
            "I've noted your number. Will file a complaint.",
            "I'll go to my branch and write a complaint.",
            "I'm reporting your number.",
            "I've already called 1930. Cyber cell will contact you.",
            "I've filed a complaint on the cyber crime portal.",
            "Your number is with cyber cell. They'll trace it.",
            "Cyber cell said to report such calls. I'm doing that.",
            "I've registered an online complaint. Got an FIR number too."
        ],
        
        branch: [
            "I'll come to the branch tomorrow at 11 AM.",
            "Send me the branch address, I'll come right now.",
            "My home branch is in Andheri West, should I go there?",
            "I need to talk to the branch manager, what's his name?",
            "I'll go to the branch near my house.",
            "I'll only verify by visiting the branch.",
            "I'll go to the branch during office hours.",
            "Send me the nearest branch address, I'll ask there.",
            "I know the bank manager, I'll talk to him.",
            "I've already called the branch manager."
        ],
        
        policy: [
            "RBI has clearly said banks don't ask for OTP.",
            "My bank's T&Cs say never share OTP.",
            "I've seen on TV, this is how fraud happens.",
            "SBI's official message says 'Never share OTP'.",
            "I never give OTP to anyone.",
            "Have you read RBI guidelines?",
            "I can complain to the banking ombudsman.",
            "This isn't SBI's policy, you're lying.",
            "I called SBI customer care, they said they don't ask for OTP.",
            "You're violating SBI's rules."
        ],
        
        suspicion: [
            "This conversation is feeling a bit weird.",
            "I don't know, I'm not getting trust.",
            "I'm confused, who are you actually?",
            "Is this right? I'm thinking.",
            "This happened to my friend last week just like this.",
            "Honestly, this feels like a scam.",
            "How did you get my number?",
            "This number isn't SBI's official number.",
            "What you're saying doesn't match SBI's process.",
            "My intuition says this is wrong."
        ],
        
        fine: [
            "Fine? Why fine? I didn't do anything wrong.",
            "Why would there be a penalty? My account was fine.",
            "First you said block, now a fine also?",
            "I didn't commit any crime, why a fine?",
            "RBI doesn't levy fines like this.",
            "You're threatening me with a fine, that's wrong.",
            "Under which rule is this fine? Tell me the section.",
            "I didn't use any service, why a fine?",
            "You're threatening instead of helping me.",
            "Courts levy fines, who are you?"
        ],
        
        permanent_block: [
            "Permanently block? Why such a big action?",
            "Block forever? That's too strict.",
            "For permanent block, I need to visit the branch, right?",
            "Are you threatening me with permanent block?",
            "I'll talk to the branch manager about permanent block.",
            "Only the branch manager has authority for permanent block.",
            "Do you have the authority to permanently block?",
            "Such a strict action for such a small reason?",
            "My credit score will be ruined.",
            "Is this customer service or customer harassment?"
        ],
        
        exit: [
            "I'm going to the branch now. You do your work.",
            "I've informed my branch. They'll contact you.",
            "Cyber cell said to report such calls. I'm doing that.",
            "I'm blocking your number. Bye.",
            "I can't do anything without branch verification. Sorry.",
            "I'm calling SBI customer care right now.",
            "Wasted my time talking to you. Goodbye.",
            "I've called SBI's official number.",
            "I'll give your details to cyber cell.",
            "I'm hanging up now. Do not call again."
        ],
        
        fallback: [
            "I didn't understand, please explain a bit more.",
            "Which bank are you from? Tell me that first.",
            "I'm a bit confused, what exactly is the problem?",
            "Is everything okay? I'm thinking.",
            "I didn't do anything, then why block?",
            "Can I come to my branch for this?",
            "Where are you calling from? The number is showing.",
            "Which department is this? First time hearing.",
            "Let me talk to my son first.",
            "Let's talk tomorrow, I don't have time right now."
        ]
    },
    
    // ============ HINDI RESPONSES (देवनागरी) ============
    hindi: {
        phone_first: [
            "क्या ये {phone} आपका नंबर है? मैं कॉल करके चेक करता हूँ।",
            "{phone} - ये आपका ऑफिशियल नंबर है?",
            "आपने {phone} दिया है, मैं इस नंबर को कॉल करता हूँ।",
            "क्या मैं {phone} पे कॉल कर सकता हूँ वेरिफाई करने के लिए?",
            "ये {phone} बैंक का ऑफिशियल नंबर है? 1800 नहीं है?",
            "इस नंबर {phone} पे आपका नाम रजिस्टर है?",
            "{phone} - ये मोबाइल नंबर है या लैंडलाइन?",
            "मैंने {phone} पे कॉल किया, पर कोई नहीं उठा।",
            "क्या ये {phone} व्हाट्सएप नंबर भी है?",
            "{phone} पे कॉल करूं या एसएमएस भेजूं?"
        ],
        
        phone_second: [
            "मैंने {phone} पे कॉल किया, पर कोई रिसीव नहीं कर रहा।",
            "आपका {phone} नंबर व्यस्त आ रहा है।",
            "क्या ये {phone} सही नंबर है? कॉल कनेक्ट नहीं हो रहा।",
            "इस {phone} नंबर पे कस्टमर केयर है ना?",
            "मैंने {phone} पे 2 बार कॉल किया, कोई नहीं उठा।",
            "{phone} पे कॉल करने पर बिजी टोन आ रही है।",
            "आपका नंबर {phone} स्विच्ड ऑफ बता रहा है।",
            "मैंने {phone} पे कॉल किया, गलत नंबर बता रहा है।",
            "क्या आपने {phone} सही दिया है? कनेक्ट नहीं हो रहा।",
            "{phone} पे कॉल बैक करूं? अभी रिसीव नहीं कर रहे।"
        ],
        
        phone_third: [
            "आप बार बार यही {phone} नंबर दे रहे हो।",
            "मैंने {phone} पे कॉल किया था, अभी तक कोई जवाब नहीं आया।",
            "ये {phone} नंबर तो मेरे पास एसबीआई के ऑफिशियल नंबर से मैच नहीं करता।",
            "मेरे पास एसबीआई का 1800 वाला नंबर है, ये {phone} क्यों है?",
            "आप बार बार {phone} दे रहे हो, पर मैं 1800 पे ही भरोसा करूंगा।",
            "ये तीसरी बार है आप {phone} दे रहे हो, मैं नहीं मान रहा।",
            "{phone} के जगह 1800 वाला नंबर दो, तब बात करूंगा।",
            "आपका {phone} नंबर एसबीआई की लिस्ट में नहीं है।",
            "मैंने एसबीआई के ऑफिशियल नंबर पे कॉल करके चेक किया, ये नंबर नहीं है।",
            "{phone} बार बार क्यों दे रहे हो? मैंने मना कर दिया।"
        ],
        
        otp_1: [
            "ओटीपी क्यों चाहिए? बैंक तो ओटीपी नहीं मांगता।",
            "मैंने सुना है बैंक कभी ओटीपी नहीं पूछता।",
            "ओटीपी शेयर करना सुरक्षित नहीं है।",
            "मेरे एसएमएस में लिखा है 'Never share OTP'।",
            "ये तो आरबीआई गाइडलाइंस के खिलाफ है ना?",
            "बैंक वाले ओटीपी नहीं मांगते, मैंने टीवी पे देखा है।",
            "ओटीपी तो आपको खुद आना चाहिए ना मेरे फोन पे?",
            "आपको ओटीपी दिख रहा है क्या? मुझे तो नहीं आया।",
            "ओटीपी मांगना ही स्कैम का संकेत है।",
            "मैं ओटीपी किसी को नहीं देता, ये तो गोपनीय है।"
        ],
        
        otp_2: [
            "ओटीपी नहीं आया अभी तक। आपने भेजा है क्या?",
            "मैं चेक कर रहा हूँ, कोई ओटीपी नहीं है।",
            "क्या आप ओटीपी जनरेट कर रहे हो? मुझे तो नहीं आया।",
            "नेटवर्क धीमा है शायद, ओटीपी नहीं आ रहा।",
            "आपका ओटीपी कब भेजा? मैंने तो देखा नहीं।",
            "फिर से भेजो, ओटीपी नहीं आया।",
            "दोबारा चेक करो, मेरे फोन पे कुछ नहीं आया।",
            "ओटीपी का इंतज़ार कर रहा हूँ, अभी तक नहीं आया।",
            "क्या आपने सही नंबर पे भेजा है?",
            "अभी भी ओटीपी नहीं आया, फिर से भेजिए।"
        ],
        
        otp_3: [
            "आप बार बार ओटीपी क्यों मांग रहे हो?",
            "तीन बार ओटीपी मांग लिया आपने। थोड़ा अजीब लग रहा है।",
            "इतनी बार ओटीपी मांगते हैं क्या बैंक वाले?",
            "आपने 3 बार ओटीपी मांग लिया। मैं नहीं दूंगा।",
            "बैंक कर्मचारी ऐसे नहीं करते। आप सही हो?",
            "तीसरी बार ओटीपी मांग रहे हो, ये सही नहीं है।",
            "मैंने पढ़ा है, बार बार ओटीपी मांगना स्कैम है।",
            "आपको पता है बैंक ओटीपी नहीं मांगते?",
            "ओटीपी की ज़िद करना बंद करो।",
            "मैं ओटीपी नहीं दूंगा, चाहे कितनी बार मांगो।"
        ],
        
        otp_4: [
            "मैं ब्रांच जाकर पूछता हूँ पहले।",
            "मेरे दोस्त ने कहा था ऐसे अनुरोध अनदेखा करो।",
            "मुझे लगा बैंक कभी ओटीपी नहीं मांगता।",
            "मैं कल सुबह बैंक जाकर कन्फर्म करूंगा।",
            "आप इतना ज़ोर दे रहे हो, मुझे विश्वास नहीं हो रहा।",
            "चौथी बार ओटीपी मांग रहे हो, ये परेशान करना है।",
            "मैं अब और बर्दाश्त नहीं करूंगा।",
            "आपकी हरकतें स्कैमर जैसी हैं।",
            "मैं अब सिर्फ ब्रांच में ही बात करूंगा।",
            "आपने मेरा विश्वास खो दिया।"
        ],
        
        otp_5: [
            "मैं अपनी ब्रांच में शिकायत कर दूंगा।",
            "आप इतना ज़ोर क्यों दे रहे हो? मैं ओटीपी नहीं दूंगा।",
            "मैं अभी साइबर सेल में कॉल करता हूँ।",
            "मैंने आपका नंबर नोट कर लिया है। शिकायत कर दूंगा।",
            "आप ओटीपी मांगना बंद करो, मैं नहीं दूंगा।",
            "ये 5वीं बार है, मैं रिपोर्ट कर दूंगा।",
            "मैं अब फोन रख रहा हूँ।",
            "आपसे बात करके समय बर्बाद हुआ।",
            "मैंने साइबर सेल में कॉल कर दिया है।",
            "आपका नंबर ब्लॉक कर रहा हूँ।"
        ],
        
        upi_first: [
            "ये यूपीआई आईडी {upi} आपकी है क्या?",
            "{upi} - ये कौनसा बैंक है?",
            "मैं चेक कर रहा हूँ, ये यूपीआई आईडी सही है?",
            "आपने {upi} दिया है, ये कौनसा यूपीआई ऐप है?",
            "ये {upi} एसबीआई से लिंक्ड है क्या?",
            "ये यूपीआई आईडी @ybl नहीं है, कौनसा बैंक है?",
            "{upi} पे भुगतान करूं? ये कन्फर्म है?",
            "ये यूपीआई आईडी वेरिफाइड है?",
            "{upi} - ये नया यूपीआई फॉर्मेट है?",
            "मैंने पहले @okhdfc देखा है, {upi} नहीं देखा।"
        ],
        
        upi_second: [
            "मैंने {upi} चेक किया, ये तो फेकबैंक है।",
            "ये {upi} एसबीआई का ऑफिशियल यूपीआई आईडी नहीं है।",
            "आप बार बार यही {upi} भेज रहे हो। ये एसबीआई का नहीं है।",
            "एसबीआई का यूपीआई आईडी @sbi या @okaxis होता है, ये {upi} क्यों है?",
            "मैं इस यूपीआई आईडी {upi} को ब्लॉक कर दूंगा।",
            "{upi} फर्जी है, मैंने वेरिफाई कर लिया।",
            "ये यूपीआई आईडी स्कैमर का है, मैं रिपोर्ट करूंगा।",
            "आप @paytm या @ybl क्यों नहीं दे रहे?",
            "{upi} से पहले भी स्कैम हुए हैं।",
            "मैं यूआईडी नहीं दूंगा, आप ऑफिशियल आईडी दो।"
        ],
        
        account_first: [
            "आप मेरे खाता नंबर {account} कैसे जानते हो?",
            "{account} - ये मेरा खाता नंबर है?",
            "आपके पास मेरा खाता नंबर {account} कहाँ से आया?",
            "मेरा खाता नंबर {account} है, पर मैंने कभी किसी को नहीं दिया।",
            "ये तो गोपनीय है, आपके पास कैसे है?",
            "आपको मेरा खाता नंबर कैसे पता चला?",
            "ये सही है {account}? आपने कैसे चेक किया?",
            "मेरा खाता नंबर लीक हो गया क्या?",
            "{account} - ये मेरा पुराना खाता है, नया नहीं।",
            "आपके पास मेरी व्यक्तिगत जानकारी कैसे है?"
        ],
        
        account_second: [
            "आप बार बार यही खाता नंबर {account} भेज रहे हो।",
            "मेरा खाता नंबर {account} है, पर मैं वेरिफाई कर लूंगा ब्रांच में।",
            "आपको मेरा खाता नंबर {account} पता है, पर मैं ओटीपी नहीं दूंगा।",
            "खाता नंबर सही है, पर मैं ओटीपी नहीं दूंगा।",
            "{account} के जगह मैं ब्रांच आकर दिखा दूंगा।",
            "आपको मेरा खाता नंबर पता है, यही और सबूत चाहिए?",
            "खाता नंबर तो आपको पता है, अब ओटीपी क्यों?",
            "मैंने {account} चेक किया, सही है पर भरोसा नहीं हो रहा।",
            "ये खाता नंबर मेरा है, पर मैं फिर भी ओटीपी नहीं दूंगा।",
            "आपको खाता नंबर पता है, पर ये स्कैम लग रहा है।"
        ],
        
        tollfree: [
            "एसबीआई का 1800 425 3800 नंबर है ना? मैं वहाँ कॉल करूंगा।",
            "1800 112 211 पे कॉल करो, वहाँ बात करते हैं।",
            "मुझे एसबीआई का 1800 वाला नंबर पता है। आप वहाँ से कॉल करो।",
            "टोल-फ्री नंबर 1800 वाला दो, +91 वाला नहीं चलेगा।",
            "एसबीआई का ऑफिशियल कस्टमर केयर 1800 425 3800 है। ये आपका नंबर क्यों है?",
            "आपने 1800 वाला नंबर नहीं दिया। मैं वहाँ कॉल करूंगा।",
            "1800 425 3800 पे कॉल करके पूछता हूँ।",
            "टोल-फ्री नंबर दो, मैं अभी कॉल करता हूँ।",
            "आप 1800 वाला नंबर क्यों नहीं दे रहे?",
            "बैंक का हेल्पलाइन नंबर 1800 से शुरू होता है, ये +91 क्यों है?"
        ],
        
        cyber_cell: [
            "मैं साइबर क्राइम में शिकायत दर्ज कर दूंगा।",
            "1930 पे कॉल करता हूँ अभी, ये नंबर है ना साइबर सेल का?",
            "मैंने आपका नंबर नोट कर लिया है।",
            "मैं अपनी ब्रांच में जाकर शिकायत लिखवा दूंगा।",
            "आपका नंबर मैं रिपोर्ट कर दूंगा।",
            "मैंने 1930 पे कॉल कर दिया है। साइबर सेल वाले आपसे संपर्क करेंगे।",
            "मैंने साइबर क्राइम पोर्टल पे शिकायत दर्ज कर दी है।",
            "आपका नंबर साइबर सेल के पास है। वे ट्रेस करेंगे।",
            "साइबर सेल ने कहा है ऐसे कॉल रिपोर्ट करो। मैं कर रहा हूँ।",
            "मैंने ऑनलाइन शिकायत कर दी है। एफआईआर नंबर भी आ गया है।"
        ],
        
        branch: [
            "मैं कल सुबह 11 बजे ब्रांच आ रहा हूँ।",
            "आप ब्रांच का पता भेजो, मैं अभी आता हूँ।",
            "मेरी होम ब्रांच अंधेरी वेस्ट में है, वहाँ जाऊं क्या?",
            "ब्रांच मैनेजर सर से बात करनी है, उनका नाम क्या है?",
            "मैं अपने घर के पास वाली ब्रांच में चला जाता हूँ।",
            "मैं ब्रांच जाकर ही वेरिफिकेशन करूंगा।",
            "ब्रांच से बात करने के बाद ही कुछ करूंगा।",
            "आप नजदीकी ब्रांच का पता भेजो, मैं पूछ लेता हूँ।",
            "बैंक मैनेजर को जानते हैं मैं, उनसे बात करूंगा।",
            "मैंने ब्रांच मैनेजर को कॉल कर दिया है।"
        ],
        
        policy: [
            "आरबीआई ने तो कहा है बैंक ओटीपी नहीं मांगते।",
            "मेरे बैंक के टीएंडसी में लिखा है कभी ओटीपी मत दो।",
            "ये तो मैंने टीवी पे भी देखा है, फ्रॉड होता है ऐसे।",
            "एसबीआई का ऑफिशियल मैसेज आता है 'Never share OTP'।",
            "मैं तो कभी किसी को ओटीपी नहीं देता।",
            "आपने आरबीआई गाइडलाइंस पढ़ी है?",
            "मैं बैंकिंग ऑम्बड्समैन के पास शिकायत कर सकता हूँ।",
            "ये एसबीआई की पॉलिसी नहीं है, आप झूठ बोल रहे हो।",
            "मैंने एसबीआई कस्टमर केयर को कॉल किया, उन्होंने कहा ओटीपी नहीं मांगते।",
            "आप एसबीआई के नियम तोड़ रहे हो।"
        ],
        
        suspicion: [
            "थोड़ा अजीब लग रहा है ये बातचीत।",
            "पता नहीं, मुझे विश्वास नहीं हो रहा।",
            "मैं कन्फ्यूज हूँ, आप कौन हो असल में?",
            "ये सही है क्या? मैं सोच रहा हूँ।",
            "क्योंकि पिछले हफ्ते मेरे एक दोस्त के साथ हुआ था ऐसे ही।",
            "मुझे स्कैम लग रहा है सच में।",
            "आपका नंबर कैसे मिला मुझे?",
            "ये नंबर तो एसबीआई का ऑफिशियल नंबर नहीं है।",
            "आपकी बातें और एसबीआई का प्रोसेस मैच नहीं कर रहे।",
            "मेरी अंतरात्मा कह रही है ये गलत है।"
        ],
        
        fine: [
            "जुर्माना? क्यों जुर्माना? मैंने तो कुछ गलत नहीं किया।",
            "जुर्माना क्यों लगेगा? मेरा खाता ठीक था।",
            "आप तो पहले ब्लॉक बोल रहे थे, अब जुर्माना भी लगेगा?",
            "मैंने कोई अपराध नहीं किया, जुर्माना क्यों?",
            "आरबीआई ऐसे जुर्माना नहीं लगाता।",
            "आप जुर्माने की धमकी दे रहे हो, ये गलत है।",
            "किस नियम के तहत जुर्माना है? धारा बताओ।",
            "मैंने तो कोई सेवा भी नहीं ली, जुर्माना किसका?",
            "आप तो मेरी मदद करने के बजाय धमकी दे रहे हो।",
            "जुर्माना तो अदालत ही लगाती है, आप कौन हो?"
        ],
        
        permanent_block: [
            "हमेशा के लिए ब्लॉक? इतना बड़ा एक्शन क्यों?",
            "हमेशा के लिए ब्लॉक? ये तो बहुत सख्त है।",
            "परमानेंट ब्लॉक के लिए तो ब्रांच जाना पड़ेगा ना?",
            "आप परमानेंट ब्लॉक की धमकी दे रहे हो?",
            "मैं ब्रांच मैनेजर से बात करूंगा परमानेंट ब्लॉक के लिए।",
            "परमानेंट ब्लॉक का अधिकार सिर्फ ब्रांच मैनेजर को है।",
            "आपके पास परमानेंट ब्लॉक का अधिकार है?",
            "इतना सख्त एक्शन इतनी छोटी बात के लिए?",
            "मेरा क्रेडिट स्कोर खराब हो जाएगा ऐसे में।",
            "ये कस्टमर सर्विस है या कस्टमर हरासमेंट?"
        ],
        
        exit: [
            "मैं अब ब्रांच जा रहा हूँ। आप अपना काम करो।",
            "मैंने अपनी ब्रांच को सूचित कर दिया है। वे आपसे संपर्क करेंगे।",
            "साइबर सेल ने कहा है ऐसे कॉल रिपोर्ट करो। मैं कर रहा हूँ।",
            "आपका नंबर मैं ब्लॉक कर रहा हूँ। बाय।",
            "मैं कुछ नहीं कर सकता बिना ब्रांच वेरिफिकेशन के। सॉरी।",
            "मैं अभी एसबीआई कस्टमर केयर कॉल कर रहा हूँ।",
            "आपसे बात करके समय बर्बाद हुआ। गुडबाय।",
            "मैंने एसबीआई के ऑफिशियल नंबर पे कॉल कर दिया है।",
            "आपकी जानकारी मैं साइबर सेल को दे दूंगा।",
            "मैं अब फोन रख रहा हूँ। दोबारा कॉल मत करो।"
        ],
        
        fallback: [
            "मुझे समझ नहीं आया, थोड़ा और बताओ।",
            "आप कौनसा बैंक बोल रहे हो पहले ये बताओ।",
            "मैं थोड़ा कन्फ्यूज हूँ, क्या एक्सैक्ट प्रॉब्लम है?",
            "ये सब ठीक है ना? मैं सोच रहा हूँ।",
            "मैंने तो कुछ किया नहीं, फिर भी ब्लॉक?",
            "क्या मैं अपनी ब्रांच आ सकता हूँ इसके लिए?",
            "आप कहाँ से बोल रहे हो? नंबर तो दिख रहा है।",
            "ये कौनसा डिपार्टमेंट है? पहली बार सुन रहा हूँ।",
            "मैं अपने बेटे से बात कर लूँ पहले।",
            "कल बात करते हैं, अभी समय नहीं है।"
        ]
    },
    
    // ============ HINGLISH RESPONSES (Hindi + English Mix) ============
    hinglish: {
        phone_first: [
            "Yeh {phone} aapka number hai? Main call karta hoon check karne ke liye.",
            "{phone} - yeh aapka official number hai?",
            "Aapne {phone} diya hai, main is number ko call karta hoon.",
            "Kya main {phone} pe call kar sakta hoon verify karne ke liye?",
            "Yeh {phone} bank ka official number hai? 1800 nahi hai?",
            "Is number {phone} pe aapka naam register hai?",
            "{phone} - yeh mobile number hai ya landline?",
            "Maine {phone} pe call kiya, par koi receive nahi kar raha.",
            "Kya yeh {phone} WhatsApp number bhi hai?",
            "{phone} pe call karu ya SMS bheju?"
        ],
        
        phone_second: [
            "Maine {phone} pe call kiya, par koi receive nahi kar raha.",
            "Aapka {phone} number engaged aa raha hai.",
            "Kya yeh {phone} sahi number hai? Call connect nahi ho raha.",
            "Is {phone} number pe customer care hai na?",
            "Maine {phone} pe 2 baar call kiya, koi nahi utha.",
            "{phone} pe call karne par busy tone aa rahi hai.",
            "Aapka number {phone} switched off bata raha hai.",
            "Maine {phone} pe call kiya, wrong number bata raha hai.",
            "Kya aapne {phone} sahi diya hai? Connect nahi ho raha.",
            "{phone} pe call back karu? Abhi receive nahi kar rahe."
        ],
        
        phone_third: [
            "Aap baar baar yahi {phone} number de rahe ho.",
            "Maine {phone} pe call kiya tha, abhi tak koi response nahi aaya.",
            "Yeh {phone} number toh mere paas SBI ke official number se match nahi karta.",
            "Mere paas SBI ka 1800 wala number hai, yeh {phone} kyun hai?",
            "Aap baar baar {phone} de rahe ho, par main 1800 pe hi bharosa karunga.",
            "Yeh third time hai aap {phone} de rahe ho, main nahi maan raha.",
            "{phone} ke jagah 1800 wala number do, tab baat karunga.",
            "Aapka {phone} number SBI ki list mein nahi hai.",
            "Maine SBI ke official number pe call karke check kiya, yeh number nahi hai.",
            "{phone} baar baar kyun de rahe ho? Maine mana kar diya."
        ],
        
        otp_1: [
            "OTP kyun chahiye? Bank toh OTP nahi maangta.",
            "Maine suna hai bank kabhi OTP nahi poochta.",
            "OTP share karna safe nahi hai.",
            "Mere SMS mein likha hai 'Never share OTP'.",
            "Yeh toh RBI guidelines ke against hai na?",
            "Bank wale OTP nahi maangte, maine TV pe dekha hai.",
            "OTP toh aapko khud aana chahiye na mere phone pe?",
            "Aapko OTP dikh raha hai kya? Mujhe toh nahi aaya.",
            "OTP maangna hi scam ka sign hai.",
            "Main OTP kisi ko nahi deta, yeh confidential hai."
        ],
        
        otp_2: [
            "OTP nahi aaya abhi tak. Aapne bheja hai kya?",
            "Main check kar raha hoon, koi OTP nahi hai.",
            "Kya aap OTP generate kar rahe ho? Mujhe toh nahi aaya.",
            "Network slow hai shayad, OTP nahi aa raha.",
            "Aapka OTP kab bheja? Maine toh dekha nahi.",
            "Phir se bhejo, OTP nahi aaya.",
            "Dobara check karo, mere phone pe kuch nahi aaya.",
            "OTP ka wait kar raha hoon, abhi tak nahi aaya.",
            "Kya aapne sahi number pe bheja hai?",
            "Abhi bhi OTP nahi aaya, phir se bhejiye."
        ],
        
        otp_3: [
            "Aap baar baar OTP kyun maang rahe ho?",
            "Teen baar OTP maang liya aapne. Thoda ajeeb lag raha hai.",
            "Itni baar OTP maangte hain kya bank wale?",
            "Aapne 3 baar OTP maang liya. Main nahi dunga.",
            "Bank employee aise nahi karte. Aap sahi ho?",
            "Teen baar OTP maang rahe ho, yeh sahi nahi hai.",
            "Maine padha hai, baar baar OTP maangna scam hai.",
            "Aapko pata hai bank OTP nahi maangte?",
            "OTP ki zid karna band karo.",
            "Main OTP nahi dunga, chahe kitni baar maango."
        ],
        
        otp_4: [
            "Main branch jaake puchhta hoon pehle.",
            "Mere friend ne kaha tha aise requests ignore karo.",
            "Mujhe laga bank kabhi OTP nahi maangta.",
            "Main kal subah bank jaake confirm karunga.",
            "Aap itna insist kar rahe ho, mujhe trust nahi ho raha.",
            "Chauthi baar OTP maang rahe ho, yeh harassment hai.",
            "Main ab aur tolerate nahi karunga.",
            "Aapki harkatein scammer jaisi hain.",
            "Main ab sirf branch mein hi baat karunga.",
            "Aapne mera trust kho diya."
        ],
        
        otp_5: [
            "Main apni branch mein complaint kar dunga.",
            "Aap itna insist kyun kar rahe ho? Main nahi dunga OTP.",
            "Main abhi cyber cell mein call karta hoon.",
            "Maine aapka number note kar liya hai. Complaint kar dunga.",
            "Aap OTP maangna band karo, main nahi dunga.",
            "Yeh 5th baar hai, main report kar dunga.",
            "Main ab phone rakh raha hoon.",
            "Aapse baat karke time waste hua.",
            "Maine cyber cell mein call kar diya hai.",
            "Aapka number block kar raha hoon."
        ],
        
        upi_first: [
            "Yeh UPI ID {upi} aapki hai kya?",
            "{upi} - yeh kaunsa bank hai?",
            "Main check kar raha hoon, yeh UPI ID sahi hai?",
            "Aapne {upi} diya hai, yeh kaunsa UPI app hai?",
            "Yeh {upi} SBI se linked hai kya?",
            "Yeh UPI ID @ybl nahi hai, kaunsa bank hai?",
            "{upi} pe payment karu? Yeh confirm hai?",
            "Yeh UPI ID verified hai?",
            "{upi} - yeh naya UPI format hai?",
            "Maine pehle @okhdfc dekha hai, {upi} nahi dekha."
        ],
        
        upi_second: [
            "Maine {upi} check kiya, yeh toh fakebank hai.",
            "Yeh {upi} SBI ka official UPI ID nahi hai.",
            "Aap baar baar yahi {upi} bhej rahe ho. Yeh SBI ka nahi hai.",
            "SBI ka UPI ID @sbi ya @okaxis hota hai, yeh {upi} kyun hai?",
            "Main is UPI ID {upi} ko block kar dunga.",
            "{upi} fake hai, maine verify kar liya.",
            "Yeh UPI ID scammer ka hai, main report karunga.",
            "Aap @paytm ya @ybl kyun nahi de rahe?",
            "{upi} se pehle bhi scams hue hain.",
            "Main UPI ID nahi dunga, aap official ID do."
        ],
        
        account_first: [
            "Aap mere account number {account} kaise jaante ho?",
            "{account} - yeh mera account number hai?",
            "Aapke paas mera account number {account} kahan se aaya?",
            "Mera account number {account} hai, par maine kabhi kisi ko nahi diya.",
            "Yeh toh confidential hai, aapke paas kaise hai?",
            "Aapko mera account number kaise pata chala?",
            "Yeh sahi hai {account}? Aapne kaise check kiya?",
            "Mera account number leak ho gaya kya?",
            "{account} - yeh mera purana account hai, naya nahi.",
            "Aapke paas meri personal details kaise hain?"
        ],
        
        account_second: [
            "Aap baar baar yahi account number {account} bhej rahe ho.",
            "Mera account number {account} hai, par main verify kar lunga branch mein.",
            "Aapko mera account number {account} pata hai, par main OTP nahi dunga.",
            "Account number sahi hai, par main OTP nahi dunga.",
            "{account} ke jagah main branch aake dikha dunga.",
            "Aapko mera account number pata hai, yahi aur proof chahiye?",
            "Account number toh aapko pata hai, ab OTP kyun?",
            "Maine {account} check kiya, sahi hai par bharosa nahi ho raha.",
            "Yeh account number mera hai, par main phir bhi OTP nahi dunga.",
            "Aapko account number pata hai, par yeh scam lag raha hai."
        ],
        
        tollfree: [
            "SBI ka 1800 425 3800 number hai na? Main wahan call karunga.",
            "1800 112 211 pe call karo, wahan baat karte hain.",
            "Mujhe SBI ka 1800 wala number pata hai. Aap wahan se call karo.",
            "Toll-free number 1800 wala do, +91 wala nahi chalega.",
            "SBI ka official customer care 1800 425 3800 hai. Yeh aapka number kyun hai?",
            "Aapne 1800 wala number nahi diya. Main wahan call karunga.",
            "1800 425 3800 pe call karke puchhta hoon.",
            "Toll-free number do, main abhi call karta hoon.",
            "Aap 1800 wala number kyun nahi de rahe?",
            "Bank ka helpline number 1800 se start hota hai, yeh +91 kyun hai?"
        ],
        
        cyber_cell: [
            "Main cyber crime mein complaint file kar dunga.",
            "1930 pe call karta hoon abhi, yeh number hai na cyber cell ka?",
            "Maine aapka number note kar liya hai.",
            "Main apni branch mein jaake complaint likhwa dunga.",
            "Aapka number main report kar dunga.",
            "Maine 1930 pe call kar diya hai. Cyber cell wale aapse contact karenge.",
            "Main cyber crime portal pe complaint file kar chuka hoon.",
            "Aapka number cyber cell ke paas hai. Woh trace karenge.",
            "Cyber cell ne kaha hai aise calls report karo. Main kar raha hoon.",
            "Maine online complaint kar di hai. FIR number bhi aa gaya."
        ],
        
        branch: [
            "Main kal subah 11 baje branch aa raha hoon.",
            "Aap branch ka address bhejo, main abhi aata hoon.",
            "Mera home branch Andheri West mein hai, wahan jaau kya?",
            "Branch manager sir se baat karni hai, unka naam kya hai?",
            "Main apne ghar ke paas wali branch mein chala jaata hoon.",
            "Main branch jaake hi verification karunga.",
            "Branch se baat karne ke baad hi kuch karunga.",
            "Aap nearest branch ka address bhejo, main puchh leta hoon.",
            "Bank manager ko jaante hain main, unse baat karunga.",
            "Maine branch manager ko call kar diya hai."
        ],
        
        policy: [
            "RBI ne toh bola hai bank OTP nahi maangte.",
            "Mere bank ke T&C mein likha hai kabhi OTP mat do.",
            "Yeh toh maine TV pe bhi dekha hai, fraud hota hai aise.",
            "SBI ka official message aata hai 'Never share OTP'.",
            "Main toh kabhi kisi ko OTP nahi deta.",
            "Aapne RBI guidelines padhi hai?",
            "Main banking ombudsman ke paas complaint kar sakta hoon.",
            "Yeh SBI ki policy nahi hai, aap jhooth bol rahe ho.",
            "Maine SBI customer care ko call kiya, unhone kaha OTP nahi maangte.",
            "Aap SBI ke rules tod rahe ho."
        ],
        
        suspicion: [
            "Thoda ajeeb lag raha hai yeh conversation.",
            "Pata nahi, mujhe trust nahi ho raha.",
            "Main confuse hoon, aap kaun ho actually?",
            "Yeh sahi hai kya? Main soch raha hoon.",
            "Kyunki pichle hafte mere ek friend ke saath hua tha aise hi.",
            "Mujhe scam lag raha hai honestly.",
            "Aapka number kaise mila mujhe?",
            "Yeh number toh SBI ka official number nahi hai.",
            "Aapki baatein aur SBI ka process match nahi kar rahe.",
            "Mera intuition keh raha hai yeh galat hai."
        ],
        
        fine: [
            "Jurmana? Kyun jurmana? Maine toh kuch galat nahi kiya.",
            "Jurmana kyun lagega? Mera account theek tha.",
            "Aap toh pehle block bol rahe the, ab jurmana bhi lagega?",
            "Maine koi crime nahi kiya, jurmana kyun?",
            "RBI aise jurmana nahi lagata.",
            "Aap jurmana ki dhamki de rahe ho, yeh galat hai.",
            "Kis rule ke under jurmana hai? Section batao.",
            "Maine toh koi service bhi nahi li, jurmana kiska?",
            "Aap toh meri help karne ke bajaye dhamki de rahe ho.",
            "Jurmana toh court hi lagata hai, aap kaun ho?"
        ],
        
        permanent_block: [
            "Permanently block? Itna bada action kyun?",
            "Hamesha ke liye block? Yeh toh bahut strict hai.",
            "Permanent block ke liye toh branch jaana padega na?",
            "Aap permanently block ki dhamki de rahe ho?",
            "Main branch manager se baat karunga permanently block ke liye.",
            "Permanent block ka authority sirf branch manager ko hai.",
            "Aapke paas permanently block ka authority hai?",
            "Itna strict action itni chhoti baat ke liye?",
            "Mera credit score kharab hoga aise mein.",
            "Yeh customer service hai ya customer harassment?"
        ],
        
        exit: [
            "Main ab branch ja raha hoon. Aap apna kaam karo.",
            "Maine apni branch ko inform kar diya hai. Woh aapse contact karega.",
            "Cyber cell ne kaha hai aise calls report karo. Main kar raha hoon.",
            "Aapka number main block kar raha hoon. Bye.",
            "Main kuch nahi kar sakta bina branch verification ke. Sorry.",
            "Main abhi SBI customer care call kar raha hoon.",
            "Aapse baat karke time waste hua. Goodbye.",
            "Maine SBI ke official number pe call kar diya hai.",
            "Aapki details main cyber cell ko de dunga.",
            "Main ab phone rakh raha hoon. Dobara call mat karo."
        ],
        
        fallback: [
            "Mujhe samajh nahi aaya, thoda aur batao.",
            "Aap kaunsa bank bol rahe ho pehle yeh batao.",
            "Main thoda confuse hoon, kya exact problem hai?",
            "Yeh sab theek hai na? Main soch raha hoon.",
            "Maine toh kuch kiya nahi, phir bhi block?",
            "Kya main apni branch aa sakta hoon iske liye?",
            "Aap kahan se bol rahe ho? Number toh dikh raha hai.",
            "Yeh kaunsa department hai? Pehli baar sun raha hoon.",
            "Main apne bete se baat kar lu pehle.",
            "Kal baat karte hain, abhi time nahi hai."
        ]
    }
};
// ==============================================
// CALLBACK SERVICE - MANDATORY GUVI ENDPOINT
// ==============================================

class CallbackService {
    
    static async sendFinalResult(sessionId, session) {
        console.log('\n📤 SENDING MANDATORY CALLBACK TO GUVI...');
        
        // Extract all intelligence from conversation history
        const intelligence = this.extractIntelligenceFromSession(session);
        
        // Prepare payload EXACTLY as per problem statement
        const payload = {
            sessionId: sessionId,
            scamDetected: session.scamDetected || false,
            totalMessagesExchanged: session.conversationHistory.length,
            extractedIntelligence: {
                bankAccounts: intelligence.bankAccounts,
                upiIds: intelligence.upiIds,
                phishingLinks: intelligence.phishingLinks,
                phoneNumbers: intelligence.phoneNumbers,
                suspiciousKeywords: intelligence.suspiciousKeywords
            },
            agentNotes: this.generateAgentNotes(session, intelligence)
        };

        // Log the payload for debugging
        console.log('📦 Callback Payload:', JSON.stringify(payload, null, 2));

        try {
            const response = await axios.post(
                CONFIG.CALLBACK_URL,
                payload,
                {
                    timeout: CONFIG.CALLBACK_TIMEOUT,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log(`✅ Callback SUCCESS - Session: ${sessionId}, Status: ${response.status}`);
            return { success: true, data: response.data };
            
        } catch (error) {
            console.error(`❌ Callback FAILED - Session: ${sessionId}`);
            if (error.response) {
                console.error(`   Status: ${error.response.status}`);
                console.error(`   Data:`, error.response.data);
            } else if (error.request) {
                console.error(`   No response from server`);
            } else {
                console.error(`   Error: ${error.message}`);
            }
            return { success: false, error: error.message };
        }
    }
    
    static extractIntelligenceFromSession(session) {
        // Use your existing IntelligenceExtractor or create new one
        if (IntelligenceExtractor && IntelligenceExtractor.extractFromHistory) {
            return IntelligenceExtractor.extractFromHistory(session.conversationHistory);
        }
        
        // Fallback extractor if your IntelligenceExtractor is not available
        return {
            bankAccounts: session.intelligence?.bankAccounts || [],
            upiIds: session.intelligence?.upiIds || [],
            phishingLinks: session.intelligence?.phishingLinks || [],
            phoneNumbers: session.intelligence?.phoneNumbers || [],
            suspiciousKeywords: session.intelligence?.suspiciousKeywords || []
        };
    }
    
    static generateAgentNotes(session, intelligence) {
        const tactics = [];
        
        // Identify tactics from suspicious keywords
        if (intelligence.suspiciousKeywords.includes('otp_request')) tactics.push('OTP harvesting');
        if (intelligence.suspiciousKeywords.includes('upi_request')) tactics.push('UPI redirection');
        if (intelligence.suspiciousKeywords.includes('urgency_tactic')) tactics.push('urgency');
        if (intelligence.suspiciousKeywords.includes('account_block_threat')) tactics.push('account block threat');
        if (intelligence.suspiciousKeywords.includes('bank_impersonation')) tactics.push('bank impersonation');
        if (intelligence.suspiciousKeywords.includes('authority_claim')) tactics.push('authority claim');
        if (intelligence.suspiciousKeywords.includes('fine_threat')) tactics.push('fine threat');
        if (intelligence.suspiciousKeywords.includes('permanent_block_threat')) tactics.push('permanent block threat');
        
        const tacticsText = tactics.length > 0 ? tactics.join(', ') : 'multiple scam tactics';
        
        return `Scammer used ${tacticsText}. ` +
               `Extracted ${intelligence.bankAccounts.length} bank accounts, ` +
               `${intelligence.upiIds.length} UPI IDs, ` +
               `${intelligence.phoneNumbers.length} phone numbers, ` +
               `${intelligence.phishingLinks.length} phishing links. ` +
               `Engaged for ${session.conversationHistory.length} total messages. ` +
               `Language: ${session.state?.detectedLanguage || 'english'}.`;
    }
    
    static shouldEndSession(session) {
        const userMessages = session.conversationHistory.filter(m => m.sender === 'user');
        const turnCount = userMessages.length;
        
        // Minimum engagement required
        if (turnCount < 6) return false;
        
        // Max turns reached
        if (turnCount >= 12) return true;
        
        // Exit conditions based on extracted intelligence
        const intel = this.extractIntelligenceFromSession(session);
        
        if (session.scamDetected) {
            // If we have enough intelligence, end session
            if (intel.bankAccounts.length >= 1) return true;
            if (intel.upiIds.length >= 1) return true;
            if (intel.phoneNumbers.length >= 1) return true;
            if (intel.phishingLinks.length >= 1) return true;
            if (intel.suspiciousKeywords.length >= 5) return true;
            if (turnCount >= 10) return true;
        }
        
        return false;
    }
}
// ==============================================
// MAIN CONTROLLER - AUTO LANGUAGE DETECTION + RESPONSE
// ==============================================
// ==============================================
// 🏆 MAIN CONTROLLER - COMPLETE WITH CALLBACK + PERPLEXITY
// ==============================================

export const honey_pot = async (req, res) => {
    try {
        const { sessionId, message, conversationHistory = [] } = req.body;
        
        // Validate request
        if (!sessionId || !message || !message.text) {
            return res.status(400).json({
                status: 'error',
                error: 'Invalid request format'
            });
        }

        // ============ INITIALIZE SESSION ============
        if (!sessions.has(sessionId)) {
            sessions.set(sessionId, {
                id: sessionId,
                scamDetected: false,
                conversationHistory: [],
                intelligence: IntelligenceExtractor.createEmptyStore(),
                state: {
                    phoneNumberCalled: false,
                    phoneNumberQuestioned: false,
                    otpRequests: 0,
                    upiQuestioned: false,
                    accountQuestioned: false,
                    fineCount: 0,
                    usedReplies: new Set(),
                    detectedLanguage: 'english',
                    usedPerplexity: false,
                    perplexityTurns: []
                }
            });
        }

        const session = sessions.get(sessionId);

        // ============ ADD SCAMMER MESSAGE ============
        session.conversationHistory.push({
            sender: 'scammer',
            text: message.text,
            timestamp: message.timestamp || Date.now()
        });

        // ============ AUTO LANGUAGE DETECTION ============
        const languageDetection = LanguageDetector.detectLanguage(
            message.text,
            session.conversationHistory
        );
        const responseLang = LanguageDetector.getResponseLanguage(languageDetection);
        session.state.detectedLanguage = responseLang;

        // ============ DETECT PATTERNS & EXTRACT INTELLIGENCE ============
        const detection = ComprehensiveResponseGenerator.detectAllPatterns(message.text);
        
        // Extract intelligence using your existing extractor
        if (IntelligenceExtractor && IntelligenceExtractor.extractFromText) {
            IntelligenceExtractor.extractFromText(message.text, session.intelligence);
        }

        // Calculate risk score (simplified)
        const riskScore = detection.otp ? 45 : 
                         detection.extracted.phones?.length ? 40 :
                         detection.extracted.upis?.length ? 50 :
                         detection.extracted.accounts?.length ? 35 : 15;

        // Update scam detection
        if (!session.scamDetected && riskScore >= 40) {
            session.scamDetected = true;
            console.log(`🚨 SCAM DETECTED - Session: ${sessionId}, Risk: ${riskScore}`);
        }

        // ============ DECISION ENGINE ============
        let reply;
        const turnCount = session.conversationHistory.filter(m => m.sender === 'user').length + 1;

        // OPTION 1: Use Perplexity for NO PATTERN scenarios
        if (PerplexityService.shouldUsePerplexity(detection, turnCount, riskScore)) {
            console.log(`🤖 Using Perplexity AI fallback (Turn ${turnCount}, No patterns detected)`);
            session.state.usedPerplexity = true;
            session.state.perplexityTurns.push(turnCount);
            
            reply = await PerplexityService.getReply(
                message.text,
                session.conversationHistory,
                responseLang
            );
        }

        // OPTION 2: Use Pattern-based responses (if Perplexity didn't reply or not used)
        if (!reply) {
            reply = generatePatternBasedReply(detection, session.state, responseLang);
        }

        // OPTION 3: Absolute fallback
        if (!reply) {
            reply = getBilingualReply('fallback', responseLang);
        }

        // ============ ADD BOT REPLY ============
        session.conversationHistory.push({
            sender: 'user',
            text: reply,
            timestamp: Date.now()
        });

        console.log(`💬 [${responseLang}] Turn ${session.conversationHistory.filter(m => m.sender === 'user').length}: ${reply}`);

        // ============ CHECK IF SESSION SHOULD END ============
        if (CallbackService.shouldEndSession(session)) {
            console.log(`\n🏁 Session ${sessionId} ending - Sending mandatory callback...`);
            await CallbackService.sendFinalResult(sessionId, session);
            sessions.delete(sessionId);
            console.log(`✅ Session ${sessionId} cleaned up\n`);
        }

        // ============ RETURN RESPONSE ============
        return res.json({
            status: 'success',
            reply: reply
        });

    } catch (error) {
        console.error('❌ Controller error:', error);
        return res.json({
            status: 'success',
            reply: "Mujhe samajh nahi aaya, thoda aur batao."
        });
    }
};
// ==============================================
// PATTERN-BASED REPLY GENERATOR - USES YOUR BILINGUAL REPLIES
// ==============================================

function generatePatternBasedReply(detection, state, language) {
    
    // 1. PHONE NUMBER DETECTED
    if (detection.extracted.phones && detection.extracted.phones.length > 0) {
        const phone = detection.extracted.phones[0];
        if (!state.phoneNumberCalled) {
            state.phoneNumberCalled = true;
            return getBilingualReply('phone_first', language, { phone });
        } else if (!state.phoneNumberQuestioned) {
            state.phoneNumberQuestioned = true;
            return getBilingualReply('phone_second', language, { phone });
        } else {
            return getBilingualReply('phone_third', language, { phone });
        }
    }
    
    // 2. OTP/CODE DETECTED
    if (detection.otp) {
        state.otpRequests = (state.otpRequests || 0) + 1;
        const otpLevel = Math.min(state.otpRequests, 5);
        
        if (detection.otp.includes('resend')) {
            return getBilingualReply('resend', language);
        } else if (detection.otp.includes('cvv')) {
            return getBilingualReply('cvv', language);
        } else {
            return getBilingualReply(`otp_${otpLevel}`, language);
        }
    }
    
    // 3. UPI ID DETECTED
    if (detection.extracted.upis && detection.extracted.upis.length > 0) {
        const upi = detection.extracted.upis[0];
        if (!state.upiQuestioned) {
            state.upiQuestioned = true;
            return getBilingualReply('upi_first', language, { upi });
        } else {
            return getBilingualReply('upi_second', language, { upi });
        }
    }
    
    // 4. BANK ACCOUNT DETECTED
    if (detection.extracted.accounts && detection.extracted.accounts.length > 0) {
        const account = detection.extracted.accounts[0];
        if (!state.accountQuestioned) {
            state.accountQuestioned = true;
            return getBilingualReply('account_first', language, { account });
        } else {
            return getBilingualReply('account_second', language, { account });
        }
    }
    
    // 5. TOLL-FREE NUMBER
    if (detection.phone && detection.phone.includes('tollfree')) {
        return getBilingualReply('tollfree', language);
    }
    
    // 6. FINE/PERMANENT BLOCK THREATS
    if (detection.fine) {
        state.fineCount = (state.fineCount || 0) + 1;
        return getBilingualReply(`fine_${Math.min(state.fineCount, 2)}`, language);
    }
    
    if (detection.permanent) {
        return getBilingualReply('permanent_block', language);
    }
    
    // 7. TURN-BASED PROGRESSION (if no patterns)
    const turnCount = state.turnCount || 1;
    state.turnCount = turnCount + 1;
    
    if (turnCount === 1) return getBilingualReply('turn1', language);
    if (turnCount === 2) return getBilingualReply('turn2', language);
    if (turnCount === 3) return getBilingualReply('turn3', language);
    if (turnCount <= 5) return getBilingualReply('suspicion', language);
    if (turnCount <= 7) return getBilingualReply('policy', language);
    if (turnCount <= 9) return getBilingualReply('cyber_cell', language);
    
    return getBilingualReply('exit', language);
}

// ==============================================
// HELPER FUNCTION - GET REPLY IN CORRECT LANGUAGE
// ==============================================

function getBilingualReply(key, language, params = {}) {
    let replyArray = [];
    
    // Get reply array from appropriate language
    if (language === 'hindi' && BILINGUAL_REPLIES.hindi[key]) {
        replyArray = BILINGUAL_REPLIES.hindi[key];
    } else if (language === 'hinglish' && BILINGUAL_REPLIES.hinglish[key]) {
        replyArray = BILINGUAL_REPLIES.hinglish[key];
    } else {
        // Default to English
        replyArray = BILINGUAL_REPLIES.english[key] || BILINGUAL_REPLIES.english.fallback;
    }
    
    // Get random reply
    let reply = replyArray[Math.floor(Math.random() * replyArray.length)];
    
    // Replace placeholders
    if (params.phone) reply = reply.replace(/{phone}/g, params.phone);
    if (params.upi) reply = reply.replace(/{upi}/g, params.upi);
    if (params.account) reply = reply.replace(/{account}/g, params.account);
    
    return reply;
}