document.getElementById('textForm').addEventListener('submit', function(e) {
    e.preventDefault();

    // Clear existing graph before creating a new one
    const networkVisualization = document.getElementById('networkVisualization');
    networkVisualization.innerHTML = '';

    const text = document.getElementById('textInput').value;
    fetch('/process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok. Status: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        if (data.success === false) {
            throw new Error(data.error || 'Error in processing');
        }
        createMetricsTable(data.metrics);
        renderNetwork(data.network); // This function will create a new graph
    })
    .catch((error) => {
        console.error('Error:', error);
        document.getElementById('results').innerHTML = 'Error: ' + error.message;
    });
});

document.getElementById('exportNetwork').addEventListener('click', function() {
    fetch('/export/network')
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'network.json';
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    })
    .catch(error => console.error('Error:', error));
});


document.getElementById('exportMetrics').addEventListener('click', function() {
    fetch('/export/metrics')
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'network_metrics.csv';
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    })
    .catch(error => console.error('Error:', error));
});

function createMetricsTable(metrics) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous results

    Object.keys(metrics).forEach(metric => {
        const table = document.createElement('table');
        const header = table.createTHead();
        const headerRow = header.insertRow(0);
        headerRow.insertCell(0).innerText = 'Character';
        headerRow.insertCell(1).innerText = metric;

        const body = table.createTBody();
        Object.entries(metrics[metric]).forEach(([character, value]) => {
            const row = body.insertRow();
            row.insertCell(0).innerText = character;
            row.insertCell(1).innerText = value;
        });

        resultsDiv.appendChild(table);
    });
}

function renderNetwork(data) {
    const width = 800, height = 600;

    // Select the SVG element, if it exists.
    const svgContainer = d3.select("#networkVisualization");

    // Clear any existing SVG to ensure we're creating a new graph.
    svgContainer.selectAll("svg").remove();

    // Create a new SVG element.
    const svg = svgContainer.append("svg")
        .attr("width", width)
        .attr("height", height);

    const simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.id))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Create links
    const link = svg.append("g")
        .selectAll("line")
        .data(data.links)
        .enter().append("line")
        .style("stroke-width", d => Math.sqrt(d.value))
        .style("stroke", "#999");  // Set a default color for the links

    // Create nodes
    const node = svg.append("g")
        .selectAll("circle")
        .data(data.nodes)
        .enter().append("circle")
        .attr("r", 5)
        .style("fill", "blue")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // Node labels
    const labels = svg.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(data.nodes)
        .enter().append("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(d => d.id);

    // Edge labels
    const edgeLabels = svg.append("g")
        .selectAll("text")
        .data(data.links)
        .enter().append("text")
        .style("font-size", 10)
        .attr("fill", "black")
        .text(d => d.value);  // Assuming you want to display the value of the link

    simulation
        .nodes(data.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(data.links);

        function dragstarted(d) {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        }
        
        function dragended(d) {
            if (!d3.event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }        

    function ticked() {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        labels
            .attr("x", d => d.x)
            .attr("y", d => d.y);

        edgeLabels
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2);
    }

    // Drag functions ...
}



