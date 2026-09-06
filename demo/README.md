# demo/ — Demo Mode

## What it is

A bundled **synthetic** satellite-style image (`demo_rgb.jpg`) plus the
generator script. Demo mode lets the whole product be demonstrated — upload →
depth → DSM → slope → 3D → flythrough → measurement → validation — with no
internet and no user upload.

> ⚠️ Demo outputs are clearly labelled synthetic in the API (`mode:
> "fallback"`/“SYNTHETIC” messages), the dashboard and the validation page.
> They are **not** real-world validated measurements.

## Generate / regenerate the sample

```bash
cd backend
.\\.venv\\Scripts\\python ../demo/generate_demo_image.py   # Windows
python ../demo/generate_demo_image.py                      # Linux/macOS
```

## Use it

- UI: **Load Demo** button on the Upload page.
- API: `POST /api/demo` creates a demo job; then `POST /api/analyze`.
- Tests: `tests/test_api.py::TestValidation::test_demo_validation` covers the
  synthetic-reference validation path.
