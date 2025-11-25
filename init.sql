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

-- Users table for demo application
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert test users
INSERT INTO users (id, name, email, role) VALUES
    (1, 'User 1', 'user1@example.com', 'user'),
    (2, 'User 2', 'user2@example.com', 'user'),
    (3, 'User 3', 'user3@example.com', 'admin'),
    (4, 'User 4', 'user4@example.com', 'user'),
    (5, 'User 5', 'user5@example.com', 'user'),
    (6, 'User 6', 'user6@example.com', 'admin'),
    (7, 'User 7', 'user7@example.com', 'user'),
    (8, 'User 8', 'user8@example.com', 'user'),
    (9, 'User 9', 'user9@example.com', 'admin'),
    (10, 'User 10', 'user10@example.com', 'user'),
    (11, 'User 11', 'user11@example.com', 'user'),
    (12, 'User 12', 'user12@example.com', 'admin'),
    (13, 'User 13', 'user13@example.com', 'user'),
    (14, 'User 14', 'user14@example.com', 'user'),
    (15, 'User 15', 'user15@example.com', 'admin'),
    (16, 'User 16', 'user16@example.com', 'user'),
    (17, 'User 17', 'user17@example.com', 'user'),
    (18, 'User 18', 'user18@example.com', 'admin'),
    (19, 'User 19', 'user19@example.com', 'user'),
    (20, 'User 20', 'user20@example.com', 'user')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert remaining users (21-100) in batches
INSERT INTO users (id, name, email, role)
SELECT n, CONCAT('User ', n), CONCAT('user', n, '@example.com'),
       CASE WHEN n % 3 = 0 THEN 'admin' ELSE 'user' END
FROM (
    SELECT 21 AS n UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION
    SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30 UNION
    SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34 UNION SELECT 35 UNION
    SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39 UNION SELECT 40 UNION
    SELECT 41 UNION SELECT 42 UNION SELECT 43 UNION SELECT 44 UNION SELECT 45 UNION
    SELECT 46 UNION SELECT 47 UNION SELECT 48 UNION SELECT 49 UNION SELECT 50 UNION
    SELECT 51 UNION SELECT 52 UNION SELECT 53 UNION SELECT 54 UNION SELECT 55 UNION
    SELECT 56 UNION SELECT 57 UNION SELECT 58 UNION SELECT 59 UNION SELECT 60 UNION
    SELECT 61 UNION SELECT 62 UNION SELECT 63 UNION SELECT 64 UNION SELECT 65 UNION
    SELECT 66 UNION SELECT 67 UNION SELECT 68 UNION SELECT 69 UNION SELECT 70 UNION
    SELECT 71 UNION SELECT 72 UNION SELECT 73 UNION SELECT 74 UNION SELECT 75 UNION
    SELECT 76 UNION SELECT 77 UNION SELECT 78 UNION SELECT 79 UNION SELECT 80 UNION
    SELECT 81 UNION SELECT 82 UNION SELECT 83 UNION SELECT 84 UNION SELECT 85 UNION
    SELECT 86 UNION SELECT 87 UNION SELECT 88 UNION SELECT 89 UNION SELECT 90 UNION
    SELECT 91 UNION SELECT 92 UNION SELECT 93 UNION SELECT 94 UNION SELECT 95 UNION
    SELECT 96 UNION SELECT 97 UNION SELECT 98 UNION SELECT 99 UNION SELECT 100
) AS numbers
ON DUPLICATE KEY UPDATE name=VALUES(name);

