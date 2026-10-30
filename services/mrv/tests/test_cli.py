"""Placeholder tests for the VeriCarbon MRV CLI."""

from typer.testing import CliRunner

from mrv.cli import app

runner = CliRunner()


def test_hello_command() -> None:
    """Verify that `mrv hello` exits cleanly and prints the greeting."""
    result = runner.invoke(app, ["hello"])
    assert result.exit_code == 0
    assert "Hello from VeriCarbon MRV pipeline!" in result.stdout
