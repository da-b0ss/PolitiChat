# Technical Decisions

A running log of technical decisions made in this project and the reasoning behind them. This file exists so future contributors and AI assistants do not undo deliberate choices.

---

## Database: Supabase over Pinecone or other vector DBs

Supabase gives us Postgres + pgvector in one free-tier service. Using a dedicated vector DB like Pinecone would mean managing a second service, a second set of credentials, and a second billing account. Since our data is relational (politicians have sources, sources have chunks), keeping everything in Postgres is cleaner and cheaper. pgvector handles cosine similarity search well at our scale.

## GraphQL over REST

The frontend needs to fetch politicians, search by name, and trigger a multi-step RAG pipeline in a single request. GraphQL lets us express this as a typed schema with a single endpoint. It also makes the API self-documenting via Apollo Sandbox, which is useful during development.

## Apollo Server + Apollo Client over alternatives

Apollo Server (Node.js) and Apollo Client (React) are the most widely documented GraphQL pairing. Given this is a learning project, sticking to the mainstream choice reduces time spent on docs and debugging edge cases.

## Apollo Client v3 (not v4)

Apollo Client v4 changed its export API and broke `useLazyQuery` imports in Vite. We explicitly pinned to v3 to avoid this. Do not upgrade to v4 without verifying the import API has stabilized.

## OpenAI text-embedding-3-small over ada-002

`text-embedding-3-small` is cheaper and more performant than the older `ada-002` model. Both produce 1536-dimensional vectors compatible with pgvector.

## OpenAI gpt-4o-mini over Claude or Gemini

Cost efficiency. gpt-4o-mini is cheap enough that the entire RAG pipeline (embed + retrieve + generate) costs fractions of a cent per query. Claude API is also available (key is in .env) and can be swapped in if needed.

## Python for ingestion over Node.js

The HuggingFace `sentence-transformers` library and `spaCy` are Python-only. Starting the ingestion pipeline in Python from the beginning avoids a rewrite later when those libraries are introduced in Phase 1 and Phase 2.

## Chunking strategy: 500 words, 50 word overlap

Simple word-count chunking with overlap preserves context at chunk boundaries. More sophisticated chunking (sentence-aware, semantic) can be introduced later. 500 words fits comfortably within embedding model token limits.

## Vite over Create React App

CRA is deprecated. Vite is faster and actively maintained.

## JavaScript over TypeScript for frontend

Kept simple intentionally. TypeScript can be introduced later once the project is stable.

## Local Terraform state (no remote backend yet)

Terraform state is stored locally in `terraform/terraform.tfstate` for simplicity. Before any team collaboration or CI/CD integration, this should be migrated to an S3 backend with DynamoDB locking.

---

## Things deliberately NOT done

- No authentication — this is a public read-only app for now
- No rate limiting on the GraphQL endpoint — add before any public deployment
- No streaming LLM responses — the UX shows a loading state then the full answer; streaming can be added via GraphQL subscriptions later
- No Docker yet — local dev runs Node and Python processes directly; Docker is planned as part of the AWS deployment phase
