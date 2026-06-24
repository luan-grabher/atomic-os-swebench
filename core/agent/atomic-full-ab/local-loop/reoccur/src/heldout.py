class EventBuffer:
    pending = set()                # BUG: class-level mutable shared across all instances
    def __init__(self, channel):
        self.channel = channel
    def push(self, event):
        self.pending.add(event)
        return set(self.pending)
