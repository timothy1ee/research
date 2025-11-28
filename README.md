# Research

Exploring patterns for long-running, autonomous AI development sessions.

## Purpose

This repository documents strategies and workflows for enabling AI agents to work independently on complex software projects for extended periods without constant human intervention.

## Key Strategies

### 1. Structured Design & Milestone Planning

Use formal design documents before implementation:
- **Design documents** (`memory/design/`) define *what* and *why*
- **Milestone plans** (`memory/milestones/`) break work into testable chunks
- **Design stacking** - new designs build on previous ones (001 → 002 → 003)

See: `commands/design_system.md`, `commands/plan_milestones.md`

### 2. Structured Logging for Debugging

Use tagged, structured logging throughout the codebase:
- Tags like `[WEBSOCKET]`, `[AGENT]`, `[API]` enable filtering
- Log to files (`logs/app.log`) to avoid context pollution
- Log decision points, state changes, and API calls
- Reduce verbosity after each milestone

### 3. Test-Driven Development

Write tests first, run them constantly:
- **Unit tests** - individual functions/components
- **Integration tests** - API endpoints, database, external services  
- **E2E tests** - full user flows via Playwright
- Run tests after every small change, not just at the end

### 4. MCP Tools

Leverage Model Context Protocol servers for enhanced capabilities:
- **Context7** - fetch up-to-date library documentation before integration
- **Playwright** - browser automation for E2E testing and visual verification

### 5. The Mega Loop

Iterative development cycle:
```
Design → Milestones → Implement → (New) Design → (New) Milestones → ...
```
Each iteration brings you closer to the long-term goal.

## Projects

### voice-chat-app

Voice chat application with multiple AI agent backends.

**Prompt:**
> I want you to make a React + Express (typescript) app that will let me voice chat with either OpenAI (either voice-to-voice, or STT-LLM-TTS) or Eleven Labs. I want to be able to hot swap at any time.
>
> @commands/build_project.md

## Commands

Reusable workflow templates in `commands/`:
- `build_project.md` - Main orchestration guide
- `design_system.md` - Design document template
- `plan_milestones.md` - Milestone planning guide

