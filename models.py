# models.py
class NetworkState:
    def __init__(self):
        self.network = None
        self.metrics = None

    def update_network(self, network, metrics):
        self.network = network
        self.metrics = metrics

    def get_network(self):
        return self.network

    def get_metrics(self):
        return self.metrics
