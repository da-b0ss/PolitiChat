# Scripts

All scripts are Python and must be run from the `scripts/` directory with the virtual environment active.

## Setup

```powershell
cd scripts
python -m venv venv
.\venv\Scripts\activate        # Windows
source venv/bin/activate       # Mac/Linux
pip install -r requirements.txt
```

Your terminal should show `(venv)` at the start of the line when the environment is active.

---

## ingest.py

Fetches Wikipedia articles for each politician in the `POLITICIANS` list, chunks the text, embeds each chunk, and stores everything in Supabase.

**Run:**
```powershell
python ingest.py
```

**Expected output (first run):**
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

**Expected output (subsequent runs — safe to rerun):**
```
Verifying OpenAI API...
OpenAI API OK
Ingesting Bernie Sanders...
Skipping Bernie Sanders — already exists
...
Ingestion complete
```

**Safety features:**
- Verifies OpenAI API is working before touching the database. Exits immediately if the API is unavailable or has no credits.
- Checks if a politician already exists before inserting. Safe to rerun at any time.

**To add more politicians:** Edit the `POLITICIANS` list at the top of the file and rerun.

**To wipe and re-ingest from scratch:** Run the following in Supabase SQL Editor, then rerun the script:
```sql
truncate table chunks cascade;
truncate table sources cascade;
truncate table politicians cascade;
```

---

## test_embeddings.py

*(Added in Phase 1)* Verifies the local HuggingFace embedding model is working correctly.

**Run:**
```powershell
python test_embeddings.py
```

**Expected output:**
```
Embedding shape: (384,)
OK
```

---

## test_ner.py

*(Added in Phase 2)* Verifies spaCy NER entity extraction is working correctly.

**Run:**
```powershell
python test_ner.py
```

**Expected output:** A list of extracted entities with their types (PERSON, ORG, GPE, DATE).

---

## test_sagemaker.py

*(Added in Phase 4)* Verifies connectivity to the deployed AWS SageMaker endpoint.

**Run:**
```powershell
python test_sagemaker.py
```

**Expected output:**
```
SageMaker endpoint response shape: (384,)
OK
```

**Prerequisites:** AWS CLI configured, SageMaker endpoint deployed via `terraform apply` in Phase 3.
