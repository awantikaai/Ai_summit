# 🏆 Agentic Honeypot for Scam Detection & Intelligence Extraction

A production-ready, deterministic honeypot API that detects scam messages, engages scammers in multi-turn conversations, extracts actionable intelligence, and reports findings to the GUVI evaluation endpoint.

## 📌 Overview

This system is designed to act as an **intelligent honeypot** that:
- 🔍 **Detects** scam intent from incoming messages
- 🗣️ **Engages** scammers in natural, multi-turn conversations
- 🧠 **Extracts** valuable intelligence (phone numbers, bank accounts, UPI IDs, emails, phishing links)
- 📤 **Reports** structured data to the GUVI evaluation endpoint

The engine is **100% deterministic** for reliability, with optional Perplexity AI fallback for ambiguous messages.

---

## ✨ Features

### 🔐 Scam Detection
- ✅ 10+ scam types: Bank Fraud, UPI Fraud, Phishing, Lottery, Investment, Job, Loan, KYC, Tech Support, Crypto
- ✅ Pattern-based keyword detection with Hindi/English support
- ✅ Risk scoring system (0-100)
- ✅ Semantic repetition detection

### 💬 Conversation Engine
- ✅ 5-phase psychological flow: Confused → Curious → Interested → Scared → Exit
- ✅ Context-aware responses from 300+ unique replies
- ✅ No repetition - tracks used replies
- ✅ 10-second delay between messages for realism
- ✅ Smart exit after collecting sufficient data (2+ types)

### 📊 Intelligence Extraction
- ✅ Phone numbers (with +91 formatting)
- ✅ Bank accounts (12-16 digit detection)
- ✅ UPI IDs (all formats)
- ✅ Email addresses
- ✅ Phishing links (URLs, shortened links)
- ✅ Employee IDs, branch codes, designations

### 📤 Callback System
- ✅ Mandatory callback to GUVI endpoint
- ✅ 10-second delay before callback
- ✅ Deduplicated intelligence payload
- ✅ Engagement metrics (message count, duration)

---

## 🏗 Architecture
─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ API Request │────▶│ KeywordDetector│────▶│ Scam Detection │
└─────────────────┘ └─────────────────┘ └─────────────────┘
│
▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ GUVI Callback │◀────│ ReplyGenerator │◀────│IntelligenceExt. │
└─────────────────┘ └─────────────────┘ └─────────────────┘


## API Endpoint
- URL:https://aisummit-production.up.railway.app/hackathon/honeypot
- Method: POST
- Authentication: HPK-Sudo-1234567890

### Core Components

| Component | File | Description |
|-----------|------|-------------|
| **Controller** | `controllers/honeypotController.js` | Main API endpoint handler |
| **KeywordDetector** | `services/keywordDetector.js` | Pattern-based scam detection |
| **IntelligenceExtractor** | `utils/intelligenceextract.js` | Extracts data from messages |
| **ReplyGenerator** | `utils/replygenerator.js` | Generates context-aware responses |
| **CallbackService** | `services/callbackService.js` | Sends final data to GUVI |
| **PerplexityService** | `services/perplexity.js` | Optional AI fallback |

---

## 💻 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Perplexity API key (optional)

### Step-by-Step Setup

1. **Clone the repository**
```bash
git clone https://github.com/awantikaai/Ai_summit.git
cd honeypot-scam-detection


