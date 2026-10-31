package com.clipflow.server;

public class SnippetNotFoundException extends RuntimeException {
    public SnippetNotFoundException() {
        super("Snippet not found");
    }
}
