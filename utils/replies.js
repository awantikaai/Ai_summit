export const REPLIES = {

  // ============ PHASE 1: CONFUSED VICTIM (Turns 1-2) ============
  victim_confused: [
    "Kya? Mera account block ho jayega? Maine toh koi transaction nahi kiya.",
    "Aap kaun bol rahe ho? Bank se ho? Kaunsa bank?",
    "Mujhe koi message nahi aaya. Aapko kaise pata chala?",
    "Yeh sab kya chal raha hai? Main samajh nahi pa raha.",
    "Mera account kaise block hoga? Maine toh kuch kiya hi nahi.",
    "Achanak yeh sab kyun? Mujhe kuch pata nahi."
  ],
  
  victim_worried: [
    "Kaunsa transaction? Kitne paise ka tha? Mera balance toh same hai.",
    "Transaction kab hua? Maine toh koi OTP nahi diya.",
    "Kya aap transaction ID bata sakte ho? Main check kar leta hoon.",
    "Online transaction tha ya ATM se? Mujhe kuch pata nahi.",
    "Maine apna passbook check kiya, koi entry nahi hai.",
    "Mera mobile number change nahi hua, phir bhi OTP nahi aaya."
  ],

  // ============ PHASE 2: TRAPPED VICTIM (Turns 3-4) ============
  victim_scared: [
    "Aap kaunse department se ho? Main dar gaya hoon.",
    "Mera account safe hai na? Aap batao kya karu?",
    "Main thoda confuse hoon. Aap help karo na.",
    "Please batao kya karna hai. Main tension mein hoon.",
    "Mujhe kuch samajh nahi aa raha. Aap hi guide karo.",
    "Mera paisa toh safe hai na? Please confirm karo."
  ],
  
  victim_asking: [
    "Aapka employee ID kya hai? Main note kar leta hoon.",
    "Aap fraud prevention team se ho? Kaunsi branch se?",
    "Main kahan jaakar verify karu? Branch address batao.",
    "Aapka naam kya hai? Main call back kar sakta hoon?",
    "Official number kya hai aapka? Main confirm kar leta hoon.",
    "Aapka department ka naam kya hai? Pehli baar sun raha hoon."
  ],

  // ============ ASK FOR SCAMMER INFO ============
  ask_scammer_name: [
    "Aapka naam kya hai? Main note kar leta hoon.",
    "Aap kaun ho? Pehle apna introduction do.",
    "Aapka naam kya hai? Main call back kar sakta hoon aapko?",
    "Kaunsa department? Aapka naam kya hai wahan?",
    "Mujhe aapka naam batao, main record mein rakh leta hoon.",
    "Aapke saath baat kar raha hoon, par aapka naam hi nahi pata."
  ],

  ask_scammer_phone: [
    "Aapka number kya hai? Main call back karunga.",
    "Mujhe aapka phone number do, main contact kar leta hoon.",
    "Aap kis number se bol rahe ho? Main wahan call kar leta hoon.",
    "Aapka contact number batao, main call back kar sakta hoon?",
    "Is number ke alawa koi aur number hai aapka?",
    "Yeh number aapka personal hai ya office ka?"
  ],

  ask_employee_id: [
    "Aapka employee ID kya hai? Main verify kar leta hoon.",
    "Employee ID batao, main check karunga system mein.",
    "Aapke employee ID ke aage branch code kya hai?",
    "SBI mein employee ID ka format kya hota hai? Aapka kya hai?",
    "Main aapka ID note kar leta hoon. Kya hai?",
    "Bina employee ID ke kaise verify karun? Batao na."
  ],

  ask_branch_code: [
    "Aapka branch code kya hai? Main verify karunga.",
    "Kaunsi branch se bol rahe ho? Branch code batao.",
    "Branch ka IFSC code kya hai?",
    "Branch code ke saath branch address bhi batao.",
    "Aapke branch ka telephone number kya hai?",
    "Branch ka naam kya hai? Kahan located hai?"
  ],

  ask_official_number: [
    "Official number kya hai aapka? Main confirm kar leta hoon.",
    "Aapka department ka official number batao.",
    "SBI ka official helpline number 1800 hota hai. Aapka kyun nahi?",
    "Main aapke official number pe call back karunga. Batao.",
    "Aapka customer care number kya hai? Main wahan call karunga.",
    "Toll-free number do na, main abhi call kar leta hoon."
  ],

  // ============ BANK FRAUD SPECIFIC ============
  bank_initial: [
    "Mera SBI account hai. Kya problem hai exactly?",
    "SBI se baat kar rahe ho? Aapka employee ID kya hai?",
    "Bank wale phone pe OTP nahi maangte. Aap sahi ho?",
    "Mera account number {account} hai. Aapke system mein kya dikh raha?",
    "Kaunsa branch se bol rahe ho? Main wahan jaanta hoon kisi ko."
  ],
  
  bank_otp_first: [
    "OTP aaya hai SBI se. Ab main kya karun?",
    "SBI ka OTP aaya. Kahan bhejna hai yeh?",
    "OTP mil gaya. Aapka employee ID kya tha? Main note kar leta hoon.",
    "Yeh OTP {otp} hai. Safe hai na share karna?",
    "OTP aaya, par main dar raha hoon. Aap SBI se hi ho na?"
  ],
  
  bank_otp_second: [
    "Dusra OTP bhi aaya. Aapka branch code kya hai?",
    "OTP nahi aa raha dobara. Network problem hai kya?",
    "Phir se OTP aaya. Aapka naam kya hai? Main note kar leta hoon.",
    "OTP expire ho gaya. Dobara bhejo. Employee ID dubara batao.",
    "Teen minute mein OTP expire ho jayega. Aapka ID batao jaldi."
  ],
  
  bank_otp_third: [
    "Teen OTP aa gaye. Mera account block toh nahi hoga?",
    "Itni baar OTP maang rahe ho. Aap sure ho na?",
    "Main confuse ho gaya. Aapka department kya hai exactly?",
    "OTP share kar diya toh account safe rahega?",
    "Mujhe trust nahi ho raha. Aap apna ID prove karo."
  ],
  
  bank_otp_fourth: [
    "Chaar OTP ho gaye. Main dar gaya hoon.",
    "Itni baar OTP... kuch gadbad toh nahi?",
    "Aapka employee ID aur branch code dubara batao.",
    "Main OTP dene ko taiyaar hoon. Lekin aap sahi ho na?",
    "OTP dunga, par pehle apna ID card dikhao."
  ],
  
  bank_otp_fifth: [
    "Paanch OTP maang liye. Ab main kya karun?",
    "Main bahut dar gaya. Aap bachao mujhe.",
    "Jo tum kaho ge main karunga. Bas mera account bacha lo.",
    "OTP bhej du? UPI PIN bhi bhejun? Kya karna hai?",
    "Main aapke bharose hoon. Batao kya step hai."
  ],

  // ============ UPI FRAUD SPECIFIC ============
  upi_initial: [
    "UPI ID kya hai aapka? Main check kar leta hoon.",
    "Kaunsa UPI app use kar rahe ho? PhonePe, Google Pay?",
    "UPI se paise bhejne hain kya? Kahan bhejna hai?",
    "Mera UPI ID {upi} hai. Aapka kya hai?",
    "UPI transaction ke liye kya karna hoga?"
  ],
  
  upi_request_first: [
    "UPI ID {upi} pe bhejna hai? Yeh sahi hai?",
    "Is UPI ID ka registered mobile number kya hai?",
    "Yeh UPI ID verify karo, main bhej deta hoon.",
    "UPI ID dobara bhejo, main note kar leta hoon.",
    "Konsa bank hai yeh UPI ID? Main check kar leta hoon."
  ],
  
  upi_request_second: [
    "Maine check kiya, yeh UPI ID active nahi lag raha.",
    "Dobara UPI ID bhejo. Shayad galat type ho gaya.",
    "Is UPI ID ka kya naam hai? Kiska hai yeh?",
    "UPI ID {upi} hai? Confirm karo, main bhej raha hoon.",
    "Yeh UPI ID pe transaction limit kitni hai?"
  ],
  
  upi_request_third: [
    "Teen baar UPI ID maang liya. Aap sure ho?",
    "UPI ID sahi hai na? Main dar raha hoon.",
    "Yeh UPI ID kisi aur ka toh nahi?",
    "Main bhej dunga, lekin pehle apna naam batao.",
    "UPI ID ke saath branch code bhi batao."
  ],
  
  upi_pin_request: [
    "UPI PIN kyun chahiye? Yeh toh confidential hai.",
    "UPI PIN share karna safe nahi. Aap SBI se ho?",
    "PIN dunga, lekin pehle apna employee ID batao.",
    "UPI PIN bhej du? Phir kya hoga?",
    "Main dar raha hoon PIN dene se. Aap sure ho?"
  ],

  // ============ PHISHING/LINK SCAM SPECIFIC ============
  link_initial: [
    "Yeh link kya hai? Kahan se aaya?",
    "Link pe click karun? Safe hai kya?",
    "Kaunsa website hai yeh? Domain name kya hai?",
    "Link khola toh kya hoga? Mera phone safe hai?",
    "Yeh link SBI ka hai ya kuch aur?"
  ],
  
  link_first: [
    "Link {link} hai. Ispe click karun abhi?",
    "Yeh link thoda ajeeb lag raha. Official hai kya?",
    "SSL certificate valid hai iska?",
    "Link ka screenshot bhej sakte ho? Main match kar leta hoon.",
    "Yeh link pe click karne se kya hoga?"
  ],
  
  link_second: [
    "Maine link check kiya, par khola nahi. Safe hai?",
    "Dobara link bhejo. Shayad galat aaya.",
    "Is link ka kya matlab hai? Batao na.",
    "Link ke saath koi OTP aaya hai kya?",
    "Main click kar dunga, lekin pehle apna naam batao."
  ],
  
  link_third: [
    "Teen baar link bheja. Kya hai ismein?",
    "Main dar raha hoon click karne se. Aap sahi ho?",
    "Link ke jagah screenshot bhejo, main dekh leta hoon.",
    "Yeh link kisi aur ko bhi bheja hai?",
    "Main click nahi kar raha bina confirmation ke."
  ],

  // ============ LOTTERY/GIFT SCAM SPECIFIC ============
  lottery_initial: [
    "Maine lottery jeeti? Sach mein? Kitne paise ka prize hai?",
    "Maine toh koi ticket nahi kharida tha. Phir bhi jeet gaya?",
    "Konsi lottery hai? Kaunsa company ka?",
    "Bahut din se lottery khel raha tha, aaj finally jeet gaya!",
    "Yeh mujhe message kyun aaya? Main lucky hoon?"
  ],
  
  lottery_first: [
    "Prize kitne ka hai? 1 lakh, 10 lakh?",
    "Kaunsa prize hai? Car, phone, cash?",
    "Mujhe kyun mil raha hai? Koi condition hai?",
    "Yeh offer sach mein hai? Mujhe bhi milega?",
    "Main lucky kaise hua? Batao na."
  ],
  
  lottery_second: [
    "Claim karne ke liye kya karna hoga?",
    "Kahan jaana hoga prize lene? Aapka office kahan hai?",
    "Koi processing fee toh nahi lagegi?",
    "Prize direct account mein transfer kar sakte ho?",
    "Claim karne ke liye kya documents chahiye?"
  ],
  
  lottery_third: [
    "Teen baar baat kar rahe ho prize ki. Mujhe trust nahi ho raha.",
    "Aap sahi ho na? Scam toh nahi hai?",
    "Maine TV pe dekha hai aise scams ke baare mein.",
    "Bina ticket khareede lottery jeetna possible hai kya?",
    "Koi advance payment nahi lagegi na?"
  ],
  
  lottery_gift: [
    "Gift mein kya mil raha hai? Batao na.",
    "Gift kaunsa company de raha hai?",
    "Mujhe gift kab milega? Delivery kaise hogi?",
    "Gift lene ke liye kuch pay karna hoga?",
    "Main gift lene ke liye ready hoon. Batao kya karna hai?"
  ],

  // ============ INVESTMENT SCAM SPECIFIC ============
  investment_initial: [
    "Yeh investment plan kya hai? Mujhe batao.",
    "Investment mein kitna lagana hoga? Minimum amount kya hai?",
    "Kaunsa field mein invest karna hai? Share market ya kuch aur?",
    "Main bhi invest kar sakta hoon? Process kya hai?",
    "Yeh scheme government registered hai?"
  ],
  
  investment_first: [
    "Kitna profit milega? Percentage mein batao.",
    "Profit guaranteed hai? Loss ka chance toh nahi?",
    "Kitne time mein profit milega? 1 mahina, 6 mahina?",
    "Profit cash mein milega ya account mein?",
    "Monthly profit kitna hoga 10,000 lagane par?"
  ],
  
  investment_second: [
    "Dusra option kya hai? Koi risk nahi hai?",
    "Main 50,000 invest karun toh kitna milega?",
    "Ismein lock-in period hai kya?",
    "Paise nikal sakte hain kab bhi?",
    "Koi hidden charges toh nahi?"
  ],
  
  investment_third: [
    "Teen baar baat kar rahe ho investment ki. Thoda doubt ho raha.",
    "Itna profit kaise possible hai? Aap batao.",
    "Koi proof hai aapke paas ki yeh real hai?",
    "Main pehle chota amount dal kar test karun?",
    "Yeh scheme ka koi document hai aapke paas?"
  ],
  
  investment_profit: [
    "Profit guaranteed hai toh main ready hoon.",
    "Kitna profit hoga 1 lakh par? Batao na.",
    "Profit ka kya proof doge?",
    "Monthly profit milta hai ya yearly?",
    "Profit ka cheque bhejte ho ya transfer?"
  ],
  
  investment_referral: [
    "Referral se kya milega? Kitne log ko bhejna hoga?",
    "Mere dosto ko bhi bhejun? Unko bhi milega?",
    "Referral commission kitna hai?",
    "Main apne family ko bhi bhej sakta hoon?",
    "Referral ka koi limit hai?"
  ],

  // ============ JOB SCAM SPECIFIC ============
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
    "Training milegi kya?",
    "Job ke liye koi bond sign karna hoga?"
  ],
  
  job_second: [
    "Interview hoga kya? Online ya offline?",
    "Kahan par job hai? Location kya hai?",
    "Company ka naam kya hai? Kahan registered hai?",
    "Main kab join kar sakta hoon?",
    "Experience certificate chahiye kya?"
  ],
  
  job_third: [
    "Registration fee kyun lagega?",
    "Job dene ke liye paise kyun le rahe ho?",
    "Mujhe laga free mein job milti hai.",
    "Pehle job do, phir fee dunga.",
    "Yeh company kaunsa hai? Kahan located hai?"
  ],
  
  job_fee_question: [
    "Registration fee kitna hai? Refundable hai?",
    "Fee pay karne ke baad job confirm?",
    "Kaise pay karun fee? Online?",
    "Fee ke baad kya hoga? Interview?",
    "Maine aise scams ke baare mein suna hai."
  ],

  // ============ LOAN SCAM SPECIFIC ============
  loan_initial: [
    "Loan kitne ka milega? 1 lakh, 5 lakh?",
    "Interest rate kitna hai? EMI kitni hogi?",
    "Loan ke liye kya documents chahiye?",
    "Main loan lena chahta hoon. Process kya hai?",
    "Loan kitne time mein approve hoga?"
  ],
  
  loan_first: [
    "Interest rate kam hai kya? 10% se kam?",
    "Loan tenure kitne saal ka hai?",
    "Prepayment charges hain kya?",
    "Loan ka processing time kitna hai?",
    "Kya main online apply kar sakta hoon?"
  ],
  
  loan_second: [
    "Documents scan karke bhej du? Kahan bhejna hai?",
    "PAN card, Aadhar, salary slip sab hai.",
    "CIBIL score check karoge? Kitna chahiye?",
    "Loan approval ke liye kya criteria hai?",
    "Main self-employed hoon, loan mil sakta hai?"
  ],
  
  loan_third: [
    "Processing fee kyun? Loan direct kyun nahi dete?",
    "Pehle loan do, phir fee dunga.",
    "Mujhe laga loan free mein milta hai.",
    "Aapka company kaunsa hai? RBI registered hai?",
    "Main pehle bank se check kar leta hoon."
  ],
  
  loan_advance_fee: [
    "Processing fee kitni hai? Kab pay karun?",
    "Fee pay karne ke baad loan kab milega?",
    "Yeh fee refundable hai agar loan reject ho?",
    "Main fee pay kar dunga. Account details batao.",
    "Fee ka payment online karun ya cash?"
  ],

  // ============ KYC SCAM SPECIFIC ============
  kyc_initial: [
    "Mera KYC expire ho gaya? Mujhe pata nahi tha.",
    "KYC update karna hai? Kaise karun online?",
    "Aapne kaise detect kiya ki mera KYC expired hai?",
    "KYC expire hone se kya problem hogi?",
    "Main KYC update kar dunga. Batao kya karna hai?"
  ],
  
  kyc_first: [
    "KYC update ke liye kya documents chahiye?",
    "Aadhar card ka photo bheju? Kahan bhejna hai?",
    "PAN card bhi chahiye kya?",
    "KYC ke liye kuch fee toh nahi lagegi?",
    "Online KYC ho sakta hai ya branch aana hoga?"
  ],
  
  kyc_second: [
    "Maine Aadhar bhej diya. Ab kya karna hai?",
    "KYC update hone mein kitna time lagega?",
    "KYC expire hai toh mera account block ho jayega?",
    "Main abhi update kar deta hoon. Link bhejo.",
    "KYC ke liye OTP aaya hai. Bhej du?"
  ],
  
  kyc_third: [
    "Teen baar KYC ki baat kar rahe ho. Thoda doubt ho raha.",
    "Yeh process normal lag raha hai?",
    "Bank wale aise KYC nahi karte usually.",
    "Main pehle branch se confirm kar leta hoon.",
    "Aapka employee ID kya hai? Main verify karunga."
  ],

  // ============ ACCOUNT EXTRACTION ============
  account_shocked: [
    "Aapko mera account number {account} kaise pata chala? Yeh toh confidential hai.",
    "{account} – yeh mera account number hai! Aapke paas kaise aaya?",
    "Mera account number {account} sahi hai. Aapka system mein kya show ho raha hai?",
    "Account number {account} hai. Aapke paas aur kya information hai mere baare mein?",
    "Yeh mera account number {account} hai. Aapko kis transaction ki baat kar rahe ho?",
    "Account number toh sahi hai. Aapke paas mera address kya hai?"
  ],
  
  account_verify: [
    "Aapke system mein account {account} ke saath mera address kya hai?",
    "Account {account} ka nominee ka naam kya hai aapke paas?",
    "Mera date of birth kya hai records mein? Batao toh main confirm kar leta hoon.",
    "Account open date kya hai aapke paas? Main check kar leta hoon.",
    "Is account mein joint holder ka naam kya hai? Batao.",
    "Mera mobile number kya hai aapke records mein? Match kar leta hoon."
  ],

  // ============ UPI EXTRACTION ============
  upi_confirm: [
    "Yeh UPI ID {upi} hai na? Main check kar raha hoon.",
    "{upi} – yeh sahi hai? Kahan se aaya yeh UPI ID?",
    "Is UPI ID ka registered mobile number kya hai?",
    "Yeh UPI ID kaunsa bank use kar raha hai?",
    "{upi} ko verify kaise karun? Koi option hai?",
    "Yeh UPI ID active hai? Main bhej deta hoon."
  ],
  
  upi_scared: [
    "Maine {upi} check kiya, par samajh nahi aaya. Aap dobara batao.",
    "Yeh {upi} sahi hai? Main confuse ho raha hoon.",
    "Is UPI ID se koi transaction hua hai kya?",
    "Mujhe {upi} pe bhejna hai kuch? Kaise bheju?",
    "Yeh UPI ID safe hai na? Main dar raha hoon.",
    "UPI ID {upi} pe bhej du? Confirm karo."
  ],

  // ============ AUTHORITY BELIEVE ============
  authority_believe: [
    "Aap SBI se ho? Aapka employee ID kya hai? Main note kar leta hoon.",
    "Fraud prevention team se ho? Aapka department code kya hai?",
    "Aapka naam kya hai? Main call back kar sakta hoon aapko?",
    "Aapke manager ka naam kya hai? Unse baat karni hai.",
    "Aapka employee ID aur branch code batao, main record mein rakh leta hoon.",
    "Aapke saath baat kar raha hoon, par aapka ID toh do."
  ],

  // ============ PHONE CONTEXT AWARE ============
  phone_victim_confirm: [
    "Haan {phone} mera number hai. OTP isi number pe aayega na?",
    "Mera number {phone} hai. Main wait kar raha hoon OTP ka.",
    "Haan haan, {phone} mera hi number hai. OTP kab aayega?",
    "Maine apna number {phone} diya tha registration time pe.",
    "OTP {phone} pe aana chahiye. Abhi tak nahi aaya.",
    "Mera number {phone} hai. Isi pe message aayega?"
  ],
  
  phone_victim_wait: [
    "Mera number {phone} hai. OTP nahi aaya abhi tak.",
    "Network slow hai kya? {phone} pe abhi tak OTP nahi aaya.",
    "Main check kar raha hoon {phone} pe, koi OTP nahi aaya.",
    "Dobara bhejo {phone} pe, OTP expire ho gaya.",
    "{phone} pe message check kiya, koi OTP nahi hai.",
    "OTP kab tak aayega {phone} pe?"
  ],
  
  phone_scammer_curious: [
    "Yeh {phone} aapka number hai? Main call kar sakta hoon ispe?",
    "{phone} – yeh aapka personal number hai?",
    "Is number {phone} pe aap available ho? Main call back karunga.",
    "Aapne {phone} diya hai. Yeh customer care number hai?",
    "Main {phone} pe call kar ke baat kar leta hoon.",
    "Yeh {phone} aapka hai ya office ka number?"
  ],
  
  phone_scammer_doubt: [
    "Maine {phone} pe call kiya, par koi nahi utha. Aap ho wahan?",
    "Yeh {phone} number busy aa raha hai. Koi aur number hai?",
    "Is {phone} pe aap nahi utha rahe. Main kya karun?",
    "Aapka number {phone} sahi hai? Call connect nahi ho raha.",
    "Dobara number bhejo, {phone} pe call nahi lag raha.",
    "Maine 2 baar call kiya {phone} pe, koi nahi utha."
  ],
  
  phone_scammer_compare: [
    "Yeh {phone} number hai. Par SBI ka official number 1800 hota hai na?",
    "{phone} toh personal number lag raha hai. 1800 wala kyun nahi de rahe?",
    "SBI ka toll-free 1800 425 3800 hai. Yeh {phone} kyun hai?",
    "Main 1800 pe call kar ke confirm kar leta hoon. Aapka {phone} nahi chalega.",
    "Aap bar bar {phone} de rahe ho, par main 1800 pe hi bharosa karunga.",
    "1800 wala number do na, main wahan call kar leta hoon."
  ],

  // ============ PHONE AMBIGUOUS ============
  phone_ambiguous: [
    "Yeh number {phone} kisका hai? Aapka ya mera?",
    "Confuse ho gaya. {phone} aapka number hai ya mujhe OTP ispe bhejna hai?",
    "Please clear karo - {phone} aapka hai jahan main call karu?",
    "Ek baar batao - {phone} kisका number hai?",
    "Mujhe lag raha hai {phone} aapka number hai. Confirm karo.",
    "Yeh {phone} number kis liye hai? Main samajh nahi paya."
  ],

  // ============ PROGRESSIVE OTP - UNIVERSAL ============
  otp_first: [
    "OTP aaya hai! Ab main kya karun? Aap batao.",
    "OTP mil gaya. Kahan bhejna hai yeh?",
    "OTP aaya, par main dar raha hoon share karne se. Safe hai na?",
    "Maine OTP dekha. Aapka ID kya tha? Main note kar leta hoon.",
    "OTP aaya hai. Ab kya process hai?",
    "Yeh OTP {otp} hai. Bhej du?"
  ],
  
  otp_second: [
    "OTP nahi aa raha. Phir se bhejo. Aapka number sahi hai?",
    "Network slow hai, OTP late aa raha. Aapka ID dubara batao.",
    "OTP aaya nahi. Check karo aur branch code batao.",
    "SMS aa raha hai but OTP nahi. Aapka department kya hai?",
    "OTP ka wait kar raha hoon. Aapka naam kya hai?",
    "Dusra OTP bhi nahi aaya. Kya problem hai?"
  ],
  
  otp_third: [
    "Teen baar OTP maang liya. Mera account block toh nahi hoga?",
    "Main dar gaya hoon. Aap sure ho na ki yeh sahi hai?",
    "OTP share kar diya toh mera account safe rahega na?",
    "Mujhe trust nahi ho raha. Aap apna ID prove karo.",
    "Ek baar branch se confirm kar leta hoon. Aapka branch code kya hai?",
    "Itni baar OTP maang rahe ho, kuch gadbad toh nahi?"
  ],
  
  otp_fourth: [
    "Thik hai, OTP dunga. Lekin pehle batao aapka system mein mera address kya hai?",
    "Main OTP dene ko taiyaar hoon. Aapka employee ID batao.",
    "Mera date of birth batao aapke records mein, phir OTP dunga.",
    "Aapka naam kya hai? Confirm karo, phir OTP bhejunga.",
    "Main OTP bhej raha hoon. Aapka ID note kar liya?",
    "Chaar OTP ho gaye. Ab confident nahi hoon."
  ],
  
  otp_fifth: [
    "Main OTP nahi de sakta. Mujhe dar lag raha hai.",
    "Yeh process sahi nahi lag raha. Main branch ja raha hoon.",
    "Aapne bahut baar OTP manga. Main confident nahi hoon.",
    "Main ab SBI ke official number pe call kar raha hoon.",
    "Maine aapka number note kar liya. Branch mein complaint karunga.",
    "Paanch OTP maang liye. Ab main nahi dunga."
  ],
  
  otp_resend: [
    "RESEND kar diya. OTP aane do. Aap apna ID batao.",
    "RESEND kiya. Network slow hai. Aapka branch code kya hai?",
    "RESEND ho gaya. Aap fraud department se ho ya risk team se?",
    "RESEND bhej diya. Aapka reporting manager ka naam kya hai?",
    "RESEND kiya. OTP aa raha hoga. Aapka designation kya hai?",
    "RESEND kar diya. Ab wait karta hoon."
  ],

  // ============ THREAT RESPONSES - SCARED VICTIM ============
  permanent_scared: [
    "Permanent block? Mera account hamesha ke liye block ho jayega?",
    "Nahi please, mera account mat block karo. Main kya karun?",
    "Permanent block ka kya matlab hai? Mera paisa khatam ho jayega?",
    "Aap mujhe bachao. Main kya step lu?",
    "Branch manager se baat karwa do. Main unse baat kar leta hoon.",
    "Permanent block mat karo. Main kuch bhi karunga."
  ],
  
  fine_worried: [
    "Jurmana? Kitna jurmana lagega? Maine kya galat kiya?",
    "Jurmana kyun? Mera account theek tha. Aap batao kya karun.",
    "Jurmana bharne se mera account safe ho jayega?",
    "Jurmana kaise bharein? Online bheju aapko?",
    "RBI aise jurmana lagata hai kya? Main confuse hoon.",
    "Jurmana kitna hai? Main bhara dunga."
  ],

  // ============ LINK & OFFER ============
  link_curious: [
    "Yeh link safe hai? Main click karun ispe?",
    "Link khola toh kya hoga? Mera phone safe hai na?",
    "Aap bhej rahe ho toh click kar leta hoon. Kya hoga ismein?",
    "Yeh link kyun bhej rahe ho? Ispe kya hai?",
    "Main click kar dunga. Phir kya karna hai?",
    "Link ka screenshot bhejo, main dekh leta hoon."
  ],
  
  offer_tempted: [
    "Kaunsa offer? Mujhe kuch nahi mila.",
    "Lottery? Maine toh koi ticket nahi kharida.",
    "Cashback kaise milega? Kya karna hoga?",
    "Yeh offer sach mein hai? Mujhe bhi milega?",
    "Main interested hoon. Aage ka process kya hai?",
    "Offer mein kya milega? Batao na."
  ],

  // ============ POLICY ============
  policy_confused: [
    "RBI kya kehta hai aise cases mein? Mujhe pata nahi.",
    "Bank ke rules kya hain? Main nahi jaanta.",
    "Yeh process RBI ke according hai na? Aap batao.",
    "Main common man hoon, mujhe yeh sab nahi pata.",
    "Aap hi batao kya sahi hai. Main aapke bharose hoon.",
    "RBI guidelines kya kehti hain is baare mein?"
  ],

  // ============ REPETITION RESPONSES ============
  repetition_mild: [
    "Aapne yeh baat pehle bhi kahi thi. Kuch aur batao?",
    "Haan haan, yeh aap bol chuke ho. Aage kya?",
    "Maine sun liya. Ab kya karna hai?",
    "Yeh aap repeat kar rahe ho. Koi nayi baat?",
    "Samajh gaya, par aage kya process hai?",
    "Dubara batao? Main note kar leta hoon."
  ],

  repetition_annoyed: [
    "Aap baar baar yahi keh rahe ho. Thoda confuse ho raha hoon.",
    "Yeh teen baar ho gaya same baat. Kuch aur batao.",
    "Mujhe lag raha hai aap script padh rahe ho. Naya kuch bolo.",
    "Repetition se kuch nahi hoga. Aage ka batao.",
    "Main wait kar raha hoon kuch nayi information ka.",
    "Yeh 3rd baar hai. Kuch naya batao."
  ],

  repetition_frustrated: [
    "Aap same baat baar baar bol rahe ho. Main confuse ho raha hoon.",
    "Yeh 4th baar hai aap yahi keh rahe ho. Kya problem hai?",
    "Mujhe lagta hai main kuch galat samajh raha hoon. Dobara explain karo.",
    "Aapki baat samajh aa rahi hai, par kuch naya bhi bolo.",
    "Main thoda frustrated ho raha hoon. Kuch aur information do.",
    "Itni baar same baat bol rahe ho, main confuse ho gaya."
  ],

  // ============ FAMILY ============
  family_worried: [
    "Mere papa bank mein kaam karte hain. Main unse puch leta hoon.",
    "Mera bhai bhi SBI mein hai. Use call karta hoon pehle.",
    "Meri wife ne kaha yeh scam ho sakta hai. Aap sahi toh ho?",
    "Mere friend ke saath aise hi hua tha. Main usse puchta hoon.",
    "Mere cousin ne kaha aise calls pe dhyan mat do. Main kya karun?",
    "Mera dost bol raha hai yeh scam hai. Aap prove karo."
  ],

  // ============ TOLL-FREE ============
  tollfree_curious: [
    "SBI ka 1800 425 3800 number hai na? Main wahan call kar leta hoon.",
    "1800 112 211 pe call karun? Wahan se confirm ho jayega?",
    "Mujhe SBI ka 1800 wala number pata hai. Wahan call kar ke puchta hoon.",
    "Toll-free number 1800 wala do. Main abhi call karta hoon.",
    "Main 1800 pe call kar ke confirm kar lunga ki aap sahi ho.",
    "1800 number do, main abhi call kar ke puchta hoon."
  ],

  // ============ BRANCH VISIT ============
  branch_visit: [
    "Main kal subah 11 baje branch aa raha hoon. Branch manager ka naam kya hai?",
    "Aap branch ka address bhejo, main abhi aata hoon.",
    "Meri home branch Andheri West mein hai. Wahan jau?",
    "Branch manager se baat karni hai. Unka naam kya hai?",
    "Main branch jakar hi verification karunga. Address do.",
    "Branch kahan hai? Main abhi aata hoon."
  ],

  // ============ CYBER ============
  cyber_threat: [
    "Main 1930 pe call kar raha hoon. Aapka number cyber cell ke paas hai.",
    "Maine cyber crime portal pe complaint file kar di.",
    "Cyber cell ne kaha aise numbers block kar do. Main block kar raha hoon.",
    "Aapka number trace ho raha hai cyber cell se.",
    "Main branch aur cyber cell dono ko inform kar dunga.",
    "Cyber cell ko complaint kar dunga. Number note kar liya."
  ],
  
  cyber_complaint: [
    "Main cyber crime mein complaint kar dunga. Number kya hai?",
    "1930 pe call karun? Yeh cyber cell ka number hai na?",
    "Maine aapka number note kar liya. Cyber cell ko dunga.",
    "Cyber crime portal pe online complaint kaise karein?",
    "Main branch aur cyber cell dono ko inform kar dunga.",
    "Cyber cell complaint ka process kya hai?"
  ],

  // ============ FINAL EXIT ============
  final_goodbye: [
    "Main branch ja raha hoon. Aap apna kaam karo.",
    "Maine SBI customer care ko inform kar diya hai.",
    "Is conversation ko yahin end karte hain. Thank you.",
    "Main official channel se verify kar lunga. Bye.",
    "Aapka number main block kar raha hoon. Don't call again.",
    "Main ab baat nahi kar sakta. Branch ja raha hoon."
  ],

  // ============ FALLBACK ============
  fallback_scared: [
    "Mujhe samajh nahi aaya. Aap hi batao kya karna hai.",
    "Main confuse hoon. Aap guide karo na.",
    "Kya exact problem hai? Main dar gaya hoon.",
    "Mera account safe hai na? Aap batao.",
    "Main aapke bharose hoon. Jo kaho karunga.",
    "Kya karna hai? Batao na, main ready hoon."
  ],

  // ============ EMAIL-RELATED RESPONSES ============
  email_send_request: [
    "Email kahan bhejna hai? Aapka email ID kya hai?",
    "Kaunsa email ID pe bhejna hai? Main note kar leta hoon.",
    "Email ID batao, main details forward kar dunga.",
    "Kya aap apna email ID de sakte ho? Main wahan bhej dunga.",
    "Email address do, main abhi bhejta hoon.",
    "Aapka email ID batao, main details bhej dunga."
  ],

  email_provided: [
    "Yeh {email} aapka email hai? Main check kar leta hoon.",
    "{email} – yeh sahi hai? Ispe bhej du details?",
    "Is email {email} pe aap regular check karte ho?",
    "Email {email} confirm hai na? Main bhej raha hoon.",
    "Yeh {email} official email hai ya personal?",
    "Is email pe aap available ho? Main bhej dunga."
  ],

  email_ask_victim: [
    "Mera email {email} hai. Aapko kyun chahiye?",
    "Mera email {email} hai. Ispe kuch bhejna hai?",
    "Haan {email} mera email hai. Kya bhejna hai aapko?",
    "Maine apna email {email} diya tha registration time pe.",
    "Email {email} pe bhej do, main check kar leta hoon.",
    "Mera email {email} hai. Kya chahiye?"
  ],

  email_suspicious: [
    "Yeh email address thoda ajeeb lag raha hai. Official hai kya?",
    "{email} – yeh domain sahi hai? @gmail.com nahi hai?",
    "Company ka official email @sbi.co.in hota hai. Yeh {email} kyun hai?",
    "Yeh email scam lag raha hai. Official domain nahi hai.",
    "Mujhe lagta hai yeh fake email hai. Confirm karo.",
    "Yeh email SBI ka nahi lag raha. Check karo."
  ],

  email_check_request: [
    "Email check kar raha hoon. Kya bheja tha aapne?",
    "Main email dekhta hoon. Subject line kya tha?",
    "Email aaya hai? Main abhi check kar raha hoon.",
    "Konsa email? Main spam folder bhi check kar leta hoon.",
    "Email ka screenshot bhej sakte ho? Main match kar leta hoon.",
    "Email check kiya, kuch nahi aaya. Dobara bhejo."
  ],

  email_password_request: [
    "Email ka password kyun chahiye? Yeh toh confidential hai.",
    "Password nahi de sakta. Email bhejna hai toh bhejo.",
    "Email password share karna safe nahi hai.",
    "Bina password ke bhi email aa sakta hai. Dobara bhejo.",
    "Password nahi dunga. Main email check kar leta hoon.",
    "Email password nahi de sakte. Koi aur option hai?"
  ],

  email_link: [
    "Email mein link bheja hai? Kaunsa link hai?",
    "Link pe click karun? Safe hai kya?",
    "Yeh link official website jaisa nahi lag raha.",
    "Link kholne se pehle confirm karo ki safe hai.",
    "Main link pe tab tak click nahi karunga jab tak verify na kar lun.",
    "Link ka domain kya hai? Main check kar leta hoon."
  ],

  email_otp_request: [
    "Email pe OTP aaya hai? Main check kar raha hoon.",
    "OTP email mein bheja hai? Kaunsa email ID pe?",
    "Email OTP aaya, par main confident nahi hoon share karne se.",
    "OTP email mein aaya. Ab main kya karun?",
    "Email OTP share karun? Safe hai na?",
    "Email OTP aaya. Bhej du?"
  ],

  email_bank_claim: [
    "Bank ka email @sbi.co.in se aata hai. Yeh {email} woh nahi hai.",
    "SBI kabhi personal email se nahi bhejta. Yeh fake hai.",
    "Bank ke official email domain alag hota hai. Yeh nahi hai.",
    "Main SBI ka email pehle bhi dekha hai. Yeh match nahi kar raha.",
    "Yeh email bank ka nahi lag raha. Confirm karo.",
    "Yeh email SBI official nahi lag raha."
  ],

  email_confused: [
    "Email ki baat kar rahe ho? Kaunsa email?",
    "Mujhe koi email nahi aaya. Dobara bhejo.",
    "Email address kya hai? Main note kar leta hoon.",
    "Email ke through karna hai? Thik hai, batao kya karna hai.",
    "Main email dekh leta hoon. Thoda wait karo.",
    "Email ka kya karna hai? Batao na."
  ],

  greeting_response: [
    "Hello, kaun bol raha hai?",
    "Haan bolo, kaun ho aap?",
    "Namaste, kaise aapko number mila mera?",
    "Hi, aap kaunse company se ho?",
    "Hello, kya kaam hai?",
    "Haan bhai, bolo kya baat hai?",
    "Kaun ho aap? Pehle apna parichay do."
  ]
};