"""Shared test fixtures for API service tests."""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def api_client():
    """Create a test client for the API service."""
    from src.main import app

    return TestClient(app)
