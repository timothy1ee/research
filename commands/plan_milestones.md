# Plan Milestones

Reference the relevant design document(s), and create or update a doc in the `<project>/memory/milestones` directory, following the naming convention: `001_xxx_milestones.md`.

**If designs stack on each other** (e.g., 001 builds foundation, 002 extends it), reference ALL relevant design documents, not just the latest one. Read and understand the full design stack before planning milestones.

Create a series of milestones to implement the design. The milestones should implement the design in an iterative, progressive way, so that we can verify and test along the way.

When ordering the milestones, build the UI with mocks first. UI is less error-prone, and makes it easier to end-to-end test or integration test as the backend elements are built.

## External API Integration

When milestones involve integrating external APIs:

1. **Research the API first** using Context7 MCP (see `@build_project.md` for API Integration Strategy)
2. **Create a throwaway test** to verify API behavior (recommended for complex APIs)
3. **Document findings** in design doc or `<project>/memory/technical/` directory
4. **Reference API notes** when implementing the actual integration

This prevents costly mistakes and ensures you understand the API before building on top of it.

## Test-First Milestone Implementation

**CRITICAL**: For each milestone, follow a test-first approach:

1. **Write tests FIRST** (unit/integration/e2e as appropriate)
2. **Implement code** to make tests pass
3. **Run tests after EACH small change** - Use non-interactive mode (see `@build_project.md` Testing Strategy)
4. **Use Playwright MCP** to verify UI behavior in real browser
5. **Only mark milestone complete** when ALL tests pass

**IMPORTANT**: Always run tests in non-interactive mode (`vitest run`, `jest --no-watch`, etc.) so they exit after completion. Watch mode will hang forever.

### Test Plan Structure

Each milestone should specify:

- **Unit Tests**: [What functions/components to test]
- **Integration Tests**: [What integrations to test]
- **E2E Tests (Playwright)**: [What user flows to test]
- **Test Execution**: Run tests after each implementation step

**Example:**
```markdown
### Milestone 1: User Authentication

**Test Plan:**
- [ ] Unit tests: `validateEmail()`, `validatePassword()` functions
- [ ] Integration tests: Login API endpoint with valid/invalid credentials
- [ ] E2E tests (Playwright): Complete login flow from UI
- [ ] Test execution: Run tests after each function/component implementation
```

## Runtime Logging (Audit Trail)

During development, add verbose logging throughout your code:

- **Use structured logger** with tags: `[WEBSOCKET]`, `[AUDIO]`, `[AGENT]`, `[API]`, `[ERROR]`, etc.
- **Log key decision points**: Function entry/exit, conditionals, state changes
- **Log variable values**: Important data at critical points (but not sensitive info like API keys or tokens)
- **Log to file**: `logs/app.log` (or similar) to avoid polluting context
- **Make logs filterable**: Use consistent tag format so you can grep/filter by component

**Example:**
```typescript
logger.info('[WEBSOCKET] Connection established', { sessionId, agentId });
logger.info('[AGENT] Routing audio chunk', { sessionId, chunkSize, agentType });
logger.debug('[AUDIO] Processing audio data', { format, sampleRate });
logger.error('[ERROR] Failed to process audio', { error: error.message, sessionId });
```

### What to Log

- Function entry/exit with parameters (for complex functions)
- State changes (agent registration, session start/end, etc.)
- External API calls (request/response summaries, not full payloads)
- Error conditions and recovery attempts
- Key decision points (routing logic, conditionals)

### What NOT to Log

- Sensitive data (API keys, tokens, PII, passwords)
- High-frequency events without throttling (e.g., every audio chunk)
- Trivial operations (simple getters/setters)

### Tag Naming Convention

- Use consistent format: `[COMPONENT]` or `[COMPONENT:SUBSYSTEM]`
- Examples: `[WEBSOCKET]`, `[AGENT:ROUTER]`, `[AUDIO:PROCESSOR]`, `[API:OPENAI]`

### Log Levels

- `logger.error()` - Always log, never disable
- `logger.warn()` - Important warnings, keep in production
- `logger.info()` - Key events, reduce after milestone
- `logger.debug()` - Verbose details, disable after milestone

### After Milestone Completion

- Review logs to ensure they're useful for debugging
- Reduce verbosity or disable debug-level logs
- Keep error and important info logs active

## Milestone Completion

Create checkboxes like `[ ]`, so we can track completion.

**Before marking a milestone complete:**
- [ ] All tests pass (unit, integration, e2e)
- [ ] Full test suite runs successfully
- [ ] Logs reviewed and verbosity reduced appropriately
- [ ] No blocking issues or TODOs remaining

**After completing a milestone:**
- **State your independence mantra** (see @build_project.md) to reinforce autonomous behavior
- **DO NOT stop or ask for permission to proceed**
- **DO NOT say "Ready for Milestone X" or "Should I proceed?"**
- **Ask questions if needed** - but answer them yourself and proceed
- **Immediately proceed to the next milestone** without pausing
- **Continue the implementation cycle** - design, plan, implement, repeat
- **Work continuously** until all milestones are complete or you encounter a truly blocking issue

**Example mantra restatement after milestone:**
"I am working independently. Milestone X is complete. I will immediately proceed to Milestone Y without stopping for approval. If I have design questions, I'll ask them, answer them myself, and continue building autonomously."