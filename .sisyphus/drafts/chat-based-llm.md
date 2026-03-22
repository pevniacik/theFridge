# Draft: Chat-Based LLM Integration (No API Keys)

## Requirements (confirmed)
- User does NOT want API key integration
- User wants to use standard subscription-based chat interfaces (claude.ai, chatgpt.com, etc.)
- User already pays for these subscriptions and doesn't want separate API billing

## Technical Reality
- claude.ai, chatgpt.com, gemini.google.com do NOT expose programmatic APIs for their chat subscriptions
- API access (what we have now) and chat subscriptions are separate products/billing
- There is no OAuth or token-based way to make API calls using a chat subscription login
- The web chat interfaces block automated/programmatic access (CORS, CSP, anti-bot)

## Possible Approaches
1. **Guided copy-paste workflow**: App prepares prompt + image → user copies to chat → pastes response back
2. **Local LLM (Ollama)**: Runs on same machine, no API key, no subscription, completely free
3. **Google AI Studio free tier**: Uses Google login, generous free limits, already works with our Google provider
4. **Hybrid**: Keep API option for power users, add guided-chat as the default free path

## Decisions Made
- **Chosen approach**: Google AI Studio free tier
- User wants automatic flow (no manual copy-paste)
- Google AI Studio uses Google account login, generous free limits, no separate API billing
- This means: simplify settings to default to Google provider, make Google API key setup prominent and easy
- Remove OpenAI/Anthropic as default choices (can keep as advanced/hidden option or remove entirely)

## Additional Decisions
- **Settings layout**: Google is default/primary. OpenAI and Anthropic hidden behind "Advanced" toggle.
- **Onboarding banner**: Show gentle setup prompt on fridge page when no provider is configured → links to settings
- Google AI Studio free key is acceptable (1-click from Google account)

## Scope Boundaries
- INCLUDE: Settings UI restructure, onboarding banner, Google as default
- EXCLUDE: No removal of OpenAI/Anthropic code/providers (keep behind advanced toggle), no chat-based workflow, no local LLM
