import axios from "axios";

const PERPLEXITY_REPLY_CATEGORIES = {
  confusion: [
    "Mujhe samajh nahi aaya, thoda aur batao.",
    "Aap kaunsa bank bol rahe ho pehle yeh batao.",
    "Main thoda confuse hoon, kya exact problem hai?",
    "Yeh kaunsa department hai? Pehli baar sun raha hoon.",
    "Kya aap bank se hi ho? Number toh official nahi lag raha."
  ],

  curiosity: [
    "Aapka number kaise mila mujhe?",
    "Yeh conversation thodi unusual lag rahi hai.",
    "Aapka naam aur designation kya hai?",
    "Kya main aapke manager se baat kar sakta hoon?",
    "Aap kis branch se call kar rahe ho?"
  ],

  doubt: [
    "Mujhe thoda doubt ho raha hai abhi.",
    "Yeh process normal nahi lag raha.",
    "Bank wale usually aise verify nahi karte.",
    "Main ismein confident nahi hoon.",
    "Kya iska koi official circular hai?"
  ],

  clarification: [
    "Maine check kiya, koi issue nahi dikh raha.",
    "Aap jo bol rahe ho woh mere records se match nahi kar raha.",
    "Mujhe koi notification nahi aaya.",
    "Kya aap transaction ID share kar sakte ho?",
    "Yeh issue kab start hua exactly?"
  ]
};

export class PerplexityService {

  static async selectCategory(message, conversationHistory, config) {

    if (!config?.USE_PERPLEXITY) return "confusion";

    try {

      // Reduce noise — only last 2 messages
      const recentContext = conversationHistory
        .slice(-2)
        .map(m => `${m.sender}: ${m.text}`)
        .join("\n");

      const response = await axios.post(
        config.PERPLEXITY_URL,
        {
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            {
              role: "system",
              content:
                `Classify the scammer message into ONE category.

Valid categories:
confusion
curiosity
doubt
clarification

Rules:
- Return ONLY the category name.
- No punctuation.
- No explanation.
- If unsure, return confusion.`
            },
            {
              role: "user",
              content:
                `Scammer message: "${message}"

Recent conversation:
${recentContext}

Category:`
            }
          ],
          temperature: 0.2,
          max_tokens: 5
        },
        {
          headers: {
            Authorization: `Bearer ${config.PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: config.PERPLEXITY_TIMEOUT || 2000
        }
      );

      let category = response?.data?.choices?.[0]?.message?.content || "";

      category = category
        .toLowerCase()
        .trim()
        .replace(/[^a-z]/g, "");

      if (!PERPLEXITY_REPLY_CATEGORIES[category]) {
        return "confusion";
      }

      return category;

    } catch (error) {
      return "confusion";
    }
  }

  static getReply(category, session) {

    const replies =
      PERPLEXITY_REPLY_CATEGORIES[category] ||
      PERPLEXITY_REPLY_CATEGORIES.confusion;

    const index =
      (session.turnCount +
       session.repetitionCount +
       session.otpRequests +
       session.threatCount) % replies.length;

    return replies[index];
  }

}
