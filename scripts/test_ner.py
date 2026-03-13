import spacy

nlp = spacy.load('en_core_web_sm')

text = (
    "Bernie Sanders is a Senator from Vermont who has long championed Medicare for All. "
    "He ran for president in 2016 and 2020 against the Democratic Party establishment. "
    "Alexandria Ocasio-Cortez, a Democrat from New York, is a strong ally in the House of Representatives."
)

doc = nlp(text)
entities = [
    {'text': ent.text, 'label': ent.label_}
    for ent in doc.ents
    if ent.label_ in {'PERSON', 'ORG', 'GPE', 'DATE'}
]

for e in entities:
    print(f"{e['label']:<8} {e['text']}")

print(f"\n{len(entities)} entities extracted")
print("OK")
