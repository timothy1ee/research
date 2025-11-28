Create a new folder to store this project, this repo will have many projects. The folder should have subfolders for frontend and backend.

## 🎯 Understanding the Goal: Why These Instructions Exist

**The purpose of these instructions is to enable long-running, autonomous development sessions.** Here's why each pattern exists:

### Why Wait for API Keys (Then Never Wait Again)
- **Coordination point**: We need to coordinate once to provide API keys
- **Early validation**: Testing keys immediately catches issues before building
- **After verification**: Once keys work, you can proceed completely autonomously without further coordination
- **The exception**: This is the ONLY time to wait - after this, work independently

### Why Work Independently and Continuously
- **Long-running sessions**: The goal is to code for as long as possible without human intervention
- **Momentum**: Stopping breaks flow and slows progress
- **Autonomy**: You should make decisions like a real developer would
- **Efficiency**: Less back-and-forth means more progress

### Why Test-First Development
- **Catch bugs early**: Find issues immediately, not after writing lots of code
- **Maintain quality**: Tests ensure code works as you build
- **Debugging aid**: Tests help diagnose issues when things break
- **Confidence**: Know your code works before moving forward

### Why the Mega Loop (Design → Milestones → Implement → Repeat)
- **Iterative learning**: Design, build, learn, then design again based on what you learned
- **Progressive refinement**: Start with foundation, then add features iteratively
- **Manageable chunks**: Break large projects into smaller, testable pieces
- **Continuous progress**: Always moving toward the long-term goal

### Why Ask Questions But Answer Yourself
- **Show thinking**: Like a real developer, you think through decisions
- **Document reasoning**: Your questions and answers become part of the design record
- **Maintain autonomy**: Don't wait for answers - make decisions and proceed
- **Transparency**: Understanding your thought process helps with debugging later

**Understanding these motivations helps you make better decisions when instructions are ambiguous or when you encounter edge cases. The spirit of these instructions is: coordinate once on API keys, then work autonomously and continuously toward the goal.**

## 🎯 INDEPENDENCE MANTRA - State This Upfront

**Before beginning any work, explicitly state your independence and goals:**

"I am working independently to build this project for as long as possible without human intervention. My goal is continuous, autonomous progress. I will:
- Create both backend/.env and frontend/.env files immediately to gather required API keys and configuration
- Ask questions to clarify decisions (like a real developer would)
- Answer those questions myself and make decisions autonomously
- Work through milestones continuously without stopping for approval
- Only pause for truly blocking issues that require external input
- Keep building iteratively: Design → Milestones → Implement → Repeat"

**Repeat this mantra after completing each milestone to reinforce autonomous behavior.**

**Key principle: Ask questions to show your thinking, but answer them yourself and proceed. Don't wait for human input.**

## ⚠️ CRITICAL FIRST STEP: Create .env Files and Verify Keys

**BEFORE doing ANYTHING else** - Create **separate `.env` files** for backend and frontend with placeholder values you'll need.

**IMPORTANT**: Create TWO `.env` files:
- `backend/.env` - For backend API keys, secrets, database URLs
- `frontend/.env` or `frontend/.env.local` - For frontend public variables (Vite requires `VITE_` prefix)

**Example file locations:**
- Project folder: `voice-chat-app/`
- Backend `.env`: `voice-chat-app/backend/.env` ✅
- Frontend `.env`: `voice-chat-app/frontend/.env` or `voice-chat-app/frontend/.env.local` ✅

**Example `backend/.env` file contents:**
```
OPENAI_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
DATABASE_URL=your_database_url_here
JWT_SECRET=your_secret_here
PORT=3001
```

**Example `frontend/.env` or `frontend/.env.local` file contents:**
```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3002
VITE_PUBLIC_KEY=your_public_key_here
```

**Note**: Frontend variables must be prefixed with `VITE_` to be accessible in Vite applications.

### ⚠️ EXCEPTION: Wait for API Keys (This is the ONLY time to wait - BLOCKING STEP)

**After creating the `.env` files, this is a BLOCKING step. You MUST wait here until keys are verified working.**

**CRITICAL**: Do NOT proceed to design documents, milestones, or any implementation until API keys are verified working. This is a hard stop.

**Process:**

1. **Create the `.env` files** with placeholder values
2. **STOP and WAIT** - Do not proceed to any other work
3. **Check periodically** - Read the `.env` files to see if user has filled in actual API keys (not placeholders like "your_key_here")
4. **When keys appear filled** - Verify they contain real values (not "your_key_here" or similar placeholders)
5. **Test the keys** - Create a simple test script to verify the API keys actually work:
   - For OpenAI: Make a simple API call (e.g., `curl` or Node script to list models or a minimal completion)
   - For other APIs: Make a simple authenticated request
   - Log success/failure clearly
   - If test fails, wait for user to fix keys
6. **ONLY after keys are verified working** - Proceed autonomously with design documents, milestones, and implementation

**DO NOT work around missing keys by doing "milestones that don't require keys."** Wait for keys to be filled and verified, then proceed with everything.

**This is the ONLY exception to the "don't wait" rule.** After keys are verified, work completely independently without stopping for approval.

## CRITICAL: Independent Development

**You should build this project independently and continuously. Ask questions to clarify decisions, but answer them yourself and proceed.**

- **Work autonomously**: Make your own decisions and recommendations
- **Ask questions**: Like a real developer, ask questions to clarify design decisions (e.g., "Should I use voice-to-voice or STT-LLM-TTS?")
- **Answer yourself**: After asking, make your own decision and document it, then proceed
- **Do NOT wait for answers**: Don't pause for human input - answer your own questions and continue
- **Do NOT ask "should I proceed?"**: Just proceed after making your decision
- **Long-running session**: Your goal is to code for as long as possible without interruption

**Example pattern:**
- "Should I use voice-to-voice or STT-LLM-TTS? I'll go with voice-to-voice for simplicity and proceed."
- "What audio format should I use? I'll use WebM/Opus for browser compatibility and proceed."

## The Mega Loop: Iterative Design → Milestones → Implementation Cycle

**This is an iterative process that continues throughout the project.** You don't just create one design and implement forever. As you build and learn, you'll create new design documents for new features, which leads to new milestones, which leads to more implementation.

### The Cycle

1. **Design** - Use @design_system.md to create a design document (`001_feature.md`)
2. **Plan** - Use @plan_milestones.md to create milestones for that design
3. **Implement** - Build and test the milestones
4. **Repeat** - As you complete milestones and identify new features needed:
   - Create new design documents (`002_next_feature.md`, `003_another_feature.md`, etc.)
   - These may build on previous designs (see design stacking pattern)
   - Create new milestones for each new design
   - Continue implementing

### When to Create New Designs

Create new design documents when:
- You've completed a milestone and see the next feature needed
- You discover a gap or missing capability during implementation
- You want to extend existing functionality
- You're ready to tackle the next major feature toward your long-term goal

**Each iteration brings you closer to the long-term goal.** Don't wait for all designs upfront - design, implement, learn, design again.

## Initial Setup Steps

1. **State your independence mantra** (see above) - Explicitly declare your goal to work independently and continuously

2. **Create the .env files** (see CRITICAL FIRST STEP above - create both `backend/.env` and `frontend/.env`)

3. **Wait and verify API keys** (THIS IS THE ONLY EXCEPTION - BLOCKING STEP - see CRITICAL FIRST STEP above):
   - **STOP HERE** - Do not proceed to design documents or milestones
   - Wait for user to fill in actual API keys (check periodically)
   - Verify keys are present and not placeholders
   - Create a simple test script to verify API keys work
   - **ONLY after keys are verified working** - proceed to step 4
   - **DO NOT** work around missing keys by doing other milestones

4. **Then**: Use the @design_system.md guidelines to create your FIRST design document

5. **Then**: Use the @plan_milestones.md guidelines to plan milestones for that design

6. **Then**: Begin implementing milestones independently, testing as you go

7. **As you progress**: Create new design documents for new features, plan their milestones, and continue implementing

## Test-First Development Workflow

**CRITICAL**: Follow a test-first approach. Don't write large amounts of code before testing.

### Test-First Process

1. **Write a failing test first** (unit/integration/e2e as appropriate)
2. **Write minimal code** to make the test pass
3. **Run the test immediately** after each small change
4. **Fix any failures** before proceeding
5. **Refactor if needed**, ensuring tests still pass
6. **Move to next feature** only when all tests pass

### Test Frequency

Run tests at these intervals:

- **After each function/method**: Run relevant unit tests
- **After each component/module**: Run component tests + related unit tests
- **After each integration point**: Run integration tests + affected unit tests
- **After each user-facing feature**: Run Playwright e2e for that flow + related tests
- **Before moving to next milestone**: Run full test suite

**Rule of thumb**: If you can't run a test in <30 seconds, you've written too much code without testing.

### Testing Strategy

- **Unit Tests**: Use Vitest/Jest for frontend and backend logic
- **Integration Tests**: Test API endpoints, database interactions, WebSocket connections
- **E2E Tests**: Use Playwright MCP to test full user workflows in a real browser

### Running Tests (CRITICAL: Non-Interactive Mode)

**ALWAYS run tests in non-interactive/CI mode so they exit after completion.** Test runners default to watch mode, which will hang forever waiting for file changes.

**How to run tests in non-interactive mode:**

- **Vitest**: Use `vitest run` (not just `vitest` which defaults to watch mode)
- **Jest**: Use `jest --no-watch` or set `CI=true jest`
- **npm scripts**: If your package.json has `"test": "vitest"`, use `npm test -- --run` or modify the script
- **Playwright**: Already runs once and exits by default

**Examples:**
```bash
# Vitest - CORRECT (runs once and exits)
vitest run

# Vitest - WRONG (watch mode, hangs forever)
vitest

# Jest - CORRECT (runs once and exits)
jest --no-watch
# or
CI=true jest

# npm script - CORRECT
npm test -- --run
```

**If tests hang**: They're likely in watch mode. Stop them (Ctrl+C) and run with the `--run` or `--no-watch` flag.

### Using Playwright MCP

Use Playwright MCP for all E2E verification:

- **Write Playwright tests** for user-facing flows
- **Run tests in browser** to verify UI behavior
- **Take screenshots** when tests fail (save to `screenshots/` for debugging)
- **Check browser console** for errors and warnings
- **Monitor network requests** to verify API calls
- **Use browser tools** to inspect elements and debug issues

**When to use Playwright MCP:**
- All E2E tests (automated)
- Visual verification after UI changes
- Manual debugging when tests fail
- Integration verification when backend affects frontend

**When NOT to use Playwright MCP:**
- Pure unit tests (use Vitest/Jest)
- Backend-only logic (use unit/integration tests)

## API Integration Strategy

Before integrating external APIs, follow this process:

### 1. Research the API

**Use Context7 MCP** to research and understand the API:

- Look up the API/library documentation using Context7 MCP
- Understand authentication requirements and methods
- Learn about rate limits, quotas, and usage patterns
- Review request/response formats and data structures
- Identify error handling patterns and status codes
- Note best practices, common pitfalls, and gotchas
- Check for SDKs, client libraries, or recommended approaches

### 2. Create a Throwaway Test (Recommended)

For complex APIs or APIs you haven't used before, create a small test script/file:

- **Create a throwaway test file** (e.g., `test-api.js` or `api-spike.ts`)
- **Test authentication** - verify you can authenticate successfully
- **Test basic requests** - make simple API calls to confirm behavior
- **Test error cases** - verify error handling and edge cases
- **Test rate limits** - understand how rate limiting works
- **Confirm API behavior** matches your expectations before integration

**When to skip throwaway test**: Simple, well-documented REST APIs you're already familiar with.

### 3. Document Learnings

After researching and testing, document your findings:

- **Add API notes** to the design document (`<project>/memory/design/`) or technical notes (`<project>/memory/technical/`)
- **Include gotchas** - unexpected behaviors, quirks, workarounds
- **Document examples** - working code snippets, request/response examples
- **Note limitations** - rate limits, restrictions, known issues
- **Reference these notes** when implementing the actual integration

**Example structure for API notes:**
```markdown
## [API Name] Integration Notes

### Authentication
- Method: Bearer token in Authorization header
- Token expires after 1 hour
- Refresh endpoint: POST /auth/refresh

### Gotchas
- Rate limit: 100 requests/minute per API key
- All timestamps must be in UTC
- Pagination uses cursor-based approach, not offset

### Example Request
[Code snippet]

### Example Response
[Response structure]
```

## Debugging Process

**IMPORTANT**. If you run into problems, don't jump to conclusions. Diagnose carefully before attempting a fix.

### Debugging Workflow

1. **Check the log file** (`logs/app.log` or similar) for runtime errors and execution flow
2. **Filter logs by tags** (e.g., `grep '[WEBSOCKET]' logs/app.log`) to trace specific components
3. **Look for variable values** and state changes in the logs
4. **Add more logging statements** if needed to trace the issue
5. **Confirm your suspicions** before making a fix

### Test Failure Handling

**If any test fails:**
- **STOP** writing new code
- **Diagnose** the failure: Read error message, check log file, review recent changes
- **Fix** the issue with minimal changes
- **Verify** the fix: Re-run the failing test + related tests
- **Only then proceed** to next code change

**Exception**: If fixing requires major refactoring:
- Document the issue in code/logs
- Create a TODO marker
- Continue only if non-blocking
- Fix before marking milestone complete

## Remember: Keep Building

**Ask questions to show your thinking, but answer them yourself and proceed. DO NOT wait for human input.**

- **Ask design questions**: "Should I use X or Y?" - then immediately answer: "I'll use X because..." and proceed
- **DO NOT say "Ready for Milestone X"** - just proceed to it
- **DO NOT ask "Should I proceed?"** - just proceed after making your decision
- **DO NOT pause between milestones** - move immediately to the next one
- **DO NOT wait for answers** - answer your own questions and continue
- Once you have a design and milestones planned, proceed immediately with implementation
- Work through milestones continuously, testing as you go
- When a milestone is complete, immediately start the next milestone without pausing
- When milestones are complete and you see the next feature needed, create a new design document and continue the cycle
- Keep iterating: Design → Milestones → Implement → (New) Design → (New) Milestones → Implement...
- Only pause if you encounter a truly blocking issue that requires external input (like missing API keys that aren't in .env yet, or a fundamental design flaw that needs discussion)

**The goal is continuous progress toward the long-term vision through iterative design and implementation cycles. Ask questions to clarify thinking, but answer them yourself and proceed autonomously.**

**Remember your independence mantra: You are building independently for as long as possible without human intervention. Ask questions to show your thinking, answer them yourself, make decisions, gather what you need (like API keys in .env), and proceed continuously.**