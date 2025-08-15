# 🤖 Star Wars Chatbot

A sophisticated, multi-agent chatbot system built with Next.js, LangChain, and Supabase. This chatbot channels the wisdom of Yoda from Star Wars while providing intelligent routing to specialized agents for weather, news, and general conversation.

![Star Wars Theme](public/yoda.jpg)

## ✨ Features

### 🎭 **Yoda Persona**
- Speaks in Yoda's distinctive style with reversed word order and mystical wisdom
- Maintains character consistency throughout conversations
- Provides helpful advice using the "wisdom of the Force"

### 🧠 **Multi-Agent Architecture**
- **Router Agent**: Intelligently classifies user queries into weather, news, or general chat
- **Weather Agent**: Fetches real-time weather data for any location
- **News Agent**: Retrieves current news headlines on any topic
- **Title Agent**: Automatically generates conversation titles
- **Summarizer Agent**: Creates conversation summaries every 5 turns

### 🎤 **Voice Input**
- Voice-to-text transcription using OpenAI Whisper
- Real-time audio recording and processing
- Seamless integration with chat interface

### 💾 **Conversation Management**
- Persistent chat history with Supabase
- Multiple conversation threads
- Automatic conversation summarization
- Smart message selection for context

### 🎨 **Modern UI/UX**
- Responsive design with Tailwind CSS
- Star Wars themed styling
- Real-time streaming responses
- Smooth animations and transitions

## 🏗️ Architecture

The project uses a sophisticated LangGraph-based architecture:

```
User Input → Router Agent → Specialized Agent → Chat Agent → Response
     ↓              ↓              ↓              ↓
  Voice Input → Transcription → Query Classification → Agent Execution → Yoda Response
```

### Core Components:
- **Frontend**: Next.js 15 with React 19
- **AI Framework**: LangChain with LangGraph for agent orchestration
- **Database**: Supabase for authentication and conversation storage
- **Styling**: Tailwind CSS for modern, responsive design
- **Voice**: OpenAI Whisper API for speech-to-text

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key
- OpenWeather API key
- News API key

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd chatbot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Weather API
OPENWEATHER_API_KEY=your_openweather_api_key

# News API
NEWS_API_KEY=your_news_api_key
```

### 4. Database Setup
Set up your Supabase database with the following tables:

```sql
-- Conversations table
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  summary TEXT,
  current_turn INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
  text TEXT NOT NULL,
  route TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 Usage Examples

### General Chat
```
User: "What is the meaning of life?"
Yoda: "Life's meaning, seek you do. In balance, find it you will. 
      The Force flows through all living things, young Padawan."
```

### Weather Queries
```
User: "What's the weather like in New York?"
Yoda: "Cloudy skies over New York, it is. 18°C with scattered 
      showers. Bring an umbrella, you should."
```

### News Queries
```
User: "Tell me about AI developments"
Yoda: "AI news, I bring you. Top headlines about AI:
      1. Breakthrough in Quantum AI Computing
      2. New AI Ethics Guidelines Released
      3. AI-Powered Healthcare Innovations
      Much to learn, there is."
```

### Voice Input
1. Click the microphone button in the chat interface
2. Speak your question or message
3. The system will transcribe and send your voice input
4. Receive Yoda's response in his characteristic style

## 🔧 Configuration

### Agent Behavior
Each agent can be customized in their respective files:

- **Chat Agent**: Modify Yoda's personality in `app/api/chat/route.ts`
- **Router Agent**: Adjust classification logic in `app/agents/routerAgent.ts`
- **Weather Agent**: Change default location in `app/agents/weatherAgent.ts`
- **News Agent**: Modify news source and filtering in `app/agents/newsAgent.ts`

### Conversation Management
- **Summarization Frequency**: Change the turn threshold in `app/graph/graph.ts`
- **Message Context**: Adjust the number of messages sent to agents
- **Title Generation**: Modify title length limits in `app/agents/titleAgent.ts`

## 📁 Project Structure

```
chatbot/
├── app/
│   ├── agents/           # LangChain agent implementations
│   ├── api/             # API routes for chat and transcription
│   ├── chat/            # Main chat interface
│   ├── graph/           # LangGraph workflow definition
│   └── layout.tsx       # Root layout component
├── components/           # Reusable React components
├── lib/                 # Database and utility functions
├── types/               # TypeScript type definitions
├── utils/               # Helper functions
└── public/              # Static assets
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Other Platforms
The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🧪 Testing

```bash
# Run linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT models and Whisper API
- **LangChain** for the AI framework
- **Supabase** for backend services
- **Next.js** for the React framework
- **George Lucas** for the Star Wars universe inspiration

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](../../issues) page for existing solutions
2. Create a new issue with detailed error information
3. Ensure all environment variables are properly set
4. Verify your API keys have sufficient credits

---

**May the Force be with you!** ✨

*This chatbot combines the wisdom of the Jedi with modern AI technology to create an engaging and intelligent conversational experience.*
