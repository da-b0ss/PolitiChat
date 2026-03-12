# PolitiChat

A full-stack RAG-powered web app where users search politicians and ask natural language questions, receiving LLM-generated answers grounded in real sourced documents with citations.

## Tech Stack

- **Frontend:** React + Apollo Client (GraphQL)
- **Backend:** Apollo Server (Node.js) + GraphQL
- **Database:** Supabase (Postgres + pgvector)
- **Embeddings:** OpenAI `text-embedding-3-small`
- **LLM:** OpenAI `gpt-4o-mini`
- **Ingestion:** Python + Wikipedia API

## How It Works

1. Wikipedia articles are fetched, chunked into ~500 word segments, and embedded via OpenAI
2. Embeddings are stored in Supabase using pgvector
3. When a user asks a question, it gets embedded and a semantic similarity search retrieves the top 5 most relevant chunks
4. Those chunks are passed as context to the LLM which generates a grounded answer with citations
5. Everything is served through a GraphQL API

## Project Structure

```
PolitiChat/
  backend/
    src/
      db/supabase.js          # Supabase client
      resolvers/resolvers.js  # GraphQL resolvers
      schema/typeDefs.js      # GraphQL schema
      services/rag.js         # Embedding, retrieval, LLM call
    index.js                  # Apollo Server entry
    .env
    package.json
  frontend/
    src/
      App.jsx                 # Main UI component
      main.jsx                # Apollo Client setup
    package.json
  scripts/
    ingest.py                 # Wikipedia ingestion pipeline
    requirements.txt
```

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

## Database Schema

```sql
politicians (id, name, party, bio)
sources    (id, politician_id, title, url, date)
chunks     (id, source_id, content, embedding vector(1536))
```

## Setup

### Prerequisites

- Node.js v22+
- Python 3.10+
- Supabase account (free tier works)
- OpenAI API key with credits

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/politichat.git
cd politichat
```

### 2. Set up Supabase

In the Supabase SQL editor, run:

```sql
create extension if not exists vector;

create table politicians (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  party text,
  bio text
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  politician_id uuid references politicians(id),
  title text,
  url text,
  date text
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id),
  content text,
  embedding vector(1536)
);

create or replace function match_chunks(
  query_embedding vector(1536),
  politician_id uuid,
  match_count int
)
returns table(id uuid, content text, source_id uuid)
language sql
as $$
  select c.id, c.content, c.source_id
  from chunks c
  join sources s on c.source_id = s.id
  where s.politician_id = match_chunks.politician_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
```

### 3. Configure environment variables

Create `backend/.env`:

```
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
```

### 4. Install backend dependencies

```bash
cd backend
npm install
```

### 5. Run the ingestion script

```bash
cd scripts
python -m venv venv
.\venv\Scripts\activate   # Windows
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
python ingest.py
```

The script will verify the OpenAI API is working before touching the database, and will skip politicians that have already been ingested.

### 6. Start the backend

```bash
cd backend
npm run dev
# GraphQL API running at http://localhost:4000
```

### 7. Install and start the frontend

```bash
cd frontend
npm install
npm run dev
# App running at http://localhost:5173
```

## Adding More Politicians

Edit the `POLITICIANS` list in `scripts/ingest.py` and rerun the script. Already-ingested politicians will be skipped automatically.

```python
POLITICIANS = [
  {'name': 'Bernie Sanders', 'party': 'Democrat'},
  {'name': 'Donald Trump', 'party': 'Republican'},
  {'name': 'Ron Paul', 'party': 'Republican'},
  {'name': 'Alexandria Ocasio-Cortez', 'party': 'Democrat'},
  # Add more here
]
```

## Roadmap

- [ ] Streaming LLM responses
- [ ] More data sources beyond Wikipedia (speeches, voting records)
- [ ] 2D ideological vector map using PCA on politician embeddings
- [ ] CI/CD via GitHub Actions
- [ ] Docker + Kubernetes deployment on AWS EKS