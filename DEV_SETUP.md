# Dev Setup Guide

This guide covers setting up PolitiChat from scratch on Windows 11 with VS Code. Follow steps in order.

---

## Prerequisites

- Windows 11
- VS Code
- Node.js v22+ (download from nodejs.org, use the LTS installer)
- Python 3.10+ (download from python.org, check "Add to PATH" during install)
- Git (download from git-scm.com)

### Verify installs

```powershell
node -v
npm -v
python --version
git --version
```

### Recommended VS Code Extensions

- ESLint
- Prettier
- GraphQL: Language Feature Support

---

## 1. Clone the repo

```powershell
git clone https://github.com/yourusername/politichat.git
cd politichat
```

---

## 2. Set up Supabase

- Create a free account at supabase.com
- Create a new project
- Go to SQL Editor and run the following:

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

- Go to Settings > API Keys to get your Project URL and service role key
- Your Project URL follows the format: `https://yourprojectid.supabase.co`

---

## 3. Configure environment variables

Create `backend/.env` (never commit this file):

```
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

Your OpenAI project must have access to these models:
- `text-embedding-3-small`
- `gpt-4o-mini`

Add credits at platform.openai.com if you get a 429 quota error.

---

## 4. Install backend dependencies

```powershell
cd backend
npm install
```

---

## 5. Set up Python environment and run ingestion

```powershell
cd ..\scripts
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python ingest.py
```

### Expected output (first run)

```
Verifying OpenAI API...
OpenAI API OK
Ingesting Bernie Sanders...
Done — 34 chunks inserted
Ingesting Donald Trump...
Done — 26 chunks inserted
Ingesting Ron Paul...
Done — 17 chunks inserted
Ingesting Alexandria Ocasio-Cortez...
Done — 25 chunks inserted
Ingestion complete
```

### Expected output (subsequent runs — idempotent)

```
Verifying OpenAI API...
OpenAI API OK
Ingesting Bernie Sanders...
Skipping Bernie Sanders — already exists
Ingesting Donald Trump...
Skipping Donald Trump — already exists
Ingesting Ron Paul...
Skipping Ron Paul — already exists
Ingesting Alexandria Ocasio-Cortez...
Skipping Alexandria Ocasio-Cortez — already exists
Ingestion complete
```

---

## 6. Start the backend

Open a new terminal tab in VS Code (`Ctrl+~` then the `+` button):

```powershell
cd backend
npm run dev
```

Expected output:
```
Server running at http://localhost:4000/
```

Visit http://localhost:4000 — Apollo Sandbox should open.

---

## 7. Install and start the frontend

Open another new terminal tab:

```powershell
cd frontend
npm install
npm run dev
```

Expected output:
```
VITE ready in Xms
Local: http://localhost:5173/
```

Visit http://localhost:5173 — the app should load.

---

## 8. Verify end to end

1. Type "Bernie" in the search bar and hit Enter
2. Click the Bernie Sanders result
3. Type "What does Bernie believe about healthcare?" and hit Enter
4. You should receive a grounded answer with a Wikipedia source citation

---

## Running terminals summary

You need 2 terminals running simultaneously:
- Terminal 1: `backend/` running `npm run dev`
- Terminal 2: `frontend/` running `npm run dev`

The Python venv in `scripts/` only needs to be active when running ingestion scripts.

---

## AWS CLI Setup (required for Phase 3+)

Not yet configured. Install from: https://aws.amazon.com/cli/

After installing:
```powershell
aws configure
```

You will need an AWS account with IAM credentials. See TODO.md Phase 3 for details.

---

## Troubleshooting

**Apollo Client useLazyQuery import error**
Make sure `@apollo/client` is pinned to v3. Run `npm list @apollo/client` in the frontend directory. If it shows v4, run `npm install @apollo/client@3`.

**OpenAI 403 model not found**
Your OpenAI project does not have access to the required models. Go to platform.openai.com, open your project settings, and add `text-embedding-3-small` and `gpt-4o-mini` to the allowed models list.

**OpenAI 429 quota exceeded**
Add billing credits at platform.openai.com/settings/organization/billing.

**Duplicate politicians in Supabase**
Run this in the Supabase SQL editor to wipe and start fresh:
```sql
truncate table chunks cascade;
truncate table sources cascade;
truncate table politicians cascade;
```
Then rerun `python ingest.py`.
