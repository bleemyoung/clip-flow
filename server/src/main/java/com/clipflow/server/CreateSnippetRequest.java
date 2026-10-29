package com.clipflow.server;

import jakarta.validation.constraints.NotBlank;

public record CreateSnippetRequest(
        @NotBlank String title,
        @NotBlank String content) {}
