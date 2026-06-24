class TagCollector:
    seen = []                      # BUG: class-level mutable shared across all instances
    def __init__(self, name):
        self.name = name
    def add(self, tag):
        self.seen.append(tag)
        return list(self.seen)
