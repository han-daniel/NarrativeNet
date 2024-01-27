import spacy
from collections import Counter, defaultdict

nlp = spacy.load("en_core_web_sm")

def extract_characters(text):
    doc = nlp(text)
    characters = Counter()
    for ent in doc.ents:
        # Refine 'PERSON' entity recognition based on capitalization
        if ent.label_ == 'PERSON' and ent.text.istitle():
            characters[ent.text] += 1
    # Additional logic for disambiguation or context analysis
    return characters

def analyze_relationships(text):
    doc = nlp(text)
    relationships = defaultdict(int)
    for sent in doc.sents:
        characters = [ent.text for ent in sent.ents if ent.label_ == 'PERSON']
        for i, char_a in enumerate(characters):
            for char_b in characters[i+1:]:
                relationships[(char_a, char_b)] += 1
    return dict(relationships)
