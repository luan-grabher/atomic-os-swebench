class RouteRegistry:
    _routes = {}                   # BUG: class-level mutable shared across all instances
    def __init__(self, prefix):
        self.prefix = prefix
    def register(self, path, handler):
        self._routes[path] = handler
        return dict(self._routes)
