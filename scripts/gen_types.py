"""Generates TypeScript definitions from the FastAPI OpenAPI schema."""
from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.app.main import app
OUT_PATH = ROOT / "frontend" / "src" / "lib" / "api-types.ts"


def py_type_to_ts(prop: dict) -> str:
    prop_type = prop.get("type")
    if "$ref" in prop:
        return prop["$ref"].split("/")[-1]
    if "enum" in prop:
        return " | ".join(f'"{v}"' if isinstance(v, str) else str(v) for v in prop["enum"])
    if "anyOf" in prop:
        return " | ".join(py_type_to_ts(p) for p in prop["anyOf"])
    if prop_type == "integer" or prop_type == "number":
        return "number"
    if prop_type == "boolean":
        return "boolean"
    if prop_type == "string":
        return "string"
    if prop_type == "array":
        items = prop.get("items", {})
        return f"{py_type_to_ts(items)}[]"
    if prop_type == "object":
        return "Record<string, any>"
    return "any"


def generate_ts():
    schema = app.openapi()
    lines = [
        "/**",
        " * Auto-generated OpenAPI TypeScript definitions.",
        " * Generated from FastAPI backend app.openapi()",
        " */",
        "",
    ]

    components = schema.get("components", {}).get("schemas", {})
    for name, s in sorted(components.items()):
        lines.append(f"export interface {name} {{")
        props = s.get("properties", {})
        required = set(s.get("required", []))
        for p_name, p_spec in props.items():
            opt = "" if p_name in required else "?"
            ts_type = py_type_to_ts(p_spec)
            lines.append(f"  {p_name}{opt}: {ts_type};")
        lines.append("}")
        lines.append("")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated {OUT_PATH} successfully ({len(components)} schemas).")


if __name__ == "__main__":
    generate_ts()
