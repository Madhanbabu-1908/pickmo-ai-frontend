# 🤖 Pickmo.ai – Frontend

**Pickmo.ai** is a modern, cross‑platform AI chatbot that connects to a backend aggregating multiple free AI providers (Groq, OpenRouter, Google Gemini). It supports **text chat, image understanding, document‑based RAG, real‑time streaming, persistent conversation context, and many power‑user features** – all while running on **web, Windows (Electron), and Android (Capacitor)**.

🔗 **Backend repository:** [github.com/Madhanbabu-1908/pickmo-ai](https://github.com/Madhanbabu-1908/pickmo-ai)

---

## ✨ Key Features

### Core AI
- 💬 **Multi‑model chat** – dynamically list and switch between 50+ free models (Llama, Mixtral, Qwen, Gemini, Mistral, Phi‑3, etc.)
- 🖼️ **Image understanding** – upload images, ask questions (Gemini 2.0 Flash, Nemotron VL)
- 📄 **RAG (Retrieval-Augmented Generation)** – upload documents (.txt, .md), ask questions, keep them active for the whole conversation
- 🌐 **Optional web search** – toggle live search (DuckDuckGo) to get current information
- 🎤 **Voice input** – speech‑to‑text using the Web Speech API
- 🔊 **Text‑to‑speech** – read assistant responses aloud

### Conversation Management
- ✏️ **Edit messages** – change a previous message and get a new response
- 🔀 **Fork conversations** – create a new branch from any user message
- 🗑️ **Delete message branches** – remove a message and all subsequent ones
- 🔍 **Search chat history** – filter by title or message content
- 📦 **Export chat** – save current conversation as a Markdown file
- 🔗 **Share chat** – generate a compressed, shareable URL (restores the whole conversation)

### User Experience
- 🎨 **Dark / light theme** – toggle with persistence in localStorage
- 👍 **Message reactions** – thumbs up / down (stored per conversation)
- 💾 **Persistent preferences** – remembers last used model, RAG toggle, sidebar collapse state
- ⚡ **Typing indicator** – shows "AI is thinking…" while streaming
- 📎 **Active document preview** – see which documents are currently in context, remove any individually

### Platform Support
- 🌐 **Web app** – deployed on Vercel, responsive design
- 🖥️ **Windows desktop** – packaged as `.exe` (installer & portable) using Electron
- 📱 **Android** – `.apk` built with Capacitor, installable on any Android 8+ device

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS (with dark mode) |
| Markdown rendering | react-markdown + custom table/code components |
| HTTP client | Axios + native Fetch API |
| Icons | Lucide React |
| Desktop packaging | Electron |
| Mobile packaging | Capacitor |
| Hosting (web) | Vercel |
| State persistence | localStorage (chat history, preferences, reactions) |

---

## 🚀 Getting Started (Development)

### Prerequisites
- Node.js 18+ and npm
- Git

### Clone & Install

```bash
git clone https://github.com/Madhanbabu-1908/pickmo-ai-frontend.git
cd pickmo-ai-frontend
npm install
```

### Environment Variables

Create a `.env` file in the root:

```env
VITE_API_URL=https://pickmo-ai.onrender.com/api   # your backend URL (local: http://localhost:5000/api)
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🏗️ Building for Production

### Web App (Vercel)

```bash
npm run build
# Upload the `dist/` folder to Vercel
```

### Windows Desktop (Electron)

```bash
npm run build
npm run electron:build:win
```

Outputs:
- Portable: `dist-electron/win-unpacked/Pickmo.ai.exe`
- Installer: `dist-electron/Pickmo.ai Setup.exe`

### Android APK (Capacitor)

```bash
npm run build
npx cap sync
npx cap open android
# In Android Studio → Build → Build APK(s)
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📁 Project Structure

```
pickmo-ai-frontend/
├── public/                     # static assets (icon, etc.)
├── src/
│   ├── components/
│   │   ├── ChatArea.jsx        # main chat UI (messages, input, attachments)
│   │   ├── Sidebar.jsx         # navigation, chat history, search, actions
│   │   ├── ModelSelector.jsx   # model dropdown with search & tooltips
│   │   ├── Resources.jsx       # uploaded & generated documents
│   │   ├── HelpSupport.jsx     # feedback form (masked)
│   │   ├── Suggestion.jsx      # suggestions (masked)
│   │   ├── Download.jsx        # download page for .exe / .apk
│   │   ├── PromptLibrary.jsx   # saved reusable prompts
│   │   └── privacy.js          # PII masking utilities
│   ├── App.jsx                 # main app logic (state, routing, API)
│   ├── main.jsx                # React entry point
│   └── index.css               # global styles, Tailwind, animations
├── electron/                   # Electron main script (main.cjs)
├── capacitor.config.ts         # Capacitor configuration
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── .env
```

---

## 🔗 Backend Integration

The frontend communicates with the backend via a REST API. All AI model calls, RAG indexing, and web search are performed by the backend.

| Endpoint | Description |
|----------|-------------|
| `GET /api/models` | Fetch available free models |
| `POST /api/chat/stream` | Streaming chat (text + optional images) |
| `POST /api/rag/upload` | Upload a document for RAG (with chatId) |
| `POST /api/rag/search` | Search for relevant document chunks |
| `GET /api/rag/documents/:chatId` | List active documents |
| `DELETE /api/rag/delete/:chatId` | Clear all documents for a chat |
| `POST /api/feedback` | Send feedback/suggestion email |

See the [backend README](https://github.com/Madhanbabu-1908/pickmo-ai#readme) for full API details.

---

## 🧪 Testing the Live Version

- Web app: [https://pickmo-ai-frontend.vercel.app](https://pickmo-ai-frontend.vercel.app)
- Backend health: [https://pickmo-ai.onrender.com/api/health](https://pickmo-ai.onrender.com/api/health)

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

MIT © [Madhanbabu-1908](https://github.com/Madhanbabu-1908)
