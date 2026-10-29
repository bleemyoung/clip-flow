package com.clipflow.server;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/snippets")
public class SnippetController {
    private final SnippetService service;

    public SnippetController(SnippetService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a snippet")
    @ApiResponse(responseCode = "400", description = "Invalid title, content, or JSON body",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ApiError.class),
                    examples = @ExampleObject(value = """
                            {"code":"INVALID_REQUEST","message":"Invalid snippet",
                             "fields":{"title":"must not be blank"},"timestamp":"2026-10-29T15:00:00Z"}
                            """)))
    public SnippetResponse create(@Valid @RequestBody CreateSnippetRequest request) {
        return service.create(request);
    }

    @GetMapping
    public List<SnippetResponse> search(@RequestParam(required = false) String keyword) {
        return service.search(keyword);
    }
}
