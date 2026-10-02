from pydantic import BaseModel, Field


class VideoRequest(BaseModel):
    video_id: str = Field(
        ...,
        min_length=1,
        max_length=20,
        description="YouTube video ID",
    )


class ChatRequest(BaseModel):
    video_id: str = Field(
        ...,
        min_length=1,
        max_length=20,
    )

    query: str = Field(
        ...,
        min_length=1,
        max_length=2000,
    )