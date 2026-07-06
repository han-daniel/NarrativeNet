// analysis.js — browser port of the Flask backend (text_processing.py + network_analysis.py)
// Character extraction uses compromise (window.nlp) instead of spaCy.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('compromise'));
    } else {
        root.NarrativeNet = factory(root.nlp);
    }
}(typeof self !== 'undefined' ? self : this, function (nlp) {

    function cleanName(name) {
        const parts = name
            .replace(/['’]s\b/g, '')
            .replace(/[^A-Za-z'’-]+/g, ' ')
            .trim()
            .split(' ')
            .filter(Boolean);
        // Drop non-capitalized words compromise sometimes attaches ("father Leto").
        while (parts.length && !/^[A-Z]/.test(parts[0])) parts.shift();
        while (parts.length && !/^[A-Z]/.test(parts[parts.length - 1])) parts.pop();
        return parts.join(' ');
    }

    function addMention(characters, mention) {
        const keys = mention.split(' ').map(function (p) { return p.toLowerCase(); });
        let character = characters.find(function (c) {
            return keys.some(function (k) { return c.keys.has(k); });
        });
        if (!character) {
            character = { name: mention, keys: new Set(), aliases: new Set() };
            characters.push(character);
        }
        if (mention.length > character.name.length) character.name = mention;
        character.aliases.add(mention);
        keys.forEach(function (k) { character.keys.add(k); });
    }

    const TITLE_WORDS = new Set(['the', 'a', 'an', 'house', 'mr', 'mrs', 'ms', 'miss',
        'dr', 'sir', 'lady', 'lord', 'baron', 'duke', 'duchess', 'king', 'queen',
        'prince', 'princess', 'doctor', 'captain', 'general', 'professor', 'reverend',
        'mother', 'father', 'uncle', 'aunt', 'emperor', 'god']);

    // Fictional names compromise doesn't know (e.g. "Chani"): capitalized words
    // seen mid-sentence at least twice that never appear lowercased in the text.
    function findExtraNames(text, characters) {
        const knownKeys = new Set();
        characters.forEach(function (c) {
            c.keys.forEach(function (k) { knownKeys.add(k); });
        });
        const lowercaseWords = new Set(text.match(/\b[a-z][a-z'’-]+\b/g) || []);
        const counts = {};
        nlp(text).sentences().out('array').forEach(function (sentence) {
            const words = sentence.match(/[A-Za-z][A-Za-z'’-]*/g) || [];
            words.forEach(function (word, i) {
                if (i === 0 || !/^[A-Z][a-z'’-]+$/.test(word)) return;
                const key = word.toLowerCase();
                if (knownKeys.has(key) || TITLE_WORDS.has(key) || lowercaseWords.has(key)) return;
                counts[word] = (counts[word] || 0) + 1;
            });
        });
        return Object.keys(counts).filter(function (w) { return counts[w] >= 2; });
    }

    // Group person mentions into characters: "Paul Atreides" and "Paul"
    // become one character whose canonical name is the longest mention.
    function extractCharacters(text) {
        const mentions = nlp(text).people().out('array')
            .map(cleanName)
            .filter(function (m) { return m.length > 1; });

        const characters = [];
        mentions.forEach(function (mention) { addMention(characters, mention); });
        findExtraNames(text, characters).forEach(function (mention) {
            addMention(characters, mention);
        });
        return characters;
    }

    function escapeRegExp(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Last position at which any alias of the character appears in the sentence, or -1.
    function mentionPosition(sentence, character) {
        let pos = -1;
        character.aliases.forEach(function (alias) {
            const re = new RegExp('\\b' + escapeRegExp(alias) + '\\b', 'gi');
            let m;
            while ((m = re.exec(sentence)) !== null) pos = Math.max(pos, m.index);
        });
        return pos;
    }

    // Count sentence-level co-occurrences. A lone pronoun is credited to the
    // most recently mentioned character (stand-in for spaCy coreference).
    function analyzeRelationships(text, characters) {
        const sentences = nlp(text).sentences().out('array');
        const relationships = {};
        let lastMentioned = null;

        sentences.forEach(function (sentence) {
            const present = [];
            characters.forEach(function (character) {
                const pos = mentionPosition(sentence, character);
                if (pos >= 0) present.push({ character: character, pos: pos });
            });
            present.sort(function (a, b) { return a.pos - b.pos; });
            const names = present.map(function (p) { return p.character.name; });

            if (lastMentioned && names.indexOf(lastMentioned) === -1 &&
                /\b(he|she|him|her|his|hers|they|them|their)\b/i.test(sentence)) {
                names.unshift(lastMentioned);
            }

            for (let i = 0; i < names.length; i++) {
                for (let j = i + 1; j < names.length; j++) {
                    const pair = [names[i], names[j]].sort().join('||');
                    relationships[pair] = (relationships[pair] || 0) + 1;
                }
            }
            if (present.length > 0) lastMentioned = present[present.length - 1].character.name;
        });
        return relationships;
    }

    // ---- graph construction + metrics (port of network_analysis.py) ----

    function constructNetwork(names, relationships) {
        const adjacency = {};
        names.forEach(function (n) { adjacency[n] = {}; });
        Object.keys(relationships).forEach(function (key) {
            const weight = relationships[key];
            if (weight <= 0) return;
            const pair = key.split('||');
            if (adjacency[pair[0]] && adjacency[pair[1]] && pair[0] !== pair[1]) {
                adjacency[pair[0]][pair[1]] = weight;
                adjacency[pair[1]][pair[0]] = weight;
            }
        });
        return { nodes: names.slice(), adjacency: adjacency };
    }

    function neighbors(G, v) { return Object.keys(G.adjacency[v]); }

    function degreeCentrality(G) {
        const n = G.nodes.length;
        const result = {};
        G.nodes.forEach(function (v) {
            result[v] = n > 1 ? neighbors(G, v).length / (n - 1) : 0;
        });
        return result;
    }

    function bfsDistances(G, source) {
        const dist = {};
        dist[source] = 0;
        const queue = [source];
        while (queue.length) {
            const v = queue.shift();
            neighbors(G, v).forEach(function (w) {
                if (!(w in dist)) {
                    dist[w] = dist[v] + 1;
                    queue.push(w);
                }
            });
        }
        return dist;
    }

    // Brandes' algorithm, normalized like networkx (undirected, normalized=True).
    function betweennessCentrality(G) {
        const bc = {};
        G.nodes.forEach(function (v) { bc[v] = 0; });
        G.nodes.forEach(function (s) {
            const stack = [];
            const pred = {}, sigma = {}, dist = {};
            G.nodes.forEach(function (v) { pred[v] = []; sigma[v] = 0; dist[v] = -1; });
            sigma[s] = 1; dist[s] = 0;
            const queue = [s];
            while (queue.length) {
                const v = queue.shift();
                stack.push(v);
                neighbors(G, v).forEach(function (w) {
                    if (dist[w] < 0) { dist[w] = dist[v] + 1; queue.push(w); }
                    if (dist[w] === dist[v] + 1) { sigma[w] += sigma[v]; pred[w].push(v); }
                });
            }
            const delta = {};
            G.nodes.forEach(function (v) { delta[v] = 0; });
            while (stack.length) {
                const w = stack.pop();
                pred[w].forEach(function (v) {
                    delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
                });
                if (w !== s) bc[w] += delta[w];
            }
        });
        const n = G.nodes.length;
        const scale = n > 2 ? 1 / ((n - 1) * (n - 2)) : 0;
        G.nodes.forEach(function (v) { bc[v] *= scale; });
        return bc;
    }

    // networkx closeness_centrality with the wf_improved correction for
    // disconnected graphs.
    function closenessCentrality(G) {
        const n = G.nodes.length;
        const result = {};
        G.nodes.forEach(function (v) {
            const dist = bfsDistances(G, v);
            const reachable = Object.keys(dist).length;
            let total = 0;
            Object.keys(dist).forEach(function (w) { total += dist[w]; });
            if (total > 0 && n > 1 && reachable > 1) {
                result[v] = ((reachable - 1) / total) * ((reachable - 1) / (n - 1));
            } else {
                result[v] = 0;
            }
        });
        return result;
    }

    // Power iteration on the unweighted adjacency matrix, Euclidean-normalized
    // (matches nx.eigenvector_centrality_numpy).
    function eigenvectorCentrality(G) {
        const n = G.nodes.length;
        const result = {};
        if (n === 0) return result;
        let x = {};
        G.nodes.forEach(function (v) { x[v] = 1 / Math.sqrt(n); });
        for (let iter = 0; iter < 200; iter++) {
            const next = {};
            G.nodes.forEach(function (v) {
                // x[v] term shifts the matrix by +I so iteration converges on
                // bipartite graphs (same trick as networkx).
                let sum = x[v];
                neighbors(G, v).forEach(function (w) { sum += x[w]; });
                next[v] = sum;
            });
            let norm = 0;
            G.nodes.forEach(function (v) { norm += next[v] * next[v]; });
            norm = Math.sqrt(norm);
            if (norm === 0) break;
            G.nodes.forEach(function (v) { next[v] /= norm; });
            x = next;
        }
        G.nodes.forEach(function (v) { result[v] = Math.abs(x[v]); });
        return result;
    }

    function clusteringCoefficient(G) {
        const result = {};
        G.nodes.forEach(function (v) {
            const nbrs = neighbors(G, v);
            const k = nbrs.length;
            if (k < 2) { result[v] = 0; return; }
            let triangles = 0;
            for (let i = 0; i < k; i++) {
                for (let j = i + 1; j < k; j++) {
                    if (G.adjacency[nbrs[i]][nbrs[j]] !== undefined) triangles++;
                }
            }
            result[v] = (2 * triangles) / (k * (k - 1));
        });
        return result;
    }

    function round3(values) {
        const out = {};
        Object.keys(values).forEach(function (k) {
            out[k] = Math.round(values[k] * 1000) / 1000;
        });
        return out;
    }

    function computeNetworkMetrics(G) {
        return {
            'Degree Centrality': round3(degreeCentrality(G)),
            'Betweenness Centrality': round3(betweennessCentrality(G)),
            'Closeness Centrality': round3(closenessCentrality(G)),
            'Eigenvector Centrality': round3(eigenvectorCentrality(G)),
            'Clustering Coefficient': round3(clusteringCoefficient(G))
        };
    }

    function networkToD3Json(G, metrics) {
        const nodes = G.nodes.map(function (v) {
            const node = { id: v, group: 1 };
            Object.keys(metrics).forEach(function (metric) {
                node[metric] = metrics[metric][v];
            });
            return node;
        });
        const links = [];
        const seen = new Set();
        G.nodes.forEach(function (v) {
            neighbors(G, v).forEach(function (w) {
                const key = [v, w].sort().join('||');
                if (seen.has(key)) return;
                seen.add(key);
                links.push({ source: v, target: w, value: G.adjacency[v][w] });
            });
        });
        return { nodes: nodes, links: links };
    }

    // Same shape as networkx node_link_data JSON export.
    function exportNetworkJson(G) {
        const links = [];
        const seen = new Set();
        G.nodes.forEach(function (v) {
            neighbors(G, v).forEach(function (w) {
                const key = [v, w].sort().join('||');
                if (seen.has(key)) return;
                seen.add(key);
                links.push({ weight: G.adjacency[v][w], source: v, target: w });
            });
        });
        return JSON.stringify({
            directed: false,
            multigraph: false,
            graph: {},
            nodes: G.nodes.map(function (v) { return { id: v }; }),
            links: links
        });
    }

    function csvEscape(value) {
        const s = String(value);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }

    function exportMetricsCsv(metrics) {
        const rows = [['Metric', 'Character', 'Value']];
        Object.keys(metrics).forEach(function (metric) {
            Object.keys(metrics[metric]).forEach(function (character) {
                rows.push([metric, character, metrics[metric][character]]);
            });
        });
        return rows.map(function (r) { return r.map(csvEscape).join(','); }).join('\r\n') + '\r\n';
    }

    function analyzeText(text) {
        const characters = extractCharacters(text);
        const names = characters.map(function (c) { return c.name; });
        const relationships = analyzeRelationships(text, characters);
        const network = constructNetwork(names, relationships);
        const metrics = computeNetworkMetrics(network);
        const relationshipsOut = {};
        Object.keys(relationships).forEach(function (key) {
            const pair = key.split('||');
            relationshipsOut["('" + pair[0] + "', '" + pair[1] + "')"] = relationships[key];
        });
        return {
            success: true,
            characters: names,
            relationships: relationshipsOut,
            metrics: metrics,
            network: network,
            d3Network: networkToD3Json(network, metrics)
        };
    }

    return {
        analyzeText: analyzeText,
        exportNetworkJson: exportNetworkJson,
        exportMetricsCsv: exportMetricsCsv
    };
}));
