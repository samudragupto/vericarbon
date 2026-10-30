"""Command-line interface for the VeriCarbon MRV pipeline."""

import typer

app = typer.Typer(
    name="mrv",
    help="VeriCarbon MRV CLI: fetch -> features -> train -> quantify.",
    add_completion=False,
)


@app.callback()
def main() -> None:
    """VeriCarbon MRV CLI entrypoint."""


@app.command()
def hello(name: str = typer.Option("VeriCarbon", help="Name to greet.")) -> None:
    """Print a deterministic greeting from the VeriCarbon MRV pipeline."""
    typer.echo(f"Hello from {name} MRV pipeline!")


if __name__ == "__main__":
    app()
