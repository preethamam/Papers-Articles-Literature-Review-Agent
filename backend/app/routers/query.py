"""POST /query — RAG query with SSE streaming."""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.schemas import QueryRequest
from app.services.rag_agent import stream_query

router = APIRouter(prefix="/query", tags=["query"])


@router.post("")
async def query(req: QueryRequest):
    async def event_stream():
        async for chunk in stream_query(
            question=req.question,
            n_results=req.n_results,
            filters=req.filters,
            chat_history=req.chat_history,
        ):
            yield chunk

    return StreamingResponse(event_stream(), media_type="text/event-stream")
