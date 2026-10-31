package com.clipflow.server;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SnippetUploadAttemptRepository extends JpaRepository<SnippetUploadAttempt, UUID> {}
