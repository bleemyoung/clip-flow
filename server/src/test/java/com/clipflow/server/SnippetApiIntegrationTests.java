package com.clipflow.server;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class SnippetApiIntegrationTests {
    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired SnippetRepository repository;
    @Autowired SnippetUploadAttemptRepository attempts;

    @BeforeEach
    void clearSnippets() {
        attempts.deleteAll();
        repository.deleteAll();
    }

    @Test
    void createsAndReloadsSnippetFromPostgres() throws Exception {
        JsonNode created = create("  Greeting  ", "line one\n  line two  ");
        assertThat(UUID.fromString(created.get("id").asText())).isNotNull();
        assertThat(created.get("title").asText()).isEqualTo("Greeting");
        assertThat(created.get("content").asText()).isEqualTo("line one\n  line two  ");
        assertThat(created.get("createdAt").asText()).endsWith("Z");
        assertThat(created.get("updatedAt").asText()).isEqualTo(created.get("createdAt").asText());

        mvc.perform(get("/api/snippets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(created.get("id").asText()))
                .andExpect(jsonPath("$[0].createdAt").value(created.get("createdAt").asText()))
                .andExpect(jsonPath("$[0].content").value("line one\n  line two  "));
        assertThat(repository.findById(UUID.fromString(created.get("id").asText()))).isPresent();
    }

    @Test
    void returnsEmptyArrayForEmptyDatabase() throws Exception {
        mvc.perform(get("/api/snippets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void searchesTitleAndContentIgnoringCaseAndReturnsEmptyArray() throws Exception {
        create("Alpha", "first body");
        create("Beta", "second ALPHA body");
        create("Gamma", "other");

        mvc.perform(get("/api/snippets").param("keyword", "aLpHa"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/snippets").param("keyword", "missing"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/snippets").param("keyword", "   "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    void listsNewestFirst() throws Exception {
        JsonNode first = create("First", "one");
        JsonNode second = create("Second", "two");
        mvc.perform(get("/api/snippets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(second.get("id").asText()))
                .andExpect(jsonPath("$[1].id").value(first.get("id").asText()));
    }

    @Test
    void rejectsBlankAndTooLongTitleWithoutPersisting() throws Exception {
        reject("{\"title\":\"   \",\"content\":\"text\"}");
        reject("{\"title\":\"ok\",\"content\":\" \\n  \"}");
        reject(objectMapper.writeValueAsString(new CreateSnippetRequest("x".repeat(256), "text")));
        reject("{invalid json");
        assertThat(repository.count()).isZero();
    }

    @Test
    void keyedCreateReturnsOriginalResponseAfterUpdateAndRejectsChangedPayload() throws Exception {
        String key = UUID.randomUUID().toString();
        JsonNode created = createWithKey("  Original  ", "first body", key);
        String id = created.get("id").asText();

        JsonNode updated = update(id, "Changed", "second body");
        assertThat(updated.get("id").asText()).isEqualTo(id);
        assertThat(updated.get("createdAt").asText()).isEqualTo(created.get("createdAt").asText());
        assertThat(updated.get("updatedAt").asText()).isNotEqualTo(created.get("updatedAt").asText());

        JsonNode retry = createWithKey("Original", "first body", key);
        assertThat(retry).isEqualTo(created);
        assertThat(repository.count()).isEqualTo(1);

        mvc.perform(post("/api/snippets")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Original\",\"content\":\"different\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));
        assertThat(repository.count()).isEqualTo(1);
    }

    @Test
    void concurrentRetriesWithOneKeyCreateOnlyOneSnippet() throws Exception {
        String key = UUID.randomUUID().toString();
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> {
                start.await();
                return createWithKey("Shared", "same body", key);
            });
            var second = executor.submit(() -> {
                start.await();
                return createWithKey("Shared", "same body", key);
            });
            start.countDown();

            assertThat(first.get(10, TimeUnit.SECONDS)).isEqualTo(second.get(10, TimeUnit.SECONDS));
        }
        assertThat(repository.count()).isEqualTo(1);
        assertThat(attempts.count()).isEqualTo(1);
    }

    @Test
    void differentKeysCanCreateIdenticalContent() throws Exception {
        JsonNode first = createWithKey("Same", "same body", UUID.randomUUID().toString());
        JsonNode second = createWithKey("Same", "same body", UUID.randomUUID().toString());

        assertThat(first.get("id").asText()).isNotEqualTo(second.get("id").asText());
        assertThat(repository.count()).isEqualTo(2);
        assertThat(attempts.count()).isEqualTo(2);
    }

    @Test
    void updateChangesExistingSnippetOnlyOnceAndReportsMissingTarget() throws Exception {
        JsonNode created = create("Original", "first body");
        String id = created.get("id").asText();

        JsonNode updated = update(id, "  Changed  ", "second body");
        JsonNode repeated = update(id, "Changed", "second body");
        assertThat(updated).isEqualTo(repeated);
        assertThat(repository.count()).isEqualTo(1);
        assertThat(updated.get("title").asText()).isEqualTo("Changed");

        mvc.perform(post("/api/snippets/{id}/update", UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Missing\",\"content\":\"text\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mvc.perform(post("/api/snippets/{id}/update", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"   \",\"content\":\"text\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        assertThat(repository.count()).isEqualTo(1);
    }

    private JsonNode create(String title, String content) throws Exception {
        String request = objectMapper.writeValueAsString(new CreateSnippetRequest(title, content));
        String response = mvc.perform(post("/api/snippets")
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }

    private JsonNode createWithKey(String title, String content, String key) throws Exception {
        String request = objectMapper.writeValueAsString(new CreateSnippetRequest(title, content));
        String response = mvc.perform(post("/api/snippets")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }

    private JsonNode update(String id, String title, String content) throws Exception {
        String request = objectMapper.writeValueAsString(new CreateSnippetRequest(title, content));
        String response = mvc.perform(post("/api/snippets/{id}/update", id)
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }

    private void reject(String body) throws Exception {
        mvc.perform(post("/api/snippets")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.timestamp").exists());
    }
}
