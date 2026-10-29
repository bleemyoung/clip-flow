package com.clipflow.server;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
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

    @BeforeEach
    void clearSnippets() {
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

    private JsonNode create(String title, String content) throws Exception {
        String request = objectMapper.writeValueAsString(new CreateSnippetRequest(title, content));
        String response = mvc.perform(post("/api/snippets")
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isCreated())
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
