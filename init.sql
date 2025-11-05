-- Initialize MySQL database for cache metrics

CREATE TABLE IF NOT EXISTS health_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    hit_rate DOUBLE NOT NULL,
    miss_rate DOUBLE NOT NULL,
    error_rate DOUBLE NOT NULL,
    avg_response_time DOUBLE NOT NULL,
    memory_usage DOUBLE NOT NULL,
    failure_count INT NOT NULL,
    cache_state VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recovery_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    strategy VARCHAR(50) NOT NULL,
    timestamp BIGINT NOT NULL,
    success BOOLEAN NOT NULL,
    duration INT NOT NULL,
    keys_affected INT NOT NULL,
    error_rate_before DOUBLE,
    error_rate_after DOUBLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS experiments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    experiment_name VARCHAR(100) NOT NULL UNIQUE,
    start_time BIGINT NOT NULL,
    end_time BIGINT,
    total_requests INT NOT NULL DEFAULT 0,
    successful_requests INT NOT NULL DEFAULT 0,
    failed_requests INT NOT NULL DEFAULT 0,
    cache_hits INT NOT NULL DEFAULT 0,
    cache_misses INT NOT NULL DEFAULT 0,
    avg_response_time DOUBLE,
    p50_response_time DOUBLE,
    p95_response_time DOUBLE,
    p99_response_time DOUBLE,
    downtime_seconds DOUBLE,
    mtbf DOUBLE,
    mttr DOUBLE,
    availability DOUBLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (experiment_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ml_training_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    error_rate_trend DOUBLE NOT NULL,
    hit_rate_trend DOUBLE NOT NULL,
    response_time_trend DOUBLE NOT NULL,
    failure_frequency DOUBLE NOT NULL,
    current_error_rate DOUBLE NOT NULL,
    memory_pressure DOUBLE NOT NULL,
    actual_failure BOOLEAN NOT NULL,
    prediction_probability DOUBLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
