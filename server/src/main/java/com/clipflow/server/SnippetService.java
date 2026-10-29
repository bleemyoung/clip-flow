package com.clipflow.server;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SnippetService {
    private final SnippetRepository repository;

    public SnippetService(SnippetRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public SnippetResponse create(CreateSnippetRequest request) {
        String title = request.title().strip();
        if (title.isEmpty() || title.length() > 255) {
            throw new IllegalArgumentException("title must contain 1 to 255 characters after trimming");
        }
        Snippet snippet = repository.save(new Snippet(title, request.content(),
                Instant.now().truncatedTo(ChronoUnit.MICROS)));
        return SnippetResponse.from(snippet);
    }

    @Transactional(readOnly = true)
    public List<SnippetResponse> search(String keyword) {
        String normalized = keyword == null ? "" : keyword.trim();
        return repository.search(normalized).stream().map(SnippetResponse::from).toList();
    }
}
