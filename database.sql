-- Jalankan di psql atau pgAdmin (Query Tool)

-- 1. Buat database, lalu sambungkan ke database "mahasiswa"
CREATE DATABASE mahasiswa;

-- 2. Buat tabel biodata
CREATE TABLE biodata (
    id    SERIAL PRIMARY KEY,
    nama  VARCHAR(100) NOT NULL,
    nim   VARCHAR(20)  NOT NULL UNIQUE,
    kelas VARCHAR(10)  NOT NULL
);