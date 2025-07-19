# AI Internship Tracker

A powerful Electron desktop application that helps you capture screenshots of job postings, extract job information using AI, and track your internship applications. Built with a modern, Cluely-inspired UI for a premium user experience.

![AI Internship Tracker](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)

## ✨ Features

### 🎯 Smart Screenshot Capture
- **Floating Toolbar**: Elegant, translucent toolbar that stays on top
- **Quick Capture**: One-click screenshot with automatic dashboard integration
- **Smart Positioning**: Remembers position and snaps to screen edges
- **Auto-fade**: Toolbar becomes transparent when idle

### 🤖 AI-Powered Job Analysis
- **OCR Text Extraction**: Uses Tesseract.js to extract text from screenshots
- **OpenRouter Integration**: Leverages GPT-3.5-turbo for intelligent job data extraction
- **Structured Data**: Automatically extracts company, position, requirements, salary, etc.
- **Context Detection**: Recognizes job sites (LinkedIn, Indeed, etc.) and provides smart hints

### 📊 Internship Tracking
- **Complete CRUD**: Add, edit, delete, and search internship applications
- **Status Management**: Track application progress (Applied, Interview, Offer, etc.)
- **Smart Filtering**: Filter by status, company, or application date
- **Data Export**: Export application data as JSON

### 🎨 Modern UI/UX
- **Glassmorphism Design**: Beautiful blur effects and transparency
- **Premium Animations**: Smooth transitions and micro-interactions
- **Context Menus**: Right-click functionality throughout the app
- **Keyboard Shortcuts**: Global hotkeys for quick actions
- **Responsive Design**: Adapts to different screen sizes

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- OpenRouter API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-internship-tracker.git
   cd ai-internship-tracker/screenshot-tool
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your OpenRouter API key**
   - Get your API key from [OpenRouter](https://openrouter.ai/)
   - Update the key in `services/aiService.js`

4. **Start the application**
   ```bash
   npm start
   ```

## 🎮 Usage

### Basic Workflow
1. **Launch**: The floating toolbar appears on startup
2. **Capture**: Click "Capture" to take a screenshot and open the dashboard
3. **Analyze**: Click "Analyze" to capture and extract job information
4. **Track**: Save extracted job data to your internship tracker

### Keyboard Shortcuts
- `Ctrl/Cmd + Shift + C`: Quick capture
- `Ctrl/Cmd + Shift + A`: Quick analyze
- `Ctrl/Cmd + H`: Hide toolbar
- `Esc`: Close context menus

### Context Menu
Right-click the toolbar to access:
- Dashboard
- Internship Tracker
- Settings
- Hide toolbar

## 🏗️ Architecture

```
screenshot-tool/
├── main.js              # Main Electron process
├── preload.js           # Secure IPC bridge
├── toolbar.html/js      # Floating toolbar UI
├── index.html/js        # Dashboard interface
├── tracker.html/js      # Internship tracker
├── job-info.html        # Job information display
├── services/
│   └── aiService.js     # OCR and AI processing
├── assets/
│   └── tray-icon.png    # System tray icon
└── package.json
```

### Tech Stack
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Electron (Node.js)
- **AI/ML**: Tesseract.js (OCR), OpenRouter API (GPT-3.5-turbo)
- **Storage**: Electron Store (JSON-based)
- **UI Framework**: Custom components with Glassmorphism design

## 🔧 Configuration

### AI Service Settings
Edit `services/aiService.js` to configure:
- OpenRouter API key
- Model selection (GPT-3.5-turbo, GPT-4, etc.)
- Token limits and truncation
- Prompt customization

### App Settings
The app stores settings in:
- **Screenshots**: `~/.config/screenshot-tool/screenshots.json`
- **Internships**: `~/.config/screenshot-tool/internships.json`
- **Preferences**: `~/.config/screenshot-tool/config.json`

## 🎯 Key Features in Detail

### Smart Context Detection
- Automatically detects when you're on job sites
- Provides contextual hints and styling
- Supports LinkedIn, Indeed, Glassdoor, and more

### Enhanced Toolbar
- **Auto-fade**: Becomes transparent after 3 seconds of inactivity
- **Edge Snapping**: Automatically snaps to screen edges
- **Position Memory**: Remembers last position between sessions
- **Status Indicators**: Visual feedback for different states

### Intelligent Data Extraction
- Extracts 10+ data fields from job postings
- Handles various job posting formats
- Fallback for missing information
- Structured JSON output

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use ESLint configuration
- Follow existing code patterns
- Add comments for complex logic
- Update README for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Tesseract.js** for OCR capabilities
- **OpenRouter** for AI API access
- **Electron** for cross-platform desktop framework
- **Cluely** for UI/UX inspiration

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/ai-internship-tracker/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/ai-internship-tracker/discussions)
- **Email**: your.email@example.com

## 🔮 Roadmap

- [ ] Settings panel with preferences
- [ ] Data export to CSV/PDF
- [ ] Cloud sync capabilities
- [ ] Browser extension integration
- [ ] Mobile app companion
- [ ] Advanced analytics dashboard
- [ ] Team collaboration features

---

**Made with ❤️ for job seekers everywhere** 