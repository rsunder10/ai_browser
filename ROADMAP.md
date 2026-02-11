# NeuralWeb Roadmap

## Phase 1: Ollama Integration (Current)

- Bundle Ollama as a sidecar process via `electron-ollama`
- Auto-download binary and default model (`llama3.2:1b`) on first launch
- Replace mock `AIManager` with real `/api/chat` calls
- Expose `ai:status`, `ai:models`, `ai:pull-model` IPC channels
- Non-streaming responses; single system+user message per call

## Phase 2: AI Browser Features

- Streaming responses in AI sidebar
- Page summarization using tab content extraction
- Conversation history (multi-turn context)
- Model selection UI in settings
- Smart address bar suggestions powered by LLM
- "Explain this" context menu on selected text

## Phase 3: Browser Polish

- Tab search / command palette (Omnibar improvements)
- Proper permission prompt UI (camera, mic, notifications)
- Extension API improvements
- Sync bookmarks/history across devices
- Performance profiling and memory optimization

## Phase 4: Production Readiness

- Auto-update via `electron-updater`
- Code signing for macOS and Windows
- Crash reporting
- Telemetry (opt-in)
- CI/CD pipeline for builds and releases
- Documentation and onboarding guide
