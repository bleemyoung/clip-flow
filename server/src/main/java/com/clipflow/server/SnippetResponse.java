package com.clipflow.server;

import java.time.Instant;
import java.util.UUID;

public record SnippetResponse(UUID id, String title, String content, Instant createdAt, Instant updatedAt) {
    public static SnippetResponse from(Snippet snippet) {
        return new SnippetResponse(snippet.getId(), snippet.getTitle(), snippet.getContent(),
                snippet.getCreatedAt(), snippet.getUpdatedAt());
    }
}
