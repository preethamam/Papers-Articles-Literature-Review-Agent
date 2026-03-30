"""POST /ingest — trigger ETL pipeline with SSE progress streaming."""

import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.etl.pipeline import run_pipeline
from app.models.schemas import IngestRequest

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("")
async def ingest(req: IngestRequest):
    async def event_stream():
        async for event in run_pipeline(
            folder_paths=req.folder_paths,
            reprocess=req.reprocess,
        ):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
