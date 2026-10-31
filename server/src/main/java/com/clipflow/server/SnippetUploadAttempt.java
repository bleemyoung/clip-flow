package com.clipflow.server;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "snippet_upload_attempts")
public class SnippetUploadAttempt {
    @Id
    @Column(name = "request_key")
    private UUID requestKey;

    @Column(name = "request_title", nullable = false, length = 255)
    private String requestTitle;

    @Column(name = "request_content", nullable = false, columnDefinition = "text")
    private String requestContent;

    @Column(name = "snippet_id", nullable = false, unique = true)
    private UUID snippetId;

    @Column(name = "response_created_at", nullable = false)
    private Instant responseCreatedAt;

    @Column(name = "response_updated_at", nullable = false)
    private Instant responseUpdatedAt;

    protected SnippetUploadAttempt() {}

    public SnippetUploadAttempt(UUID requestKey, Snippet snippet) {
        this.requestKey = requestKey;
        this.requestTitle = snippet.getTitle();
        this.requestContent = snippet.getContent();
        this.snippetId = snippet.getId();
        this.responseCreatedAt = snippet.getCreatedAt();
        this.responseUpdatedAt = snippet.getUpdatedAt();
    }

    public boolean matches(String title, String content) {
        return requestTitle.equals(title) && requestContent.equals(content);
    }

    public SnippetResponse originalResponse() {
        return new SnippetResponse(snippetId, requestTitle, requestContent,
                responseCreatedAt, responseUpdatedAt);
    }
}
