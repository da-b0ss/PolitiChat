import wikipediaapi
import os
from openai import OpenAI
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('../backend/.env')

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])
openai = OpenAI(api_key=os.environ['OPENAI_API_KEY'])
wiki = wikipediaapi.Wikipedia('politician-rag/1.0', 'en')

POLITICIANS = [
  {'name': 'Bernie Sanders', 'party': 'Democrat'},
  {'name': 'Donald Trump', 'party': 'Republican'},
  {'name': 'Ron Paul', 'party': 'Republican'},
  {'name': 'Alexandria Ocasio-Cortez', 'party': 'Democrat'},
]

def chunk_text(text, size=500, overlap=50):
  words = text.split()
  chunks = []
  for i in range(0, len(words), size - overlap):
    chunk = ' '.join(words[i:i+size])
    chunks.append(chunk)
  return chunks

def embed(text):
  res = openai.embeddings.create(model='text-embedding-3-small', input=text)
  return res.data[0].embedding

for p in POLITICIANS:
  print(f"Ingesting {p['name']}...")
  
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

  # Chunk, embed, insert
  chunks = chunk_text(page.text)
  for chunk in chunks:
    embedding = embed(chunk)
    supabase.table('chunks').insert({
      'source_id': source['id'],
      'content': chunk,
      'embedding': embedding
    }).execute()
  
  print(f"Done — {len(chunks)} chunks inserted")

print("Ingestion complete")