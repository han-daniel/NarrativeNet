# app.py
from flask import Flask, request, jsonify, Response, render_template
from flask_cors import CORS
from text_processing import extract_characters, analyze_relationships
from network_analysis import construct_network, compute_network_metrics, export_network_json, export_metrics_csv, network_to_d3_json
from models import NetworkState
import logging

app = Flask(__name__)
CORS(app)

network_state = NetworkState()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process_text():
    try:
        data = request.json
        text = data.get('text', '')
        if not text:
            return jsonify({'success': False, 'error': 'No text provided'}), 400

        logger.info(f"Received text: {text[:1024]}...")

        characters = extract_characters(text)
        relationships = analyze_relationships(text, characters)
        network = construct_network(characters, relationships)
        metrics = compute_network_metrics(network)
        d3_network = network_to_d3_json(network, metrics)

        network_state.update_network(network, metrics)

        return jsonify({'success': True, 'characters': list(characters), 'relationships': {str(k): v for k, v in relationships.items()}, 'metrics': {k: {str(char): round(val, 3) for char, val in v.items()} for k, v in metrics.items()}, 'network': d3_network})
    except Exception as e:
        logger.exception("Error occurred during text processing")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/export/network', methods=['GET'])
def export_network():
    network = network_state.get_network()
    if network is not None:
        network_json = export_network_json(network)
        return Response(
            network_json,
            mimetype="application/json",
            headers={"Content-disposition": "attachment; filename=network.json"}
        )
    else:
        return jsonify({'success': False, 'error': 'No network available'}), 404

@app.route('/export/metrics', methods=['GET'])
def export_metrics():
    metrics = network_state.get_metrics()
    if metrics is not None:
        csv_data = export_metrics_csv(metrics)
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=metrics.csv"}
        )
    else:
        return jsonify({'success': False, 'error': 'No metrics available'}), 404

if __name__ == '__main__':
    app.run(debug=True)
