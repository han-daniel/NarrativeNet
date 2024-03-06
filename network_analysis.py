# network_analysis.py
import networkx as nx
import json
import csv
from io import StringIO

def construct_network(characters, relationships):
    G = nx.Graph()
    for char in characters:
        G.add_node(char)
    for pair, weight in relationships.items():
        if weight > 0:
            char_a, char_b = pair
            if char_a in G and char_b in G:
                G.add_edge(char_a, char_b, weight=weight)
    return G

def compute_network_metrics(G):
    metrics = {
        'Degree Centrality': nx.degree_centrality(G),
        'Betweenness Centrality': nx.betweenness_centrality(G),
        'Closeness Centrality': nx.closeness_centrality(G),
        'Eigenvector Centrality': nx.eigenvector_centrality_numpy(G),
        'Clustering Coefficient': nx.clustering(G)
    }

    return {k: {str(char): round(val, 3) for char, val in v.items()} for k, v in metrics.items()}


def export_network_json(G):
    data = nx.readwrite.json_graph.node_link_data(G)
    return json.dumps(data)

def export_metrics_csv(metrics):
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['Metric', 'Character', 'Value'])
    for metric, char_values in metrics.items():
        for char, value in char_values.items():
            writer.writerow([metric, char, value])
    return output.getvalue()

def network_to_d3_json(network, metrics):
    d3_nodes = [{"id": str(node), "group": 1, **{metric: scores[node] for metric, scores in metrics.items()}} for node in network.nodes()]
    d3_links = [{"source": str(edge[0]), "target": str(edge[1]), "value": network[edge[0]][edge[1]]['weight']} for edge in network.edges()]
    return {"nodes": d3_nodes, "links": d3_links}
