package com.clipflow.server;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SnippetRepository extends JpaRepository<Snippet, UUID> {
    @Query(value = "SELECT * FROM snippets WHERE :keyword = '' "
            + "OR position(lower(:keyword) in lower(title)) > 0 "
            + "OR position(lower(:keyword) in lower(content)) > 0 "
            + "ORDER BY updated_at DESC, id DESC", nativeQuery = true)
    List<Snippet> search(@Param("keyword") String keyword);
}
