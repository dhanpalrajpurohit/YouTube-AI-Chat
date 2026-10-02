Setup Application

Need to Add Variables in .env file.

VITE_YOUTUBE_API_KEY=<API_KEY>
VITE_BACKEND_URL=<API_KEY>
GOOGLE_API_KEY=<API_KEY>
HUGGINGFACE_API_KEY=<API_KEY>

Run Command:

docker build -t youtube-rag-backend .

docker run --name youtube-rag-backend . -p 8000:8000 `--env-file .env ` -v "${PWD}/chroma_db:/app/chroma_db" ` youtube-rag-backend