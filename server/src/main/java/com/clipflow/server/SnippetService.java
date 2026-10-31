package com.clipflow.server;

import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SnippetService {
    private final SnippetRepository repository;
    private final SnippetUploadAttemptRepository attempts;
    private final EntityManager entityManager;

    public SnippetService(SnippetRepository repository, SnippetUploadAttemptRepository attempts,
            EntityManager entityManager) {
        this.repository = repository;
        this.attempts = attempts;
        this.entityManager = entityManager;
    }

    @Transactional
    public SnippetResponse create(CreateSnippetRequest request, String idempotencyKey) {
        String title = normalizedTitle(request);

        if (idempotencyKey == null) {
            return createNew(title, request.content());
        }

        UUID key = UUID.fromString(idempotencyKey);
        entityManager.createNativeQuery(
                "SELECT pg_advisory_xact_lock(hashtextextended(CAST(:key AS text), 0))")
                .setParameter("key", key.toString())
                .getSingleResult();

        var existing = attempts.findById(key);
        if (existing.isPresent()) {
            if (!existing.get().matches(title, request.content())) {
                throw new IdempotencyConflictException();
            }
            return existing.get().originalResponse();
        }

        Snippet snippet = repository.save(new Snippet(title, request.content(), now()));
        attempts.save(new SnippetUploadAttempt(key, snippet));
        return SnippetResponse.from(snippet);
    }

    @Transactional
    public SnippetResponse update(String id, CreateSnippetRequest request) {
        String title = normalizedTitle(request);
        Snippet snippet = repository.findById(UUID.fromString(id))
                .orElseThrow(SnippetNotFoundException::new);
        snippet.update(title, request.content());
        return SnippetResponse.from(snippet);
    }

    @Transactional(readOnly = true)
    public List<SnippetResponse> search(String keyword) {
        String normalized = keyword == null ? "" : keyword.trim();
        return repository.search(normalized).stream().map(SnippetResponse::from).toList();
    }

    private SnippetResponse createNew(String title, String content) {
        return SnippetResponse.from(repository.save(new Snippet(title, content, now())));
    }

    private String normalizedTitle(CreateSnippetRequest request) {
        String title = request.title().strip();
        if (title.isEmpty() || title.length() > 255) {
            throw new IllegalArgumentException("title must contain 1 to 255 characters after trimming");
        }
        return title;
    }

    private Instant now() {
        return Instant.now().truncatedTo(ChronoUnit.MICROS);
    }
}
