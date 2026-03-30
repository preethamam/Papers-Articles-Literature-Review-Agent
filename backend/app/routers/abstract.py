"""Abstract generation endpoints."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.schemas import PaperAbstractRequest, StructuredAbstract, SynthesisRequest
from app.services.abstract_service import generate_paper_abstract, stream_synthesis

router = APIRouter(prefix="/abstract", tags=["abstract"])


@router.post("/paper/{paper_id}", response_model=StructuredAbstract)
def paper_abstract(paper_id: str, req: PaperAbstractRequest = PaperAbstractRequest()):
    try:
        return generate_paper_abstract(paper_id, force_regenerate=req.force_regenerate)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/synthesis")
async def synthesis(req: SynthesisRequest):
    async def event_stream():
        async for chunk in stream_synthesis(
            query=req.query,
            n_results=req.n_results,
            style=req.style,
        ):
            yield chunk

    return StreamingResponse(event_stream(), media_type="text/event-stream")
