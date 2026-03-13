import os
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from models.agent import AgentConfig, EMBEDDING_MODELS_BY_PROVIDER

def build_llm(config: AgentConfig):
    provider = config.llm.provider.lower()
    model = config.llm.model
    temp = config.llm.temperature
    # Prioritize output.max_length as the definitive limit, fallback to llm.max_tokens
    max_tokens = config.output.max_length or config.llm.max_tokens
    api_key = config.llm.api_key
    
    if provider == "openai":
        return ChatOpenAI(
            model=model, 
            temperature=temp, 
            max_tokens=max_tokens,
            api_key=api_key or os.getenv("OPENAI_API_KEY")
        )
    elif provider == "anthropic":
        return ChatAnthropic(
            model=model, 
            temperature=temp, 
            max_tokens=max_tokens,
            api_key=api_key or os.getenv("ANTHROPIC_API_KEY")
        )
    elif provider == "gemini":
        return ChatGoogleGenerativeAI(
            model=model,
            temperature=temp,
            max_output_tokens=max_tokens,
            google_api_key=api_key or os.getenv("GOOGLE_API_KEY")
        )
    else:
        try:
            from langchain_community.chat_models import ChatMistralAI
            if provider == "mistral":
                return ChatMistralAI(
                    model=model,
                    temperature=temp,
                    max_tokens=max_tokens,
                    mistral_api_key=api_key or os.getenv("MISTRAL_API_KEY")
                )
        except ImportError:
            pass
        raise ValueError(f"Unsupported provider: {provider}")

def build_agent(config: AgentConfig):
    llm = build_llm(config)
    
    rag_enabled = config.rag.enabled and config.rag.index_name
    
    system_prompt = config.prompt.system_prompt
    
    # Add Output Format Instructions
    if config.output.format == "JSON":
        system_prompt += "\n\nIMPORTANT: You MUST return your response strictly as a valid JSON object."
    elif config.output.format == "Markdown":
        system_prompt += "\n\nIMPORTANT: Use clear Markdown formatting with headers, bullet points, and bold text."
    
    if rag_enabled:
        if "{context}" not in system_prompt:
            system_prompt += "\n\nContext information is below.\n---------------------\n{context}\n---------------------\nGiven the context, answer the user only based on the provided context. If the answer is not in the context, say that you don't know."

    messages = [("system", system_prompt)]
    for ex in config.prompt.few_shot_examples:
        messages.append(("human", ex.user))
        messages.append(("ai", ex.assistant))
    
    messages.append(MessagesPlaceholder(variable_name="chat_history"))
    messages.append(("human", "{input}"))
    prompt = ChatPromptTemplate.from_messages(messages)

    if rag_enabled:
        rag = config.rag
        # 1. Setup Embeddings (Using Provider Key)
        embed_model = rag.embedding_model or "text-embedding-3-small"
        
        # Determine provider by checking lists
        provider = "openai"
        for p, models in EMBEDDING_MODELS_BY_PROVIDER.items():
            if embed_model in models:
                provider = p
                break
        
        if provider == "gemini":
            # Gemini Embedding: Use Gemini key from LLM or Env
            gemini_key = os.getenv("GOOGLE_API_KEY")
            if config.llm.provider.lower() == "gemini":
                gemini_key = config.llm.api_key or gemini_key
                
            embeddings = GoogleGenerativeAIEmbeddings(
                model=embed_model,
                google_api_key=gemini_key
            )
        else:
            # OpenAI Embedding: Use OpenAI key from LLM or Env
            openai_key = os.getenv("OPENAI_API_KEY")
            if config.llm.provider.lower() == "openai":
                openai_key = config.llm.api_key or openai_key

            embeddings = OpenAIEmbeddings(
                model=embed_model,
                api_key=openai_key
            )
            
        # 2. Setup Vector Store
        if rag.vector_db.lower() == "pinecone":
            from pinecone import Pinecone
            from langchain_pinecone import PineconeVectorStore
            pc = Pinecone(api_key=rag.api_key or os.getenv("PINECONE_API_KEY"))
            index = pc.Index(rag.index_name)
            vectorstore = PineconeVectorStore(index=index, embedding=embeddings)
        elif rag.vector_db.lower() == "qdrant":
            from qdrant_client import QdrantClient
            from langchain_qdrant import QdrantVectorStore, RetrievalMode
            client = QdrantClient(
                url=rag.url or os.getenv("QDRANT_URL"),
                api_key=rag.api_key or os.getenv("QDRANT_API_KEY")
            )
            
            if rag.search_type == "hybrid":
                from langchain_qdrant import FastEmbedSparse
                # Using a standard sparse model for hybrid search
                sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
                
                vectorstore = QdrantVectorStore(
                    client=client,
                    collection_name=rag.index_name,
                    embedding=embeddings,
                    sparse_embedding=sparse_embeddings,
                    vector_name=rag.dense_vector_name or "text-dense",
                    sparse_vector_name=rag.sparse_vector_name or "text-sparse",
                    retrieval_mode=RetrievalMode.HYBRID
                )
            else:
                vectorstore = QdrantVectorStore(
                    client=client,
                    collection_name=rag.index_name,
                    embedding=embeddings,
                    vector_name=rag.dense_vector_name or "text-dense"
                )
        elif rag.vector_db.lower() == "weaviate":
            import weaviate
            from langchain_weaviate import WeaviateVectorStore
            
            weaviate_url = rag.url or os.getenv("WEAVIATE_URL")
            if weaviate_url and not weaviate_url.startswith("http"):
                weaviate_url = f"https://{weaviate_url}"
                
            auth_config = None
            if rag.api_key or os.getenv("WEAVIATE_API_KEY"):
                auth_config = weaviate.classes.init.Auth.api_key(rag.api_key or os.getenv("WEAVIATE_API_KEY"))

            client = weaviate.connect_to_weaviate_cloud(
                cluster_url=weaviate_url,
                auth_credentials=auth_config
            )
            
            # Note: WeaviateVectorStore in langchain-weaviate doesn't close the client automatically
            # In a production app, you might want to manage the client lifecycle better
            vectorstore = WeaviateVectorStore(
                client=client,
                index_name=rag.index_name,
                text_key="text",
                embedding=embeddings
            )
        else:
            raise ValueError(f"Unsupported vector database: {rag.vector_db}")

        # Define threshold logic: avoid 'or' which fails for 0.0
        threshold = rag.similarity_threshold
        if threshold <= 0:
            retriever = vectorstore.as_retriever(
                search_type="similarity",
                search_kwargs={"k": rag.top_k}
            )
        else:
            retriever = vectorstore.as_retriever(
                search_type="similarity_score_threshold",
                search_kwargs={
                    "k": rag.top_k, 
                    "score_threshold": threshold
                }
            )
        
        print(f"DEBUG: Retriever setup - Type: {rag.search_type}, Threshold: {threshold}")
        
        question_answer_chain = create_stuff_documents_chain(llm, prompt)
        chain = create_retrieval_chain(retriever, question_answer_chain)
        return {"type": "rag", "chain": chain}
    else:
        chain = prompt | llm
        return {"type": "simple", "chain": chain}
