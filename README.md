# Lyzr-style Agent Configuration Studio

A powerful React + FastAPI application to build, configure, and test LangChain agents.

## Built with
- **Frontend**: React (Vite), Tailwind CSS, shadcn/ui, Zustand
- **Backend**: FastAPI, LangChain, Pydantic
- **Vector DB**: Pinecone (Optional for RAG)

## Setup

### Backend
1. Go to `backend/`
2. Create virtual environment: `python -m venv venv`
3. Activate: `venv\Scripts\activate` (Windows)
4. Install: `pip install -r requirements.txt`
5. Run: `python main.py`

### Frontend
1. Go to `frontend/`
2. Install: `npm install`
3. Run: `npm run dev`

### Environment Variables
Copy `.env.example` to `.env` in the root and add your API keys.
