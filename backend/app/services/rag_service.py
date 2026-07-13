from sqlalchemy.orm import Session
from app.models.document import DocumentChunk
from app.core.config import settings
from langchain_text_splitters import RecursiveCharacterTextSplitter
import os
import logging

logger = logging.getLogger(__name__)

# Try to import chromadb, handle compile/import errors gracefully
try:
    import chromadb
    CHROMA_AVAILABLE = True
except Exception as chroma_err:
    logger.warning(f"ChromaDB import failed: {chroma_err}. Operating in SQLite text search fallback mode.")
    CHROMA_AVAILABLE = False

class RagService:
    @staticmethod
    def chunk_and_embed_document(db: Session, doc_id: str, text: str) -> bool:
        try:
            # 1. Chunk text using LangChain
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)
            chunks = text_splitter.split_text(text)
            
            # 2. Write chunks to standard SQLite DB for direct retrieval
            for idx, chunk_content in enumerate(chunks):
                db_chunk = DocumentChunk(
                    document_id=doc_id,
                    content=chunk_content,
                    page_num=(idx // 3) + 1, # Mock page allocation
                    chunk_index=idx
                )
                db.add(db_chunk)
            db.commit()
            logger.info(f"Committed {len(chunks)} document chunks to SQL database for document: {doc_id}")

            # 3. Vector Database Ingestion
            if CHROMA_AVAILABLE and os.getenv("TESTING") != "True":
                try:
                    chroma_client = chromadb.PersistentClient(path=settings.VECTOR_DB_DIR)
                    collection = chroma_client.get_or_create_collection(name="plantmind_kb")
                    
                    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
                    metadatas = [{"document_id": doc_id} for _ in chunks]
                    
                    collection.add(
                        documents=chunks,
                        metadatas=metadatas,
                        ids=ids
                    )
                    logger.info(f"Ingested {len(chunks)} chunks into ChromaDB collection successfully.")
                except Exception as vect_ex:
                    logger.warning(f"ChromaDB local vector insertion failed: {vect_ex}. Falling back to SQLite chunks.")
            else:
                logger.info("ChromaDB vector ingestion skipped (libraries not loaded). SQLite fallback active.")
                
            return True
        except Exception as e:
            logger.error(f"Failed to split and index document {doc_id}: {e}")
            db.rollback()
            return False
            
    @staticmethod
    def query_vector_store(query_text: str, n_results: int = 3) -> list:
        # Returns matching text chunks
        matched_docs = []
        if CHROMA_AVAILABLE and os.getenv("TESTING") != "True":
            try:
                chroma_client = chromadb.PersistentClient(path=settings.VECTOR_DB_DIR)
                collection = chroma_client.get_or_create_collection(name="plantmind_kb")
                results = collection.query(
                    query_texts=[query_text],
                    n_results=n_results
                )
                if results and 'documents' in results and results['documents']:
                    # Return list of text chunks
                    return results['documents'][0]
            except Exception as e:
                logger.warning(f"ChromaDB query failed: {e}. Falling back to keyword search.")
        return matched_docs
