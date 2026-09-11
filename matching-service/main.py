from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
from supabase import create_client
import json
import os
import numpy as np

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

MATCH_THRESHOLD = 0.75  # abhi ke liye ek starting point

class Detection(BaseModel):
    face_id: str
    embedding: List[float]
    camera_id: str
    timestamp: str
    snapshot_path: str

def cosine_similarity(vec1, vec2):
    vec1 = np.array(vec1)
    vec2 = np.array(vec2)
    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    return dot_product / (norm1 * norm2)

@app.post("/detections")
async def receive_detection(detection: Detection):
    print("Received detection from:", detection.camera_id)

    # Step 1: detection ko save karo
    detection_result = supabase.table("detections").insert({
        "embedding": detection.embedding,
        "frame_snapshot_path": detection.snapshot_path,
        "detected_at": detection.timestamp,
    }).execute()

    detection_id = detection_result.data[0]["id"]

    # Step 2: saare reference photos (embeddings) nikalo
    references = supabase.table("reference_photos").select("person_id, embedding").execute()

    best_match_person_id = None
    best_score = 0

    # Step 3: har ek se compare karo
    for ref in references.data:
     if ref["embedding"] is None:
        continue

    # Agar embedding string ki tarah aayi hai, usay list mein convert karo
    ref_embedding = ref["embedding"]
    if isinstance(ref_embedding, str):
        ref_embedding = json.loads(ref_embedding)

    score = cosine_similarity(detection.embedding, ref_embedding)
    print(f"Comparing with person {ref['person_id']}: similarity = {score:.4f}")

    if score > best_score:
        best_score = score
        best_match_person_id = ref["person_id"]

    # Step 4: agar threshold cross ho, alert banao
    if best_score >= MATCH_THRESHOLD:
        supabase.table("alerts").insert({
            "detection_id": detection_id,
            "matched_person_id": best_match_person_id,
            "confidence_score": float(best_score),
            "status": "open",
        }).execute()
        print(f"ALERT CREATED — match found with score {best_score:.4f}")
        return {"status": "match_found", "confidence": best_score}

    print("No match found above threshold")
    return {"status": "no_match", "best_score": best_score}