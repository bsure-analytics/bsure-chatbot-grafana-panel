# 🧠 AI Chatbot – Grafana Plugin

This Grafana panel plugin brings the power of AI directly into your dashboards. It allows users to interact with their data using natural language, powered by the [Groq API](https://groq.com/).

---

## ✨ Features

- Connects to Groq's powerful LLMs
- Custom system message (initial prompt) to define bot behavior
- Data from dashboards automatically transformed into JSON and used in context
- Ask follow-up questions directly within the panel
- UI-based setup – no manual config required

---

## 🚀 Getting Started

### 1. Set Your Groq API Key

To use this plugin, you must provide your **Groq API Key**. This is used to authenticate your chatbot with Groq's language models.

1. Get your API key from [Groq.com](https://groq.com/)
2. Paste it into the plugin settings

### 2. Define the Bot's Role

In the plugin settings, you can provide an **initial message**, also called the **system prompt**. This message sets the role of the bot and determines how it should respond.

> 💡 _Example:_  
> `"You are an analytical assistant for a Grafana dashboard. Summarize trends, detect anomalies, and answer questions based on incoming JSON data."`

Consider refining this prompt to get better and more focused answers.

### 3. Link Data Sources

To provide data to the AI:

- Select the **Dashboard** as the data source via the UI
- The plugin will automatically gather the linked data and convert it into JSON format
- This data will be sent alongside user questions to provide context

> 📌 _Only panels with Dashboard as their data source will supply data to the bot._

---

## 💬 Asking Questions

Once configured, simply ask your chatbot questions about the linked dashboard data — such as:

- "What trends do you see?"
- "Are there any unusual spikes?"
- "Can you summarize this week's performance?"

The bot will use the current JSON dataset and system prompt to generate responses.

---

## 🛠 Best Practices

- Keep your system prompt clear and goal-oriented
- Link only relevant dashboards to avoid overwhelming the model
- Ask concise and specific questions for best results

---

## 🧩 Plugin Requirements

- Internet access to reach Groq API
- datasources connected to the dashboard
- A valid Groq API key
