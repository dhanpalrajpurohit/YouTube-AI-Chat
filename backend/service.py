import os
from youtube_transcript_api import YouTubeTranscriptApi
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser
from config import get_settings

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────
settings = get_settings()

def get_gemini_api_key():
    api_key = settings.gemini_api_key,
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found in environment variables.")
    return api_key


def get_huggingface_api_key():
    api_key = settings.huggingface_api_key
    if not api_key:
        raise ValueError("HUGGINGFACE_API_KEY not found in environment variables.")
    return api_key



def fetch_transcript(video_id: str) -> str:
    """Fetches the transcript for a given YouTube video ID."""
    try:
        api = YouTubeTranscriptApi()
        try:
            transcript = api.fetch(video_id, languages=["en", "en-US", "en-GB"])
        except Exception:
            transcript_list = api.list(video_id)
            first_transcript = next(iter(transcript_list))
            transcript = first_transcript.fetch()
        full_transcript = " ".join([snippet.text for snippet in transcript])
        return full_transcript
    except Exception as e:
        print(f"Error fetching transcript for {video_id}: {e}")
        raise e


def process_and_store_video(video_id: str):

    transcript_text = fetch_transcript(video_id)

    print(f"[Step 1a] Fetched transcript: {len(transcript_text)} chars")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = splitter.create_documents([transcript_text])
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-mpnet-base-v2"
    )
    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=settings.chroma_persist_directory,
        collection_name=video_id,
    )
    print(
        f"[Step 1c/1d] Stored {len(chunks)} chunks "
        f"in ChromaDB collection '{video_id}'"
    )

    return True


def format_docs(retrieved_docs):
    """Joins retrieved document contents with double newlines (same as reference code)."""
    context_text = "\n\n".join(doc.page_content for doc in retrieved_docs)
    return context_text


def generate_chat_response(video_id: str, query: str) -> str:

    api_key = get_gemini_api_key()
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-mpnet-base-v2"
    )
    vector_store = Chroma(
        persist_directory=settings.chroma_persist_directory,
        embedding_function=embeddings,
        collection_name=video_id,
    )
    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 4},
    )

    print(f"[Step 2] Retriever ready for collection '{video_id}'")


    llm = ChatGoogleGenerativeAI(
        model="gemini-3.8-flash",
        google_api_key=settings.gemini_api_key,
    )
    prompt = PromptTemplate(
        template="""
            You are a helpful assistant.
            Answer ONLY from the provided transcript context.
            If the context is insufficient, just say you don't know.
            Context:
            {context}
            Question:
            {question}
        """,
        input_variables=["context", "question"],
    )

    # Step 4: Chain

    parallel_chain = RunnableParallel(
        {
            "context": retriever | RunnableLambda(format_docs),
            "question": RunnablePassthrough(),
        }
    )
    parser = StrOutputParser()
    main_chain = parallel_chain | prompt | llm | parser
    answer = main_chain.invoke(query)
    return answer
