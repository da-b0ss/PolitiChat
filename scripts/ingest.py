import wikipediaapi
import os
import spacy
from sentence_transformers import SentenceTransformer
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('../backend/.env')

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])
wiki = wikipediaapi.Wikipedia('politician-rag/1.0', 'en')

# Verify embedding model loads before touching the database
print("Loading embedding model...")
try:
  model = SentenceTransformer('all-MiniLM-L6-v2')
  test = model.encode('test')
  assert test.shape == (384,)
  print("Embedding model OK")
except Exception as e:
  print(f"Embedding model failed: {e}")
  exit(1)

# Load spaCy NER model
print("Loading NER model...")
try:
  nlp = spacy.load('en_core_web_sm')
  print("NER model OK")
except Exception as e:
  print(f"NER model failed: {e}")
  exit(1)

POLITICIANS = [
  {'name': 'Bernie Sanders', 'party': 'Democrat'},
  {'name': 'Donald Trump', 'party': 'Republican'},
  {'name': 'Ron Paul', 'party': 'Republican'},
  {'name': 'Alexandria Ocasio-Cortez', 'party': 'Democrat'},
]

NER_LABELS = {'PERSON', 'ORG', 'GPE', 'DATE'}

def chunk_text(text, size=500, overlap=50):
  words = text.split()
  chunks = []
  for i in range(0, len(words), size - overlap):
    chunk = ' '.join(words[i:i+size])
    chunks.append(chunk)
  return chunks

def embed(text):
  return model.encode(text).tolist()

def extract_entities(text):
  doc = nlp(text)
  seen = set()
  entities = []
  for ent in doc.ents:
    if ent.label_ in NER_LABELS:
      key = (ent.text, ent.label_)
      if key not in seen:
        seen.add(key)
        entities.append({'text': ent.text, 'label': ent.label_})
  return entities

for p in POLITICIANS:
  print(f"Ingesting {p['name']}...")

  # Check if politician already exists
  existing = supabase.table('politicians').select('*').eq('name', p['name']).execute().data
  if existing:
    print(f"Skipping {p['name']} — already exists")
    continue

  # Insert politician
  page = wiki.page(p['name'])
  pol = supabase.table('politicians').insert({
    'name': p['name'], 'party': p['party'], 'bio': page.summary
  }).execute().data[0]

  # Insert source
  source = supabase.table('sources').insert({
    'politician_id': pol['id'],
    'title': f"{p['name']} - Wikipedia",
    'url': page.fullurl
  }).execute().data[0]

  # Extract entities from full article text before chunking
  entities = extract_entities(page.text)

  # Chunk, embed, insert
  chunks = chunk_text(page.text)
  for chunk in chunks:
    embedding = embed(chunk)
    supabase.table('chunks').insert({
      'source_id': source['id'],
      'content': chunk,
      'embedding': embedding,
      'entities': entities
    }).execute()

  print(f"Done — {len(chunks)} chunks inserted, {len(entities)} entities extracted")

print("Ingestion complete")
