# 1. Use Postgres with pgvector for retrieval

Status: accepted

## Context

Each assistant answers from its owner's documents. A question is embedded, the closest chunks are found, and the model answers from them. The vectors need a home, and the app already needs a relational database for users, assistants, documents, conversations and rate limits.

## Decision

Store embeddings in the same Neon Postgres database, in a `vector(1536)` column on `chunks`, and search with pgvector's cosine-distance operator (`<=>`). An HNSW index with `vector_cosine_ops` (migration `0001`) lets the search avoid scanning every row.

## Consequences

- One database to run, back up, branch (Neon) and secure. Tenant isolation is a plain `where assistant_id = ...`, and deleting a document or an assistant cascades to its chunks.
- Document and chunks are written together in one `db.batch` transaction, which a separate vector store could not offer.
- The query needs no second network hop, and the schema, the index and the data stay versioned together in `drizzle/`.
- A dedicated vector database would scale further and offer more tuning, but at the size of this project it would add a service, a sync problem and a second place to enforce tenant isolation.
- Approximate (HNSW) search combined with a `where assistant_id` filter can return fewer rows than asked for when one tenant's chunks are a small part of a large table, because the filter runs on the candidates the index returns. pgvector 0.8 offers iterative index scans for this; the project does not need it at its current size and should enable it before the table holds many tenants.
- The embedding model fixes the dimension (1536). Changing models means re-embedding every chunk and a migration.
