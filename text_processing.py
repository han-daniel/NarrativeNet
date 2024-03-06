# text_processing.py
import spacy
from transformers import BertTokenizer, BertForMaskedLM

nlp = spacy.load("en_core_web_md")
tokenizer = BertTokenizer.from_pretrained("bert-base-uncased")
model = BertForMaskedLM.from_pretrained("bert-base-uncased")

def chunk_text(text, max_length=1024):
    words = text.split()
    chunks = []
    current_chunk = []

    for word in words:
        if len(current_chunk) + len(word.split()) <= max_length:
            current_chunk.append(word)
        else:
            chunks.append(" ".join(current_chunk))
            current_chunk = [word]

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks

def resolve_coreference(text, max_length=1024):
    # Split the text into chunks of max_length tokens
    text_chunks = [text[i:i+max_length] for i in range(0, len(text), max_length)]
    
    resolved_chunks = []
    for chunk in text_chunks:
        inputs = tokenizer(chunk, return_tensors="pt", truncation=True, padding=True, max_length=max_length)
        outputs = model(**inputs)
        resolved_chunk = tokenizer.decode(outputs.logits.argmax(dim=-1)[0])
        resolved_chunks.append(resolved_chunk)
    
    resolved_text = " ".join(resolved_chunks)
    return resolved_text

def extract_characters(text):
    chunks = chunk_text(text)
    resolved_chunks = [resolve_coreference(chunk) for chunk in chunks]
    resolved_text = " ".join(resolved_chunks)
    resolved_doc = nlp(resolved_text)
    characters = {}
    for ent in resolved_doc.ents:
        if ent.label_ == "PERSON":
            name_parts = ent.text.split()
            if len(name_parts) > 1:
                # If the name has multiple parts, use the last name as the key
                last_name = name_parts[-1]
                characters[last_name] = ent.text
            else:
                # If the name has only one part, use it as both the key and value
                characters[ent.text] = ent.text
    return list(characters.values())

# text_processing.py
def analyze_relationships(text, characters):
    resolved_text = resolve_coreference(text)
    doc = nlp(resolved_text)
    relationships = {}
    for sent in doc.sents:
        sent_characters = [char for char in characters if char in sent.text]
        for i in range(len(sent_characters)):
            for j in range(i + 1, len(sent_characters)):
                char_a, char_b = sent_characters[i], sent_characters[j]
                pair = tuple(sorted((char_a, char_b)))
                if pair not in relationships:
                    relationships[pair] = 0
                relationships[pair] += 1
    return {pair: weight for pair, weight in relationships.items() if weight > 0}
