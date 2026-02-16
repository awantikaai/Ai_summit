
export const REPLIES = {

  turn1: [
    "Mera account block kyun ho raha hai? Maine koi unusual transaction nahi kiya.",
    "Aap kaunse bank se bol rahe ho exactly?",
    "Mujhe koi official notification nahi mila, aap detail mein bata sakte ho?",
    "Yeh issue kab start hua?",
    "Maine abhi tak kuch suspicious notice nahi kiya."
  ],
  
  turn2: [
    "Kaunsa transaction? Kitne amount ka tha aur kab hua?",
    "Transaction location kya hai? Online tha ya offline?",
    "Mujhe is transaction ke liye koi OTP nahi aaya tha.",
    "Kya aap transaction ID bata sakte ho?",
    "Mere passbook mein koi entry nahi dikh rahi."
  ],
  
  turn3: [
    "Aap kaunse department se ho? Fraud prevention ya customer care?",
    "Aapka employee ID kya hai? Main verify kar lunga.",
    "Kaunsi branch se call kar rahe ho? Branch code kya hai?",
    "Aapka naam aur designation bata sakte ho?",
    "Official bank domain se email bhej sakte ho?"
  ],
  
  // ============ PHASE 2: CURIOSITY & PROBING (Turns 4-5) ============
  // Asking for verification, extracting more data
  suspicion: [
    "Kuch toh gadbad lag raha hai. Aapne apna employee ID nahi bataya.",
    "Main branch ka naam puchha tha, aapne bataya nahi.",
    "Official number 1800 hota hai, aap +91 kyun use kar rahe ho?",
    "Mujhe laga bank kabhi phone pe OTP nahi maangta.",
    "Yeh process thoda unusual lag raha hai."
  ],
  
  policy: [
    "RBI guidelines ke according banks OTP nahi maangte.",
    "Mere bank ke T&C mein clearly likha hai - Never share OTP.",
    "SBI ka official message aata hai 'OTP confidential hai'.",
    "Main TV pe bhi dekha hai, aise hi fraud karte hain.",
    "Yeh basic banking security hai, aapko pata hona chahiye."
  ],
  
  // ============ PHASE 3: INTELLIGENCE EXTRACTION (Turns 6-8) ============
  // Strategic questioning to force scammer to reveal more data
  account_first: [
    "Aapko mera account number kaise pata chala?",
    "{account} – yeh data aapke paas kahan se aaya?",
    "Yeh account number confidential hota hai. Aapko kisne diya?",
    "Is account number ka source kya hai?",
    "Yeh information normally sirf bank ke paas hoti hai."
  ],
  
  account_second: [
    "Aap baar baar yahi account number bhej rahe ho, confirm kar rahe ho kya?",
    "Mera account number {account} hai, par maine kabhi share nahi kiya.",
    "Aapko account number pata hai, par main OTP nahi dunga.",
    "Account number sahi hai, par main verify kar lunga branch mein.",
    "Aapke paas account number hai, bas itna kaafi hai verification ke liye?"
  ],
  
  upi_first: [
    "Yeh UPI ID {upi} kis naam pe registered hai?",
    "{upi} – yeh personal ID hai ya official?",
    "Is UPI ID ka bank confirmation milega?",
    "Main check kar raha hoon, yeh verified lag nahi raha.",
    "Iska registered mobile number kya hai?"
  ],
  
  upi_second: [
    "Maine {upi} check kiya, yeh SBI ka official UPI ID nahi hai.",
    "Aap baar baar yahi UPI bhej rahe ho. Yeh SBI ka nahi hai.",
    "SBI ka UPI ID @sbi ya @okaxis hota hai, yeh {upi} kyun hai?",
    "Aap dobara UPI ID bhejo, main ek baar aur check karta hoon.",
    "{upi} verified nahi hai, iska koi alternate hai?"
  ],
  
  phone_first: [
    "Yeh number {phone} bank ke official website pe listed hai?",
    "Main is number ko verify kar leta hoon.",
    "{phone} – kya yeh recorded customer care line hai?",
    "Is number se official SMS kyun nahi aa raha?",
    "Kya yeh toll-free number hai?"
  ],
  
  phone_second: [
    "Maine {phone} pe call kiya, par koi nahi utha.",
    "Aapka {phone} number busy aa raha hai, koi aur number hai?",
    "Kya yeh {phone} sahi number hai? Call connect nahi ho raha.",
    "Is number ke alawa koi official helpline hai?",
    "Aap dobara number bhej do, shayad galat type ho gaya."
  ],
  
  phone_third: [
    "Aap baar baar yahi {phone} number de rahe ho.",
    "Yeh {phone} number SBI ke official number se match nahi karta.",
    "{phone} ke jagah 1800 wala number do na.",
    "Mujhe SBI ka 1800 number do, yeh nahi chalega.",
    "Aap baar baar yahi {phone} de rahe ho, par main 1800 pe hi bharosa karunga."
  ],
  
  authority: [
    "Aapka employee ID aur branch code kya hai?",
    "Main aapka ID internal system mein verify karna chahta hoon.",
    "Official bank domain se email bhej sakte ho?",
    "Aapka reporting manager ka naam kya hai?",
    "Kaunsi branch se call kar rahe ho aur branch manager ka naam?"
  ],
  
  // ============ PHASE 4: FAKE COOPERATION & DELAY TACTICS (Turns 9-11) ============
  // Pretend to cooperate, make scammer reveal more
  otp_1: [
    "OTP normally confidential hota hai, aap kyun maang rahe ho?",
    "Bank usually OTP phone pe nahi maangta.",
    "Kya is process ke liye OTP mandatory hai?",
    "Mujhe thoda doubt ho raha hai OTP share karne mein.",
    "Iska alternate verification method hai?"
  ],
  
  otp_2: [
    "Abhi tak OTP receive nahi hua.",
    "Network thoda slow lag raha hai, ek minute.",
    "Mujhe message check karne do, koi OTP nahi aaya.",
    "OTP ka format kya hota hai?",
    "Kya yeh same OTP multiple times use hota hai?"
  ],
  
  otp_3: [
    "Aap third time OTP maang rahe ho, yeh unusual hai.",
    "Agar account already compromised hai toh OTP kaise safe rahega?",
    "OTP share karne se risk badh sakta hai.",
    "Iska official circular number kya hai?",
    "Kya aap mujhe RBI guideline dikha sakte ho?"
  ],
  
  otp_4: [
    "Thik hai, OTP aaya hai, lekin pehle branch confirm kar do.",
    "Main OTP bhejne se pehle ek baar branch manager se baat kar lunga.",
    "Aap apna employee ID bhejo, main OTP forward karta hoon.",
    "OTP share karne se pehle, aap apna verification complete karo.",
    "Mujhe OTP mil gaya, lekin main confident nahi hoon."
  ],
  
  otp_5: [
    "Main branch jakar puchta hoon pehle.",
    "Mere friend ne kaha tha aise requests ignore karne ka.",
    "Main kal subah bank jakar confirm karunga.",
    "Aap itna insist kar rahe ho, mujhe trust nahi ho raha.",
    "Main branch se confirm kar lunga pehle."
  ],
  
  resend: [
    "RESEND? Kaunse number pe bhejna hai?",
    "Maine RESEND likh diya, ab kya hoga?",
    "RESEND kar diya, OTP aayega ab?",
    "Kaunse number pe RESEND bhejna hai?",
    "Aap dobara number bhejo, main RESEND kar dunga."
  ],
  
  // ============ PHASE 5: CONTROLLED SHUTDOWN & EXIT (Turns 12+) ============
  // Professional, clean exit with maximum intelligence extracted
  tollfree: [
    "SBI ka 1800 425 3800 number hai na? Main wahan call karunga.",
    "1800 112 211 pe call karo, wahan baat karte hain.",
    "Mujhe SBI ka 1800 wala number pata hai. Aap wahan se call karo.",
    "Toll-free number 1800 wala do, +91 wala nahi chalega.",
    "SBI ka official customer care 1800 425 3800 hai."
  ],
  
  branch: [
    "Main kal subah 11 baje branch aa raha hoon.",
    "Aap branch ka address bhejo, main abhi aata hoon.",
    "Meri home branch Andheri West mein hai, wahan jau?",
    "Branch manager se baat karni hai, unka naam kya hai?",
    "Main branch jakar hi verification karunga."
  ],
  
  cyber: [
    "Main isko cyber crime portal pe verify karunga.",
    "1930 pe complaint register kar raha hoon.",
    "Main branch aur cyber cell dono ko inform karunga.",
    "Mujhe lag raha hai yeh official process nahi hai.",
    "Main verification ke bina koi data share nahi karunga."
  ],
  
  permanent: [
    "Permanent block usually branch approval ke bina possible nahi hota.",
    "Iska escalation ID kya hai?",
    "Aapka case reference number kya hai?",
    "Permanent action lene se pehle written notice milta hai.",
    "Kya iske liye complaint ID generate hui hai?"
  ],
  
  fine: [
    "Jurmana? Kis rule ke under jurmana hai? Section batao.",
    "Jurmana kyun lagega? Maine koi service nahi li.",
    "Pehle block bol rahe the, ab jurmana bhi?",
    "Maine koi crime nahi kiya, jurmana ka kya reason hai?",
    "RBI guidelines mein aisa kuch nahi hai."
  ],
  
  link: [
    "Yeh domain official lag nahi raha.",
    "SSL certificate valid hai kya?",
    "Iska WHOIS registration date kya hai?",
    "Main unknown link pe click nahi karta.",
    "Yeh shortened link kyun use kiya hai?"
  ],
  
  fake_offer: [
    "Maine koi lottery nahi jiti.",
    "Bina ticket khareede lottery nahi jiti jaati.",
    "Yeh fake lag raha hai.",
    "Aise offers ke liye bank kabhi call nahi karta.",
    "Main iska reference number check karunga."
  ],
  
  family: [
    "Mere papa bank mein kaam karte hain, main unse puch leta hoon.",
    "Mera bhai bhi SBI mein hai, use call karta hoon pehle.",
    "Meri wife ne kaha yeh scam ho sakta hai.",
    "Mere friend ke saath aise hi hua tha.",
    "Mere cousin ne kaha aise calls ignore karne ka."
  ],
  
  // ============ EXIT PHASE - CLEAN PROFESSIONAL ENDING ============
  exit: [
    "Main official branch verification ke bina proceed nahi karunga.",
    "Main directly bank customer care se contact karunga.",
    "Is conversation ko yahin end karte hain.",
    "Thank you, main branch visit kar raha hoon.",
    "I will verify this through official channels only."
  ],
  
  fallback: [
    "Mujhe samajh nahi aaya, thoda detail mein batao.",
    "Aap kaunsa bank bol rahe ho pehle yeh batao.",
    "Main thoda confuse hoon, kya exact problem hai?",
    "Kya main apni branch aa sakta hoon iske liye?",
    "Yeh process ka official document hai kya?"
  ],
  // ============ ADD THESE TO YOUR EXISTING REPLIES OBJECT ============

  // ============ LOTTERY SCAM ============
  lottery_initial: [
    "Lottery? Maine toh koi ticket nahi kharida. Phir bhi jeet gaya?",
    "Maine lottery jeeti? Sach mein? Kitne paise ka prize hai?",
    "Kaunsa lottery hai? Konsi company ka?",
    "Mujhe kyun mil raha hai? Koi condition hai kya?",
    "Yeh mujhe message kyun aaya? Main lucky hoon?"
  ],
  
  lottery_first: [
    "Prize kitne ka hai? 1 lakh, 10 lakh?",
    "Kaunsa prize hai? Car, phone, cash?",
    "Prize lene ke liye kya karna hoga?",
    "Yeh offer sach mein hai? Mujhe bhi milega?"
  ],
  
  lottery_second: [
    "Claim karne ke liye kya documents chahiye?",
    "Kahan jaana hoga prize lene? Aapka office kahan hai?",
    "Koi processing fee toh nahi lagegi?",
    "Prize direct account mein transfer kar sakte ho?"
  ],
  
  lottery_third: [
    "Teen baar baat kar rahe ho prize ki. Mujhe trust nahi ho raha.",
    "Aap sahi ho na? Scam toh nahi hai?",
    "Maine TV pe dekha hai aise scams ke baare mein.",
    "Bina ticket khareede lottery jeetna possible hai kya?"
  ],
  
  lottery_gift: [
    "Gift mein kya mil raha hai? Batao na.",
    "Gift kaunsa company de raha hai?",
    "Mujhe gift kab milega? Delivery kaise hogi?",
    "Gift lene ke liye kuch pay karna hoga?"
  ],

  // ============ INVESTMENT SCAM ============
  investment_initial: [
    "Yeh investment plan kya hai? Mujhe batao.",
    "Investment mein kitna lagana hoga? Minimum amount kya hai?",
    "Kaunsa field mein invest karna hai? Share market ya kuch aur?",
    "Main bhi invest kar sakta hoon? Process kya hai?"
  ],
  
  investment_first: [
    "Kitna profit milega? Percentage mein batao.",
    "Profit guaranteed hai? Loss ka chance toh nahi?",
    "Kitne time mein profit milega? 1 mahina, 6 mahina?",
    "Monthly profit kitna hoga 10,000 lagane par?"
  ],
  
  investment_second: [
    "Dusra option kya hai? Koi risk nahi hai?",
    "Main 50,000 invest karun toh kitna milega?",
    "Ismein lock-in period hai kya?",
    "Koi hidden charges toh nahi?"
  ],
  
  investment_third: [
    "Teen baar baat kar rahe ho investment ki. Thoda doubt ho raha.",
    "Itna profit kaise possible hai? Aap batao.",
    "Koi proof hai aapke paas ki yeh real hai?",
    "Main pehle chota amount dal kar test karun?"
  ],
  
  investment_profit: [
    "Profit guaranteed hai toh main ready hoon.",
    "Kitna profit hoga 1 lakh par? Batao na.",
    "Profit ka kya proof doge?",
    "Monthly profit milta hai ya yearly?"
  ],
  
  investment_referral: [
    "Referral se kya milega? Kitne log ko bhejna hoga?",
    "Mere dosto ko bhi bhejun? Unko bhi milega?",
    "Referral commission kitna hai?",
    "Main apne family ko bhi bhej sakta hoon?"
  ],

  // ============ JOB SCAM ============
  job_initial: [
    "Job kaunsa hai? Work from home?",
    "Salary kitni hai? Experience chahiye?",
    "Main apply kar sakta hoon? Process kya hai?",
    "Part time hai ya full time?",
    "Kya qualifications chahiye?"
  ],
  
  job_first: [
    "Job description kya hai? Kaam kya karna hoga?",
    "Timing kya hai? Flexible hai?",
    "Salary monthly hai ya weekly?",
    "Training milegi kya?"
  ],
  
  job_second: [
    "Interview hoga kya? Online ya offline?",
    "Kahan par job hai? Location kya hai?",
    "Company ka naam kya hai? Kahan registered hai?",
    "Main kab join kar sakta hoon?"
  ],
  
  job_third: [
    "Registration fee kyun lagega?",
    "Job dene ke liye paise kyun le rahe ho?",
    "Mujhe laga free mein job milti hai.",
    "Pehle job do, phir fee dunga."
  ],
  
  job_fee_question: [
    "Registration fee kitna hai? Refundable hai?",
    "Fee pay karne ke baad job confirm?",
    "Kaise pay karun fee? Online?",
    "Maine aise scams ke baare mein suna hai."
  ],

  // ============ LOAN SCAM ============
  loan_initial: [
    "Loan kitne ka milega? 1 lakh, 5 lakh?",
    "Interest rate kitna hai? EMI kitni hogi?",
    "Loan ke liye kya documents chahiye?",
    "Main loan lena chahta hoon. Process kya hai?"
  ],
  
  loan_first: [
    "Interest rate kam hai kya? 10% se kam?",
    "Loan tenure kitne saal ka hai?",
    "Prepayment charges hain kya?",
    "Loan ka processing time kitna hai?"
  ],
  
  loan_second: [
    "Documents scan karke bhej du? Kahan bhejna hai?",
    "PAN card, Aadhar, salary slip sab hai.",
    "CIBIL score check karoge? Kitna chahiye?",
    "Main self-employed hoon, loan mil sakta hai?"
  ],
  
  loan_third: [
    "Processing fee kyun? Loan direct kyun nahi dete?",
    "Pehle loan do, phir fee dunga.",
    "Mujhe laga loan free mein milta hai.",
    "Aapka company kaunsa hai? RBI registered hai?"
  ],
  
  loan_advance_fee: [
    "Processing fee kitni hai? Kab pay karun?",
    "Fee pay karne ke baad loan kab milega?",
    "Yeh fee refundable hai agar loan reject ho?",
    "Fee ka payment online karun ya cash?"
  ],

  // ============ KYC SCAM ============
  kyc_initial: [
    "Mera KYC expire ho gaya? Mujhe pata nahi tha.",
    "KYC update karna hai? Kaise karun online?",
    "Aapne kaise detect kiya ki mera KYC expired hai?",
    "KYC expire hone se kya problem hogi?"
  ],
  
  kyc_first: [
    "KYC update ke liye kya documents chahiye?",
    "Aadhar card ka photo bheju? Kahan bhejna hai?",
    "PAN card bhi chahiye kya?",
    "KYC ke liye kuch fee toh nahi lagegi?"
  ],
  
  kyc_second: [
    "Maine Aadhar bhej diya. Ab kya karna hai?",
    "KYC update hone mein kitna time lagega?",
    "KYC expire hai toh mera account block ho jayega?",
    "KYC ke liye OTP aaya hai. Bhej du?"
  ],
  
  kyc_third: [
    "Teen baar KYC ki baat kar rahe ho. Thoda doubt ho raha.",
    "Yeh process normal lag raha hai?",
    "Bank wale aise KYC nahi karte usually.",
    "Main pehle branch se confirm kar leta hoon."
  ],

  // ============ TECH SUPPORT SCAM ============
  tech_initial: [
    "Mere computer mein virus hai? Kaise pata chala aapko?",
    "Kaunsa virus hai? Kaisa problem ho raha hai?",
    "Mera laptop slow chal raha hai. Isiliye call kiya?",
    "Aap kaunsi company se ho? Microsoft ya kuch aur?"
  ],
  
  tech_first: [
    "Virus hatane ke liye kya karna hoga?",
    "Aap remote access karoge mere computer mein?",
    "TeamViewer install karun? Woh safe hai?",
    "Is service ka kya charge hai?"
  ],
  
  tech_second: [
    "Aap computer expert ho? Kahan se ho?",
    "Mere computer mein personal files hain. Safe hai na?",
    "Kaunsa software use karoge? Main install karun?",
    "Virus hatane mein kitna time lagega?"
  ],
  
  tech_third: [
    "Aap Microsoft se ho toh official number 1800 hota hai. Aapka kyun nahi?",
    "Remote access dene se pehle apna ID prove karo.",
    "Main dar raha hoon remote access dene se.",
    "Yeh process thoda ajeeb lag raha hai."
  ],
  
  tech_remote: [
    "Remote access kya hota hai? Aap kya karoge mere computer mein?",
    "Remote access de doon? Koi problem toh nahi hogi?",
    "Aapko mere computer mein kya dekhna hai?",
    "TeamViewer ka ID aur password maang rahe ho?"
  ],

  // ============ CRYPTO SCAM ============
  crypto_initial: [
    "Crypto mein invest karun? Bitcoin, Ethereum?",
    "Crypto mining kaise karte hain?",
    "Mujhe crypto ke baare mein kuch nahi pata. Aap batao.",
    "Yeh crypto wallet kya hota hai?"
  ],
  
  crypto_first: [
    "Kitna crypto milega 10,000 lagane par?",
    "Crypto price upar neeche hota hai. Loss toh nahi hoga?",
    "Main crypto wallet kaise banaye?",
    "Aapka exchange kaunsa hai? WazirX, CoinDCX?"
  ],
  
  crypto_second: [
    "Crypto mining ke liye kya chahiye?",
    "Mining rig kharidna padega kya?",
    "Electricity cost kaun pay karega?",
    "Monthly profit kitna hoga mining se?"
  ],
  
  crypto_third: [
    "Crypto mein scam bahut hote hain. Aap sahi ho na?",
    "Aapke paas koi license hai?",
    "Main pehle chota amount dal kar test karun?",
    "Yeh scheme ka kya proof hai aapke paas?"
  ],

  // ============ GIFT CARD SCAM ============
  giftcard_initial: [
    "Gift card kaunsa hai? Amazon ka ya Flipkart ka?",
    "Kitne ka gift card milega? 500 ka, 1000 ka?",
    "Mujhe gift card kyun mil raha hai?",
    "Yeh offer sirf mere liye hai ya sabke liye?"
  ],
  
  giftcard_first: [
    "Gift card redeem kaise karun?",
    "Code kahan se lau?",
    "Gift card lene ke liye kya karna hoga?",
    "Koi fee toh nahi lagegi?"
  ],
  
  giftcard_second: [
    "Free mein gift card? Thoda ajeeb lag raha hai.",
    "Iske liye kuch pay karna hoga kya?",
    "Main pehle check kar leta hoon online.",
    "Gift card code share karun? Safe hai na?"
  ],
  
  giftcard_third: [
    "Aisi offers ke baare mein maine scams padhe hain.",
    "Bina kuch kare gift card nahi milta.",
    "Koi hidden charges toh nahi?",
    "Main confident nahi hoon. Aap prove karo."
  ],

  // ============ REFUND SCAM ============
  refund_initial: [
    "Mujhe refund milega? Kitne paise ka?",
    "Kyun refund mil raha hai? Maine kuch claim nahi kiya tha.",
    "Excess charge hua tha kya? Mujhe pata nahi chala.",
    "Refund direct account mein aayega?"
  ],
  
  refund_first: [
    "Refund ke liye kya karna hoga?",
    "Koi form bharna hoga kya?",
    "Refund kab tak aayega?",
    "Refund ka confirmation milega kya?"
  ],
  
  refund_second: [
    "Refund ke liye processing fee kyun lagega?",
    "Direct account mein kyun nahi bhej dete?",
    "Mujhe laga refund automatic hota hai.",
    "Aapka company kaun sa hai? Official website kya hai?"
  ],
  
  refund_third: [
    "Refund ke naam pe OTP maang rahe ho?",
    "Yeh refund scam lag raha hai.",
    "Maine aise scams ke baare mein suna hai.",
    "Main pehle bank se confirm kar leta hoon."
  ],

  // ============ EMAIL-RELATED RESPONSES ============
  email_send_request: [
    "Email kahan bhejna hai? Aapka email ID kya hai?",
    "Kaunsa email ID pe bhejna hai? Main note kar leta hoon.",
    "Email ID batao, main details forward kar dunga.",
    "Kya aap apna email ID de sakte ho? Main wahan bhej dunga."
  ],

  email_provided: [
    "Yeh {email} aapka email hai? Main check kar leta hoon.",
    "{email} – yeh sahi hai? Ispe bhej du details?",
    "Is email {email} pe aap regular check karte ho?",
    "Yeh {email} official email hai ya personal?"
  ],

  email_suspicious: [
    "Yeh email address thoda ajeeb lag raha hai. Official hai kya?",
    "{email} – yeh domain sahi hai? @gmail.com nahi hai?",
    "Company ka official email @company.com hota hai. Yeh {email} kyun hai?",
    "Yeh email scam lag raha hai. Official domain nahi hai."
  ],

  email_otp_request: [
    "Email pe OTP aaya hai? Main check kar raha hoon.",
    "OTP email mein bheja hai? Kaunsa email ID pe?",
    "Email OTP share karun? Safe hai na?",
    "Email OTP aaya. Bhej du?"
  ],

  email_bank_claim: [
    "Bank ka email official domain se aata hai. Yeh woh nahi hai.",
    "Bank kabhi personal email se nahi bhejta. Yeh fake hai.",
    "Bank ke official email domain alag hota hai. Yeh nahi hai.",
    "Yeh email bank ka nahi lag raha. Confirm karo."
  ],

  // ============ CONTRADICTION RESPONSES ============
  name_contradiction: [
    "Aapne pehle {oldName} bola tha, ab {newName} bol rahe ho? Yeh kya hai?",
    "Pehle aapka naam {oldName} tha, ab {newName}? Main confuse ho gaya.",
    "Aap apna naam change kyun kar rahe ho? {oldName} tha na pehle?",
    "Ek baar decide karo, {oldName} ya {newName}?"
  ],

  phone_contradiction: [
    "Aapne pehle {oldPhone} diya tha, ab {newPhone} de rahe ho?",
    "Phone number change kyun kiya? Pehle wala {oldPhone} kya hua?",
    "Do alag number bata rahe ho. Kaunsa sahi hai?"
  ],

  // ============ EXIT REPLIES ============
  exit_goodbye: [
    "Main branch se verify kar leta hoon. Thank you.",
    "Main official customer care number pe call karunga. Bye.",
    "Maine information note kar liya. Main check karunga.",
    "Thik hai, main verify kar leta hoon. Aap apna kaam karo.",
    "Main cyber helpline 1930 pe complaint kar dunga.",
    "Is conversation ko yahin end karte hain. Thank you."
  ],

  // ============ FALLBACK ============
  fallback_scared: [
    "Mujhe samajh nahi aaya. Aap hi batao kya karna hai.",
    "Main confuse hoon. Aap guide karo na.",
    "Kya exact problem hai? Main dar gaya hoon.",
    "Mera paisa safe hai na? Aap batao.",
    "Main aapke bharose hoon. Jo kaho karunga."
  ]

};
