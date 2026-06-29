from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "phase": "mvp"}


@router.post("/remove-bg")
async def remove_bg():
    return {"status": "not_implemented", "phase": 2}


@router.post("/reduce-colors")
async def reduce_colors():
    return {"status": "not_implemented", "phase": 2}
