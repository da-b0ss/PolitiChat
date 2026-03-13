from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')
embedding = model.encode('This is a test sentence.')
print(f"Embedding shape: {embedding.shape}")
assert embedding.shape == (384,), f"Expected (384,) but got {embedding.shape}"
print("OK")
