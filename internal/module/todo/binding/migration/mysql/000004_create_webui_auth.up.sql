CREATE TABLE webui_users (
    id VARCHAR(128) PRIMARY KEY,
    username VARCHAR(128) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    scopes TEXT NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL
);

CREATE TABLE webui_sessions (
    id_hash VARBINARY(32) PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    csrf_hash VARBINARY(32) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    last_seen_at DATETIME(6) NOT NULL,
    idle_expires_at DATETIME(6) NOT NULL,
    absolute_expires_at DATETIME(6) NOT NULL,
    revoked_at DATETIME(6) NULL,
    CONSTRAINT fk_webui_session_user FOREIGN KEY (user_id) REFERENCES webui_users(id) ON DELETE CASCADE
);
