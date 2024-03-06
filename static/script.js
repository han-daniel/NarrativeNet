// script.js
document.getElementById('textForm').addEventListener('submit', function(e) {
    e.preventDefault();

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
        renderNetwork(data.network);
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
    resultsDiv.innerHTML = '';

    Object.keys(metrics).forEach(metric => {
        const table = document.createElement('table');
        table.classList.add('table', 'table-striped');

        const header = table.createTHead();
        const headerRow = header.insertRow(0);
        const characterHeader = headerRow.insertCell(0);
        const metricHeader = headerRow.insertCell(1);
        characterHeader.innerText = 'Character';
        metricHeader.innerText = metric;
        characterHeader.style.fontWeight = 'bold';
        metricHeader.style.fontWeight = 'bold';

        const body = table.createTBody();
        const sortedEntries = Object.entries(metrics[metric]).sort((a, b) => b[1] - a[1]);
        const topFive = sortedEntries.slice(0, 5);
        const rest = sortedEntries.slice(5);

        topFive.forEach(([character, value]) => {
            const row = body.insertRow();
            row.insertCell(0).innerText = character;
            row.insertCell(1).innerText = value.toFixed(3);
        });

        const expandRow = body.insertRow();
        const expandCell = expandRow.insertCell(0);
        expandCell.colSpan = 2;
        const expandButton = document.createElement('button');
        expandButton.innerText = 'Show More';
        expandButton.classList.add('btn', 'btn-sm', 'btn-secondary', 'mt-2');
        expandCell.appendChild(expandButton);

        expandButton.addEventListener('click', function() {
            if (expandButton.innerText === 'Show More') {
                rest.forEach(([character, value]) => {
                    const row = body.insertRow(body.rows.length - 1);
                    row.insertCell(0).innerText = character;
                    row.insertCell(1).innerText = value.toFixed(3);
                });
                expandButton.innerText = 'Show Less';
            } else {
                while (body.rows.length > topFive.length + 1) {
                    body.deleteRow(body.rows.length - 2);
                }
                expandButton.innerText = 'Show More';
            }
        });

        resultsDiv.appendChild(table);
    });
}

function renderNetwork(data) {
    const width = 800, height = 600;

    const svg = d3.select("#networkVisualization")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
        .selectAll("line")
        .data(data.links)
        .enter().append("line")
        .attr("stroke-width", d => Math.sqrt(d.value))
        .attr("stroke", "#999");

    const node = svg.append("g")
        .selectAll("circle")
        .data(data.nodes)
        .enter().append("circle")
        .attr("r", 10)
        .attr("fill", "blue")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    const labels = svg.append("g")
        .selectAll("text")
        .data(data.nodes)
        .enter().append("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(d => d.id);

    const zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", zoomed);

    svg.call(zoom);

    simulation.on("tick", () => {
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

    });

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    function zoomed(event) {
        svg.selectAll("g")
            .attr("transform", event.transform);
    }
}
