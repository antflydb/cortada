# Post-V1 answer-engine providers

V1 intentionally uses deterministic analysis only. Antfly is the application backend and evidence engine; no external LLM credential is required.

## V1.1: Provider interface

Introduce a server-only interface:

```ts
interface AnswerEngine {
  id: string;
  answer(prompt: string): Promise<{
    text: string;
    citations: Array<{ title?: string; url: string }>;
    observedAt: string;
  }>;
}
```

Add adapters independently so deployments can choose providers without changing the Antfly document model.

## V1.2: Initial adapters

1. OpenAI Responses API
2. Anthropic Messages API
3. Perplexity API

Every adapter must implement bounded timeouts, rate-limit handling, redacted errors, and provider-specific citation normalization. Credentials stay server-side.

## V1.3: Monitoring

- Store each provider response as an immutable Antfly observation.
- Detect brand and competitor mentions deterministically.
- Keep raw response, normalized citations, provider/model metadata, and timing together.
- Use Vercel Cron for bounded scheduled batches with idempotent run IDs.
- Retrieve source evidence from Antfly before generating recommendations.

## Explicit non-goals

- Automating consumer AI websites with browser sessions
- Claiming that API answers exactly reproduce consumer-product answers
- Hiding provider or model identity from the user
- Requiring all providers for a successful deployment
