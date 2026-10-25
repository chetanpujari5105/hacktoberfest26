import pytest
from fastmcp import Client

from api.mcp import build_mcp
from tests.test_api import FakeService

pytestmark = pytest.mark.unit
EXPECTED_TOOLS = {
    "list_runs",
    "get_run",
    "get_logs",
    "get_probe_history",
    "extend",
    "pause_now",
    "resume",
    "resolve",
}


async def test_mcp_exposes_kepler_tools() -> None:
    async with Client(build_mcp(FakeService)) as client:
        names = {tool.name for tool in await client.list_tools()}
    assert names == EXPECTED_TOOLS


async def test_mcp_tools_drive_the_service() -> None:
    service = FakeService()
    async with Client(build_mcp(lambda: service)) as client:
        run = await client.call_tool("get_run", {"run_id": "run-1"})
        assert run.data["run_id"] == "run-1"
        logs = await client.call_tool("get_logs", {"run_id": "run-1"})
        assert logs.data["losses"] == [1.0]
        history = await client.call_tool("get_probe_history", {"run_id": "run-1"})
        assert len(history.structured_content["result"]) == 1
        await client.call_tool("pause_now", {"run_id": "run-1"})
        await client.call_tool("resolve", {"run_id": "run-1"})
        await client.call_tool("resume", {"run_id": "run-1", "gpu_type": "A5000"})
        await client.call_tool("extend", {"run_id": "run-1", "minutes": 9999})
    assert ("decide", ("run-1", "pause")) in service.calls
    assert ("decide", ("run-1", "resolved")) in service.calls
    assert ("resume", ("run-1", "A5000")) in service.calls
    assert ("extend", ("run-1", 720)) in service.calls
