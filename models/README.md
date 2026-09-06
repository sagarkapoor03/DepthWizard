# models/ — local model weights (optional)

DEPTHWIZARD downloads the pretrained Depth Anything V2 checkpoint from
Hugging Face automatically on first use and caches it under
`~/.cache/huggingface` (in Docker: the `hf-cache` volume).

This folder is for **offline demonstrations**: pre-download the weights and
copy them here (git-ignored), then point `HF_HOME` or the transformers cache
at it when no network is available.

```bash
# pre-download (on a machine with internet)
python -c "from transformers import pipeline; pipeline('depth-estimation', model='depth-anything/Depth-Anything-V2-Small-hf')"
```

No model is trained in this project — see `docs/ai-model.md`.
