import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool

from config import get_settings
from schemas import VideoRequest, ChatRequest

from service import (
    process_and_store_video,
    generate_chat_response,
)


# --------------------------------------------------
# Configuration
# --------------------------------------------------

settings = get_settings()


# --------------------------------------------------
# Logging
# --------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger(__name__)

# --------------------------------------------------
# Application lifespan
# --------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s", settings.app_name)

    # Initialize resources here if required.
    # Example:
    # initialize_vector_store()
    # initialize_embeddings()

    yield

    logger.info("Shutting down %s", settings.app_name)


# --------------------------------------------------
# FastAPI application
# --------------------------------------------------

app = FastAPI(title="YouTube RAG Chatbot API")

# Configure CORS so the frontend can communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.environment,
    }



# --------------------------------------------------
# Root
# --------------------------------------------------

@app.get("/", tags=["Health"])
async def root():
    return {
        "message": f"{settings.app_name} is running"
    }


# --------------------------------------------------
# Process YouTube video
# --------------------------------------------------

@app.post(
    "/api/process-video",
    status_code=status.HTTP_200_OK,
    tags=["RAG"],
)
async def process_video(request: VideoRequest):
    """
    Fetch YouTube transcript, split it into chunks,
    create embeddings, and store them in ChromaDB.
    """

    logger.info(
        "Processing YouTube video: %s",
        request.video_id,
    )

    try:
        # RAG functions are synchronous/blocking,
        # therefore run them in a thread pool.
        await run_in_threadpool(
            process_and_store_video,
            request.video_id,
        )

        return {
            "status": "success",
            "message": "Video processed successfully.",
            "video_id": request.video_id,
        }

    except ValueError as exc:
        logger.warning(
            "Invalid video %s: %s",
            request.video_id,
            exc,
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except Exception:
        logger.exception(
            "Failed to process video %s",
            request.video_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process the video.",
        )


# --------------------------------------------------
# Chat
# --------------------------------------------------

@app.post(
    "/api/chat",
    status_code=status.HTTP_200_OK,
    tags=["Chat"],
)
async def chat(request: ChatRequest):
    """
    Search the vector database for relevant transcript
    chunks and generate an answer using the LLM.
    """

    logger.info(
        "Chat request for video: %s",
        request.video_id,
    )

    try:
        answer = await run_in_threadpool(
            generate_chat_response,
            request.video_id,
            request.query,
        )

        return {
            "status": "success",
            "video_id": request.video_id,
            "query": request.query,
            "response": answer,
        }

    except ValueError as exc:
        logger.warning(
            "Invalid chat request: %s",
            exc,
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except Exception:
        logger.exception(
            "Chat generation failed for video %s",
            request.video_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate response.",
        )
