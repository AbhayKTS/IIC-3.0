# AlmaDox n8n Event-Driven Automation Guide

## 🌟 Why Showcasing n8n Gives You a Major Edge with Judges

In hackathons and innovation challenges (like IIC 3.0 at Manipal University Jaipur), judges see dozens of standard web apps. Showing **n8n workflow automation** separates you from 95% of teams because:

1. **Enterprise Event-Driven Architecture**:
   - Rather than forcing the frontend to wait synchronously for slow tasks, AlmaDox dispatches lightweight webhook events (`student_verified`, `resume_parsed`, `job_match`).
   - n8n takes over asynchronously: routing notifications, updating recruiter channels, and syncing institutional records.
2. **Visual Proof of Automation (The "Live Node Canvas")**:
   - Judges love visual diagrams. When you show your screen with the n8n canvas running live — watching nodes blink green as a student scans their ID or uploads a resume — it immediately proves working production-grade automation.
3. **Multi-Channel Delivery Without Code Clutter**:
   - n8n lets you instantly connect to Telegram, Discord, Slack, WhatsApp, or Gmail without hardcoding 10 different SDKs into your Express backend.

---

## ⚡ 2-Minute Setup Options

### Option A: n8n Cloud (Recommended for Demos — Takes 2 Mins)
1. Sign up for a free trial at **[n8n.io](https://n8n.io)** (no credit card needed).
2. Create a new workflow.
3. Click the **⋮** menu in the top right → **Import from File...**
4. Select `n8n/almadox-orchestration-workflow.json`.
5. Click on the **Webhook** node and copy the **Production URL** (e.g., `https://your-instance.app.n8n.cloud/webhook/almadox-events`).
6. Click **Activate / Save**.

### Option B: Local Self-Hosted (Terminal)
Run in your local terminal:
```bash
npx n8n
```
Open `http://localhost:5678`, import `n8n/almadox-orchestration-workflow.json`, and use a tool like ngrok (`ngrok http 5678`) to get a public webhook URL.

---

## 🔑 Configure Environment Variables (Vercel & Local)

Add these 2 variables to your `.env` and Vercel project settings:

```env
# 1. Your public n8n webhook URL
N8N_WEBHOOK_URL=https://your-instance.app.n8n.cloud/webhook/almadox-events

# 2. Shared secret key to authorize n8n to call back into AlmaDox backend
N8N_INTERNAL_KEY=almadox-secret-key-2026
```

---

## 🎬 The 30-Second Demo Pitch for Judges

> *"Behind AlmaDox's student and recruiter dashboards runs an event-driven workflow engine powered by n8n.
> 
> When a student completes an Azure OCR verification or uploads their resume, AlmaDox fires an asynchronous webhook event to our n8n cluster.
> 
> As you can see on our live n8n workflow canvas [show screen], n8n automatically classifies the event, extracts critical skills, triggers recruiter notifications, and writes recommendations back to the institutional portal — all without blocking the user interface."*
