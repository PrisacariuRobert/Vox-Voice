"""
YOLO + CLIP + OpenAI Photo Search Server for Claw Voice.

Two-stage pipeline per batch:
  1. YOLO+CLIP scores images locally (fast, free)
  2. Candidates above threshold → verified by OpenAI vision (accurate)

All logs visible in one terminal.

Usage:
    cd yolo-server && source venv/bin/activate
    OPENAI_API_KEY=sk-... python server.py

Runs on port 18790.
"""

import base64
import io
import json
import os
import time
from pathlib import Path
from flask import Flask, request, jsonify
from PIL import Image

# Load .env file if present
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))

# ─── Load models ────────────────────────────────────────────────────────

model = None
try:
    from ultralytics import YOLO
    model = YOLO("yolo11n.pt")
    print("✅ YOLO model loaded")
except ImportError:
    print("⚠️  ultralytics not installed")
except Exception as e:
    print(f"⚠️  YOLO load error: {e}")

clip_model = None
clip_preprocess = None
clip_tokenize = None
torch_device = "cpu"
try:
    import torch
    import clip
    torch_device = "mps" if torch.backends.mps.is_available() else "cpu"
    clip_model, clip_preprocess = clip.load("ViT-B/32", device=torch_device)
    clip_tokenize = clip.tokenize
    print(f"✅ CLIP model loaded on {torch_device}")
except ImportError:
    print("⚠️  CLIP not installed")
except Exception as e:
    print(f"⚠️  CLIP load error: {e}")

# OpenAI API key from env
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
if OPENAI_API_KEY:
    print("✅ OpenAI API key loaded")
else:
    print("⚠️  No OPENAI_API_KEY set — verification disabled, will use YOLO-only")

app = Flask(__name__)

# ─── Helpers ────────────────────────────────────────────────────────────


def decode_image(base64_str: str) -> Image.Image:
    img_bytes = base64.b64decode(base64_str)
    return Image.open(io.BytesIO(img_bytes)).convert("RGB")


def yolo_detect(img: Image.Image) -> list[str]:
    if not model:
        return []
    results = model(img, verbose=False)
    labels = []
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            label = model.names[cls_id]
            conf = float(box.conf[0])
            if conf > 0.25:
                labels.append(label)
    return labels


def clip_multi_score(img: Image.Image, query: str) -> float:
    if not clip_model or not clip_preprocess or not clip_tokenize:
        return 0.0
    import torch

    prompts = [
        query,
        f"a photo of {query}",
        f"an image showing {query}",
        f"a photograph of {query}",
    ]
    device = next(clip_model.parameters()).device
    image_input = clip_preprocess(img).unsqueeze(0).to(device)
    text_inputs = clip_tokenize(prompts, truncate=True).to(device)

    with torch.no_grad():
        image_features = clip_model.encode_image(image_input)
        text_features = clip_model.encode_text(text_inputs)
        image_features /= image_features.norm(dim=-1, keepdim=True)
        text_features /= text_features.norm(dim=-1, keepdim=True)
        similarities = (image_features @ text_features.T).squeeze(0)
        best_score = similarities.max().item()
    return best_score


def yolo_label_boost(labels: list[str], query: str) -> float:
    if not labels:
        return 0.0
    query_lower = query.lower()
    boost = 0.0
    for label in labels:
        ll = label.lower()
        if ll in query_lower or query_lower in ll:
            boost = max(boost, 0.08)
        vehicle_words = {"car", "truck", "bus", "motorcycle", "bicycle", "boat", "airplane", "train"}
        animal_words = {"dog", "cat", "bird", "horse", "cow", "sheep", "bear", "elephant", "zebra", "giraffe"}
        if ll in vehicle_words and any(w in query_lower for w in vehicle_words | {"vehicle", "driving", "road", "racing", "f1", "formula"}):
            boost = max(boost, 0.05)
        if ll in animal_words and any(w in query_lower for w in animal_words | {"animal", "pet", "wildlife"}):
            boost = max(boost, 0.05)
        if ll == "person" and any(w in query_lower for w in {"person", "people", "selfie", "portrait", "face", "man", "woman", "child"}):
            boost = max(boost, 0.05)
    return boost


def verify_with_openai(query: str, images_b64: list[str], indices: list[int]) -> list[int]:
    """
    Send candidate images to OpenAI for strict verification.
    Returns list of original indices that were confirmed.
    """
    if not OPENAI_API_KEY or not images_b64:
        return indices  # no key → return all candidates unverified

    import requests as req

    confirmed = []
    BATCH = 5

    for i in range(0, len(images_b64), BATCH):
        batch_imgs = images_b64[i:i + BATCH]
        batch_indices = indices[i:i + BATCH]

        content = [
            {
                "type": "input_text",
                "text": (
                    f"You are a photo search assistant. The user is searching their personal photo library.\n\n"
                    f'USER SEARCH QUERY: "{query}"\n\n'
                    f"I will show you {len(batch_imgs)} candidate photos (numbered 1 to {len(batch_imgs)}).\n\n"
                    f"Guidelines:\n"
                    f"- Match the ACTUAL SUBJECT of the query — the real thing, not merchandise, toys, drawings, or screenshots of it.\n"
                    f"- The subject can appear partially, in the background, or at an angle — that's fine.\n"
                    f"- Reject photos that only show related/tangential items but not the actual subject.\n\n"
                    f"Return ONLY a JSON array of matching photo numbers (1-indexed).\n"
                    f"Example: [1, 3]\n"
                    f"If NONE match: []\n"
                    f"No explanation, just the JSON array."
                ),
            }
        ]

        for j, img_b64 in enumerate(batch_imgs):
            content.append({"type": "input_text", "text": f"Photo {j + 1}:"})
            content.append({
                "type": "input_image",
                "image_url": f"data:image/jpeg;base64,{img_b64}",
            })

        try:
            for j, img_b64 in enumerate(batch_imgs):
                print(f"  📎 Image {j+1}: {len(img_b64)} chars base64 (starts with: {img_b64[:20]}...)")
            print(f"  📤 Sending batch {i // BATCH + 1} ({len(batch_imgs)} photos) to OpenAI for: \"{query}\"")
            t0 = time.time()
            payload = {
                "model": "gpt-4.1-mini",
                "input": [{"role": "user", "content": content}],
            }
            resp = req.post(
                "https://api.openai.com/v1/responses",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=30,
            )
            elapsed = time.time() - t0

            if not resp.ok:
                print(f"  ❌ OpenAI error {resp.status_code}: {resp.text[:500]}")
                confirmed.extend(batch_indices)  # on error, keep candidates
                continue

            data = resp.json()
            # Log full response keys to debug
            print(f"  🔑 Response keys: {list(data.keys())}")
            text = data.get("output_text", "")
            if not text:
                # Try to extract from output array
                for item in data.get("output", []):
                    if item.get("type") == "message":
                        for c in item.get("content", []):
                            if c.get("type") == "output_text":
                                text = c.get("text", "")
                            elif c.get("type") == "text":
                                text = c.get("text", "")
                if not text:
                    print(f"  🔍 Full response: {json.dumps(data, indent=2)[:1000]}")
                    text = "[]"
            print(f"  💬 OpenAI response: {text}")
            import re
            arr_match = re.search(r"\[[\d\s,]*\]", text)
            if arr_match:
                nums = json.loads(arr_match.group())
                for num in nums:
                    idx = num - 1
                    if 0 <= idx < len(batch_indices):
                        confirmed.append(batch_indices[idx])
                print(f"  ✅ OpenAI verified batch {i // BATCH + 1}: "
                      f"{len(nums)}/{len(batch_imgs)} confirmed ({elapsed:.1f}s)")
            else:
                print(f"  ⚠️  OpenAI returned unexpected: {text[:100]}")
                confirmed.extend(batch_indices)

        except Exception as e:
            print(f"  ❌ OpenAI exception: {e}")
            confirmed.extend(batch_indices)

    return confirmed


# ─── Endpoints ──────────────────────────────────────────────────────────


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "yolo": model is not None,
        "clip": clip_model is not None,
        "openai": bool(OPENAI_API_KEY),
    })


@app.route("/search", methods=["POST"])
def search():
    """
    Full pipeline: YOLO+CLIP scoring → OpenAI verification.

    Request:
    {
        "query": "F1 car from Mercedes",
        "images": ["base64...", ...],
        "threshold": 0.20,
        "top_k": 10,
        "verify": true          // set false to skip OpenAI verification
    }

    Response:
    {
        "matches": [0, 3],          // indices confirmed by OpenAI
        "candidates": [0, 3, 7],    // YOLO candidates before verification
        "details": [...]            // all scores sorted
    }
    """
    data = request.get_json()
    query = data.get("query", "")
    images_b64 = data.get("images", [])
    threshold = data.get("threshold", 0.20)
    top_k = data.get("top_k", 10)
    do_verify = data.get("verify", True)

    if not query or not images_b64:
        return jsonify({"matches": [], "candidates": [], "error": "Missing query or images"})

    t_start = time.time()
    print(f"\n🔍 Search: \"{query}\" ({len(images_b64)} images, threshold={threshold})")

    # ── Stage 1: YOLO + CLIP scoring ──────────────────────────────────
    scored = []
    for idx, img_b64 in enumerate(images_b64):
        try:
            img = decode_image(img_b64)
            yolo_labels = yolo_detect(img)
            c_score = clip_multi_score(img, query)
            boost = yolo_label_boost(yolo_labels, query)
            final_score = c_score + boost

            detail = {
                "index": idx,
                "yolo_labels": yolo_labels,
                "clip_score": round(c_score, 4),
                "boost": round(boost, 4),
                "final_score": round(final_score, 4),
            }
            scored.append((idx, final_score, detail))
        except Exception as e:
            scored.append((idx, 0.0, {"index": idx, "error": str(e)}))

    scored.sort(key=lambda x: x[1], reverse=True)

    # Pick candidates using gap detection
    candidates = []
    if scored and scored[0][1] >= threshold:
        candidates.append(scored[0][0])
        best_score = scored[0][1]
        for i in range(1, min(len(scored), top_k)):
            curr = scored[i][1]
            prev = scored[i - 1][1]
            if curr < threshold:
                break
            if curr < best_score * 0.80:
                break
            if (prev - curr) > 0.03:
                break
            candidates.append(scored[i][0])

    t_yolo = time.time() - t_start
    print(f"  📊 YOLO+CLIP: {len(candidates)} candidates from {len(images_b64)} images ({t_yolo:.2f}s)")
    for c_idx in candidates:
        detail = next(s[2] for s in scored if s[0] == c_idx)
        print(f"     #{c_idx}: score={detail['final_score']} yolo={detail['yolo_labels']}")

    # ── Stage 2: OpenAI verification ──────────────────────────────────
    if do_verify and candidates and OPENAI_API_KEY:
        candidate_images = [images_b64[i] for i in candidates]
        matches = verify_with_openai(query, candidate_images, candidates)
        t_total = time.time() - t_start
        print(f"  🎯 Final: {len(matches)} verified from {len(candidates)} candidates ({t_total:.2f}s)")
    else:
        matches = candidates
        if not do_verify:
            print(f"  ⏭️  Verification skipped")
        elif not OPENAI_API_KEY:
            print(f"  ⏭️  No API key — returning YOLO results unverified")

    details = [s[2] for s in scored]
    return jsonify({
        "matches": matches,
        "candidates": candidates,
        "details": details,
        "verified": do_verify and bool(OPENAI_API_KEY),
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 18790))
    print(f"\n🔍 YOLO Photo Search Server starting on port {port}")
    print(f"   YOLO:   {'✅' if model else '❌'}")
    print(f"   CLIP:   {'✅' if clip_model else '❌'}")
    print(f"   OpenAI: {'✅' if OPENAI_API_KEY else '❌ (set OPENAI_API_KEY)'}")
    print(f"\n   Test: curl http://localhost:{port}/health\n")
    app.run(host="0.0.0.0", port=port, debug=False)
