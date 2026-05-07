from domain.tools import update_claim_status_tool
from domain.tools.update_vehicle_status_tool import make_update_vehicle_status_tool


class FakeClaimRepo:
    def __init__(self, ok=True):
        self.ok = ok
        self.calls = []

    def update_claim_status(self, claim_id, status, ai_verdict):
        self.calls.append((claim_id, status, ai_verdict))
        return self.ok


class FakeImageRepo:
    def __init__(self, ok=True):
        self.ok = ok
        self.calls = []

    def update_vehicle_status(self, image_id, is_vehical):
        self.calls.append((image_id, is_vehical))
        return self.ok


def test_update_claim_status_sends_notifications(monkeypatch):
    calls = {"email": [], "db": [], "socket": []}

    monkeypatch.setattr(update_claim_status_tool, "send_status_update_email", lambda *args: calls["email"].append(args))
    monkeypatch.setattr(update_claim_status_tool, "_save_claimant_notification_to_db", lambda *args: calls["db"].append(args))
    monkeypatch.setattr(update_claim_status_tool, "_emit_claimant_socket_event", lambda *args: calls["socket"].append(args))

    repo = FakeClaimRepo(ok=True)
    tool = update_claim_status_tool.make_update_claim_status_tool(repo, "c1")

    res = tool.invoke({"status": "approved", "ai_verdict": "ok"})

    assert "Claim c1 updated" in res
    assert calls["email"]
    assert calls["db"]
    assert calls["socket"]


def test_update_claim_status_skips_notifications_for_under_review(monkeypatch):
    calls = {"email": [], "db": [], "socket": []}

    monkeypatch.setattr(update_claim_status_tool, "send_status_update_email", lambda *args: calls["email"].append(args))
    monkeypatch.setattr(update_claim_status_tool, "_save_claimant_notification_to_db", lambda *args: calls["db"].append(args))
    monkeypatch.setattr(update_claim_status_tool, "_emit_claimant_socket_event", lambda *args: calls["socket"].append(args))

    repo = FakeClaimRepo(ok=True)
    tool = update_claim_status_tool.make_update_claim_status_tool(repo, "c1")

    res = tool.invoke({"status": "under_review", "ai_verdict": "needs review"})

    assert "Claim c1 updated" in res
    assert not calls["email"]
    assert not calls["db"]
    assert not calls["socket"]


def test_update_claim_status_failure(monkeypatch):
    calls = {"email": [], "db": [], "socket": []}

    monkeypatch.setattr(update_claim_status_tool, "send_status_update_email", lambda *args: calls["email"].append(args))
    monkeypatch.setattr(update_claim_status_tool, "_save_claimant_notification_to_db", lambda *args: calls["db"].append(args))
    monkeypatch.setattr(update_claim_status_tool, "_emit_claimant_socket_event", lambda *args: calls["socket"].append(args))

    repo = FakeClaimRepo(ok=False)
    tool = update_claim_status_tool.make_update_claim_status_tool(repo, "c1")

    res = tool.invoke({"status": "approved", "ai_verdict": "ok"})

    assert "Failed to update claim c1" in res
    assert not calls["email"]
    assert not calls["db"]
    assert not calls["socket"]


def test_update_vehicle_status_success():
    repo = FakeImageRepo(ok=True)
    tool = make_update_vehicle_status_tool(repo)

    res = tool.invoke({"image_id": "img1", "is_vehical": True})

    assert "Successfully updated image" in res
    assert repo.calls == [("img1", True)]


def test_update_vehicle_status_failure():
    repo = FakeImageRepo(ok=False)
    tool = make_update_vehicle_status_tool(repo)

    res = tool.invoke({"image_id": "img1", "is_vehical": False})

    assert "Failed to update image" in res
    assert repo.calls == [("img1", False)]
