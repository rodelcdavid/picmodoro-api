CREATE TABLE users(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(320) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    joined TIMESTAMP NOT NULL
);

CREATE TABLE login(
    id SERIAL PRIMARY KEY,
    email VARCHAR(320) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL
);

CREATE TABLE goals(
    owner_id INTEGER NOT NULL,
    id VARCHAR(50) UNIQUE NOT NULL,
    goal_name VARCHAR(50) NOT NULL,
    image_url VARCHAR(2000) NOT NULL,
    blockers JSON NOT NULL,
    preset_min SMALLINT DEFAULT 25,
    is_random BOOLEAN DEFAULT FALSE,
    is_done BOOLEAN DEFAULT FALSE,
    date_created TIMESTAMP NOT NULL,
    date_finished TIMESTAMP
);