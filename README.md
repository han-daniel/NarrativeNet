# NarrativeNet
NarrativeNet (https://han-daniel.github.io/NarrativeNet/) is a web application that provides powerful text analysis and visualization tools for movie and series synopses. It offers the following features:

Text Analysis: Input a movie or series synopsis, and NarrativeNet extracts and analyzes key characters and their relationships within the narrative.\
Network Visualization: Visualize the relationships between characters as a dynamic network graph, making it easy to understand their interactions.\
Centrality Scores: Gain insights into character importance with centrality scores such as betweenness, eigenvector centrality, and more.\
Bar Graphs: Quickly compare the importance that each character holds.\
Export Data: Export the network graph as a JSON object and centrality scores as CSV files for further analysis or visualization.

NarrativeNet assists storytellers, screenwriters, and researchers to explore the dynamics of characters within narratives, providing insights for creative and analytical purposes.

The live site (in `docs/`, hosted on GitHub Pages) runs entirely in the browser: character extraction uses [compromise](https://github.com/spencermountain/compromise) and the network metrics are computed in plain JavaScript. The original Flask/spaCy/networkx implementation is kept at the repo root and can still be run locally with `python app.py`.


<img width="678" alt="Screenshot 2024-03-06 at 8 18 00 PM" src="https://github.com/han-daniel/NarrativeNet/assets/43096627/61976b48-6b11-42b2-9a81-358fdeb10b57">
