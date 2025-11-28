# Design System

For the feature or bug in question, create a design document using the template below.

Save the design using incrementing numbers like the following: <project>/memory/design/001_some_feature.md.

**This is part of an iterative cycle**: Design → Milestones → Implement → (New) Design → (New) Milestones → Implement. Create new design documents as you identify new features needed during implementation. Each design brings you closer to the long-term goal.

**Important:** This is a design document, not an implementation plan. Focus on:
  - **What** we're building and **why** (the problem and solution)
  - **How** the system will work (architecture, data flow, user experience)
  - **Not** when we'll build it, implementation milestones, or specific tickets. Do not include code in this document.

Think scenario-first: understand the user journey and data flow before jumping to components.

## Design Document Stacking Pattern

**Designs often build on each other.** As you create new design documents, they may stack on top of previous ones:

- **001_core_feature.md** - Foundation design
- **002_extension_feature.md** - Builds on 001
- **003_enhancement.md** - Builds on 001 and 002

**When creating a design that builds on previous designs:**

1. **Explicitly reference previous designs** in the Metadata section
2. **Read and understand previous designs** before creating new ones
3. **Document dependencies** - explain how this design extends or modifies previous ones
4. **Maintain consistency** - ensure new designs align with architectural decisions from previous designs
5. **When implementing**, reference ALL relevant design documents, not just the latest one

**Example Metadata with dependencies:**
```markdown
## Metadata
- **Status:** Draft
- **Depends on:** `001_core_feature.md`, `002_extension_feature.md`
- **Extends:** Core authentication system from 001
- **Created:** 2024-01-15
- **Updated:** 2024-01-15
```

This helps maintain context and ensures designs work together cohesively.

# [Feature/Component Name] Design Document

## Metadata
- **Status:** [Draft | In Review | Approved]
- **Depends on:** [List any previous design documents this builds on, e.g., `001_core_feature.md`]
- **Extends:** [Brief description of what from previous designs this extends]
- **Author(s):** 
- **Reviewers:** 
- **Created:** 
- **Updated:** 

## Overview
<!-- What problem are we solving and why now? (2-3 paragraphs max) -->

## Goals

## User Scenario & Data Flow

### Core Scenario
<!-- Describe the primary user scenario this feature addresses. Be concrete and specific.
     Use a real person/role and walk through their actual needs. -->

**Example:** "Sarah (Operations Manager) needs to review a completed call to verify that the agent captured all required delivery details before authorizing equipment shipment."

### Step-by-Step Sequence
<!-- Walk through what happens step by step from the user's perspective.
     Include both user actions and system responses. -->

1. **User initiates action:** 
2. **System responds:** 
3. **User takes next step:** 
4. **System processes:** 
5. **Final state:** 

### Data Flow Diagram
<!-- Show how data moves through the system for this scenario.
     Can be ASCII art, Mermaid, or a simple box-and-arrow sketch. -->

```
[User] → [Component A] → [Database]
                ↓
          [Component B] → [External Service]
                ↓
          [Component C] → [User sees result]
```

### Components Identified from Flow
<!-- Now that we understand the user scenario and data flow, what components do we actually need?
     These should emerge naturally from the sequence above. List only what's necessary. -->

- **Component A:** [Why needed based on scenario]
- **Component B:** [Why needed based on scenario]
- **Component C:** [Why needed based on scenario]

## Proposed Solution

### High-Level Approach
<!-- 2-3 paragraphs explaining the core solution and architectural approach -->

### Architecture Diagram
<!-- Boxes and arrows diagram showing component interaction and system boundaries -->
```
[Diagram here - can be ASCII, Mermaid, or embedded image]
```

## Design Considerations

### External API Integration

If this feature involves external APIs, document:

- **API Research**: Use Context7 MCP to research the API before design finalization
- **Authentication Method**: How will we authenticate with the API?
- **Rate Limits**: What are the rate limits and how will we handle them?
- **Error Handling**: How should we handle API errors and retries?
- **Data Format**: What data formats does the API expect/return?
- **Testing Strategy**: Will we create a throwaway test to verify API behavior?

**Note**: Consider creating a throwaway test script to verify API behavior before finalizing the design. Document findings in this design doc or technical notes.

### 1. [Design Choice Name]
**Context:** <!-- Why this decision matters -->

**Options:**
- **Option A:** 
  - Pros: 
  - Cons: 
- **Option B:** 
  - Pros: 
  - Cons: 
- **Option C:** 
  - Pros: 
  - Cons: 

**Recommendation:** <!-- What we're choosing and why -->

### 2. [Design Choice Name]
**Context:** 

**Options:**
- **Option A:** 
  - Pros: 
  - Cons: 
- **Option B:** 
  - Pros: 
  - Cons: 

**Recommendation:** 

## Detailed Design
<!-- This section specifies WHAT the system will look like, not HOW to build it.
     Include schemas, API contracts, UI mockups - the "blueprints" of the system. -->

### Data Model
<!-- What data structures and relationships are needed? -->

```sql
-- Example table or schema changes
CREATE TABLE example (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    ...
);
```

### API Contracts
<!-- What are the API endpoints and their contracts? -->

#### `POST /api/v1/[endpoint]`
**Request:**
```json
{
  "field1": "value",
  "field2": 123
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "status": "success",
  "data": {}
}
```

**Error Response (4xx/5xx):**
```json
{
  "error": "error_code",
  "message": "Human readable message"
}
```

#### `GET /api/v1/[endpoint]/{id}`
**Response (200 OK):**
```json
{
  "id": "uuid",
  "field1": "value",
  "field2": 123
}
```

### User Interface Design
<!-- Screenshots, mockups, wireframes, or descriptions of UI changes -->

- **Screen/Component:** 
- **User flow:** 
- **Key interactions:** 
- **Visual design notes:**

## Testing Strategy

Consider how this feature will be tested:

- **What user scenarios need E2E tests?** (Use Playwright MCP for browser-based testing)
- **What components need unit tests?** (Functions, utilities, pure logic)
- **What integrations need integration tests?** (API endpoints, database, external services)
- **How will we verify this feature works end-to-end?** (Full user flow from UI to backend)

**Example:**
- E2E: User can complete login flow and see dashboard
- Integration: Login API validates credentials and returns session token
- Unit: Email validation function handles edge cases correctly

## Open Questions
