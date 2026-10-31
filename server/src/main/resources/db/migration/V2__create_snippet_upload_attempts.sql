CREATE TABLE snippet_upload_attempts (
    request_key UUID PRIMARY KEY,
    request_title VARCHAR(255) NOT NULL,
    request_content TEXT NOT NULL,
    snippet_id UUID NOT NULL UNIQUE REFERENCES snippets (id),
    response_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    response_updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
