import networkx as nx
import json
import csv
from io import StringIO

def construct_network(characters, relationships):
    G = nx.Graph()
    G.add_nodes_from(characters)
    for (char_a, char_b), weight in relationships.items():
        G.add_edge(char_a, char_b, weight=weight)
    return G

def compute_network_metrics(G):
    return {
        'degree_centrality': nx.degree_centrality(G),
        'betweenness_centrality': nx.betweenness_centrality(G),
        'closeness_centrality': nx.closeness_centrality(G),
        'eigenvector_centrality': nx.eigenvector_centrality(G, max_iter=1000),
        'clustering_coefficient': nx.clustering(G)
    }

def export_network_json(G):
    data = nx.readwrite.json_graph.node_link_data(G)
    return json.dumps(data)

def export_metrics_csv(metrics):
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['Metric', 'Value'])
    for key, values in metrics.items():
        for node, value in values.items():
            writer.writerow([f"{key}_{node}", value])
    return output.getvalue()

def network_to_d3_json(network):
    """
    Converts a NetworkX graph into a JSON format compatible with D3.js.
    Each node and edge in the network is transformed into the required format.

    :param network: NetworkX graph object
    :return: JSON object with 'nodes' and 'links' suitable for D3.js
    """
    # Convert nodes
    d3_nodes = [{"id": str(node), "group": 1} for node in network.nodes()]

    # Convert edges
    d3_links = [{"source": str(edge[0]), "target": str(edge[1]), "value": network[edge[0]][edge[1]]['weight']} for edge in network.edges()]

    return {"nodes": d3_nodes, "links": d3_links}
