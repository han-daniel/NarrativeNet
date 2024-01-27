from flask import Flask, request, jsonify, Response, render_template
from flask_cors import CORS
from text_processing import extract_characters, analyze_relationships
from network_analysis import construct_network, compute_network_metrics, export_network_json, export_metrics_csv, network_to_d3_json

app = Flask(__name__)
CORS(app)

last_network = None
last_metrics = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process_text():
    try:
        data = request.json
        text = data.get('text', '')
        print("Received text:", text[:10000])  # Increased character limit

        characters = extract_characters(text)
        relationships = analyze_relationships(text)
        network = construct_network(characters, relationships)
        metrics = compute_network_metrics(network)
        d3_network = network_to_d3_json(network)

        # Convert tuples in relationships and metrics to string format and round metrics values
        relationships_str_keys = {f"{key[0]}-{key[1]}": value for key, value in relationships.items()}
        metrics_str_keys = {k: {str(node): round(value, 3) for node, value in v.items()} for k, v in metrics.items()}

        global last_network, last_metrics
        last_network = network
        last_metrics = metrics

        return jsonify({'success': True, 'characters': list(characters), 'relationships': relationships_str_keys, 'metrics': metrics_str_keys, 'network': d3_network})
    except Exception as e:
        print("Error:", e)  # Log the error
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/export/network', methods=['GET'])
def export_network():
    global last_network
    if last_network is not None:
        network_json = export_network_json(last_network)
        return Response(
            network_json,
            mimetype="application/json",
            headers={"Content-disposition": "attachment; filename=network.json"}
        )
    else:
        return jsonify({'success': False, 'error': 'No network available'}), 404

@app.route('/export/metrics', methods=['GET'])
def export_metrics():
    global last_metrics
    if last_metrics is not None:
        csv_data = export_metrics_csv(last_metrics)
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=metrics.csv"}
        )
    else:
        return jsonify({'success': False, 'error': 'No metrics available'}), 404

if __name__ == '__main__':
    app.run(debug=True)
