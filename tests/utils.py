from types import SimpleNamespace


class FakeTool:
    def __init__(self, return_value=None, side_effect=None):
        self.return_value = return_value
        self.side_effect = side_effect
        self.calls = []

    def invoke(self, payload):
        self.calls.append(payload)
        if self.side_effect:
            raise self.side_effect
        return self.return_value


class FakeLLM:
    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []

    def invoke(self, messages):
        self.calls.append(messages)
        if not self._responses:
            raise RuntimeError("No queued responses")
        return SimpleNamespace(content=self._responses.pop(0))


class FakeSupabaseTable:
    def __init__(self, name, operations):
        self.name = name
        self.operations = operations

    def update(self, payload):
        self.operations.append(("update", self.name, payload))
        return self

    def insert(self, payload):
        self.operations.append(("insert", self.name, payload))
        return self

    def eq(self, field, value):
        self.operations.append(("eq", self.name, field, value))
        return self

    def execute(self):
        return SimpleNamespace(data=[{"ok": True}])


class FakeSupabaseClient:
    def __init__(self):
        self.operations = []

    def table(self, name):
        return FakeSupabaseTable(name, self.operations)
