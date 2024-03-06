# text_processing.py
import spacy

nlp = spacy.load("en_core_web_md")

def resolve_coreference(text):
    doc = nlp(text)
    resolved_text = []

    for token in doc:
        if token.pos_ == "PRON" and token.dep_ in ["nsubj", "dobj", "pobj"]:
            antecedent = find_antecedent(token)
            if antecedent:
                resolved_text.append(antecedent.text)
            else:
                resolved_text.append(token.text)
        else:
            resolved_text.append(token.text)

    return " ".join(resolved_text)

def find_antecedent(pronoun):
    for token in pronoun.doc:
        if token.pos_ == "PROPN" or token.pos_ == "NOUN":
            if token.dep_ in ["nsubj", "dobj", "pobj"] and token.i < pronoun.i:
                return token
    return None

def extract_characters(text):
    doc = nlp(text)
    characters = {}
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            name_parts = ent.text.split()
            if len(name_parts) > 1:
                last_name = name_parts[-1]
                characters[last_name] = ent.text
            else:
                characters[ent.text] = ent.text
    return list(characters.values())

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
