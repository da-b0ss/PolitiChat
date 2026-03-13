# PolitiChat Architecture

## Overview

PolitiChat is a full-stack RAG (Retrieval Augmented Generation) web app. Users search for politicians and ask natural language questions, receiving LLM-generated answers grounded in real sourced documents with citations.

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite | Fast dev setup, component-based UI |
| GraphQL Client | Apollo Client v3 | Pairs with Apollo Server, handles caching |
| GraphQL Server | Apollo Server (Node.js) | Simple schema-first API layer |
| Database | Supabase (Postgres + pgvector) | Free tier, built-in vector search, no separate vector DB needed |
| Embeddings | OpenAI text-embedding-3-small | High quality, 1536 dimensions |
| LLM | OpenAI gpt-4o-mini | Cost efficient, good quality answers |
| Ingestion | Python + wikipedia-api | Simple scraping, good Wikipedia coverage |

## Data Flow: User Query

```
USER
  │
  │  types "What does Bernie believe about healthcare?"
  ▼
REACT FRONTEND (localhost:5173)
  │
  │  Apollo Client sends GraphQL query:
  │  askQuestion(question, politicianId)
  ▼
APOLLO SERVER (localhost:4000)
  │
  │  resolver receives the query
  ▼
RAG SERVICE (rag.js)
  │
  ├─ 1. EMBED QUESTION
  │     OpenAI text-embedding-3-small
  │     "What does Bernie believe..." → [0.023, -0.841, 0.412, ...] (1536 floats)
  │
  ├─ 2. VECTOR SEARCH
  │     pgvector runs cosine similarity search in Supabase
  │     query embedding <=> stored chunk embeddings
  │     returns top 5 most relevant chunks from Bernie's Wikipedia article
  │
  ├─ 3. BUILD PROMPT
  │     stuffs the 5 chunks into a prompt as context
  │     "Answer using only the context below: ..."
  │
  └─ 4. LLM CALL
        OpenAI gpt-4o-mini generates a grounded answer
        returns answer text
  │
  ▼
APOLLO SERVER
  │
  │  fetches source metadata (title, url) for the retrieved chunks
  │  packages { answer, sources } as GraphQL response
  ▼
REACT FRONTEND
  │
  │  renders answer text + source citation cards
  ▼
USER
     reads: "Bernie Sanders advocates for universal single-payer healthcare..."
     sees source: "Bernie Sanders - Wikipedia"
```

## Data Flow: Ingestion (runs offline, not part of user request)

```
WIKIPEDIA API
  │
  │  fetch full article text
  ▼
ingest.py
  │
  ├─ verify OpenAI API is working (exit early if not)
  ├─ check if politician already exists in DB (skip if so)
  ├─ chunk text into ~500 word segments with 50 word overlap
  ├─ embed each chunk via OpenAI text-embedding-3-small
  └─ insert politician + source + chunks into Supabase
  ▼
SUPABASE (postgres + pgvector)
  │
  sits at rest until a user query triggers a vector search
```

## Database Schema

```sql
politicians (id uuid, name text, party text, bio text)

sources (id uuid, politician_id uuid, title text, url text, date text)

chunks (id uuid, source_id uuid, content text, embedding vector(1536))
```

Vector search is handled by a Supabase RPC function `match_chunks` using pgvector cosine similarity (`<=>`).

## GraphQL Schema

```graphql
type Politician {
  id: ID!
  name: String!
  party: String
  bio: String
}

type Source {
  id: ID!
  title: String!
  url: String
}

type Answer {
  answer: String!
  sources: [Source!]!
}

type Query {
  searchPolitician(name: String!): [Politician!]!
  askQuestion(question: String!, politicianId: ID!): Answer!
}
```

## Project Structure

```
PolitiChat/
  backend/
    src/
      db/supabase.js          # Supabase client init
      resolvers/resolvers.js  # GraphQL resolvers
      schema/typeDefs.js      # GraphQL type definitions
      services/rag.js         # Embed, retrieve, LLM call
    index.js                  # Apollo Server entry point
    .env                      # Environment variables (not committed)
    package.json
  frontend/
    src/
      App.jsx                 # Main UI — search, chat, citations
      main.jsx                # Apollo Client setup + React root
    package.json
  scripts/
    ingest.py                 # Ingestion pipeline
    requirements.txt          # Python dependencies
    venv/                     # Python virtual environment (not committed)
  ARCHITECTURE.md
  DECISIONS.md
  DEV_SETUP.md
  TODO.md
  README.md
```

## Planned Architecture Extensions (see TODO.md)

- Phase 1: Swap OpenAI embeddings for local HuggingFace model (all-MiniLM-L6-v2, 384 dims)
- Phase 2: Add spaCy NER entity extraction to ingestion and UI
- Phase 3: Terraform IaC for AWS SageMaker endpoint
- Phase 4: Route embeddings through SageMaker with --use-sagemaker flag
