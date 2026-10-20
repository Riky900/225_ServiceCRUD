import express from 'express'
import pg from 'pg'

const { Pool } = pg
const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
   // Log setiap request yang masuk
   app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`)
    next()
})

// Koneksi ke PostgreSQL (sesuaikan dengan database masing-masing)
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'mahasiswa',
    password: process.env.DB_PASSWORD || '', // isi dengan password PostgreSQL kamu
    port: Number(process.env.DB_PORT) || 5432,
})

/* ---------- Helper ---------- */

// Pastikan nama, nim, dan kelas terisi
function validasiBiodata({ nama, nim, kelas }) {
    const kosong = []
    if (!nama || String(nama).trim() === '') kosong.push('nama')
    if (!nim || String(nim).trim() === '') kosong.push('nim')
    if (!kelas || String(kelas).trim() === '') kosong.push('kelas')
    return kosong
}

function idValid(id) {
    return /^\d+$/.test(id)
}

function tanganiError(err, res) {
    console.error(err)
    // 23505 = pelanggaran UNIQUE (nim sudah dipakai)
    if (err.code === '23505') {
        return res.status(409).json({ message: 'NIM sudah terdaftar' })
    }
    res.status(500).json({ message: 'Internal Server Error' })
}

/* ---------- GET ALL ---------- */
const ambilSemua = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM biodata ORDER BY id')
        res.json(result.rows)
    } catch (err) {
        tanganiError(err, res)
    }
}
app.get('/', ambilSemua)
app.get('/biodata', ambilSemua)

/* ---------- GET BY ID ---------- */
app.get('/biodata/:id', async (req, res) => {
    const { id } = req.params
    if (!idValid(id)) {
        return res.status(400).json({ message: 'ID harus berupa angka' })
    }
    try {
        const result = await pool.query('SELECT * FROM biodata WHERE id = $1', [id])
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Data tidak ditemukan' })
        }
        res.json(result.rows[0])
    } catch (err) {
        tanganiError(err, res)
    }
})

/* ---------- POST (Tambah Data) ---------- */
app.post('/biodata', async (req, res) => {
    const { nama, nim, kelas } = req.body
    const kosong = validasiBiodata({ nama, nim, kelas })
    if (kosong.length > 0) {
        return res.status(400).json({ message: 'Field wajib diisi: ' + kosong.join(', ') })
    }
    try {
        const result = await pool.query(
            'INSERT INTO biodata (nama, nim, kelas) VALUES ($1, $2, $3) RETURNING *',
            [nama, nim, kelas]
        )
        res.status(201).json({
            message: 'Data berhasil ditambahkan',
            data: result.rows[0],
        })
    } catch (err) {
        tanganiError(err, res)
    }
})

/* ---------- PUT (Update Data) ---------- */
app.put('/biodata/:id', async (req, res) => {
    const { id } = req.params
    const { nama, nim, kelas } = req.body
    if (!idValid(id)) {
        return res.status(400).json({ message: 'ID harus berupa angka' })
    }
    const kosong = validasiBiodata({ nama, nim, kelas })
    if (kosong.length > 0) {
        return res.status(400).json({ message: 'Field wajib diisi: ' + kosong.join(', ') })
    }
    try {
        const result = await pool.query(
            'UPDATE biodata SET nama=$1, nim=$2, kelas=$3 WHERE id=$4 RETURNING *',
            [nama, nim, kelas, id]
        )
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Data tidak ditemukan' })
        }
        res.json({
            message: 'Data berhasil diupdate',
            data: result.rows[0],
        })
    } catch (err) {
        tanganiError(err, res)
    }
})

/* ---------- DELETE (Hapus Data) ---------- */
app.delete('/biodata/:id', async (req, res) => {
    const { id } = req.params
    if (!idValid(id)) {
        return res.status(400).json({ message: 'ID harus berupa angka' })
    }
    try {
        const result = await pool.query('DELETE FROM biodata WHERE id=$1 RETURNING *', [id])
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Data tidak ditemukan' })
        }
        res.json({
            message: 'Data berhasil dihapus',
            data: result.rows[0],
        })
    } catch (err) {
        tanganiError(err, res)
    }
})

app.listen(port, () => {
    console.log(`App running on port ${port}.`)
})

   // GET berdasarkan kelas
   app.get('/biodata/kelas/:kelas', (req, res) => {
    pool.query('SELECT * FROM biodata WHERE kelas ILIKE $1 ORDER BY id', [req.params.kelas])
        .then(result => res.json(result.rows))
        .catch(err => {
            console.error(err)
            res.status(500).json({ message: 'Internal Server Error' })
        })
})

   // GET jumlah data
   app.get('/jumlah', (req, res) => {
    pool.query('SELECT COUNT(*)::int AS total FROM biodata')
        .then(result => res.json(result.rows[0]))
        .catch(err => {
            console.error(err)
            res.status(500).json({ message: 'Internal Server Error' })
        })
})

   // Cek koneksi ke database
   app.get('/health', (req, res) => {
    pool.query('SELECT 1')
        .then(() => res.json({ status: 'ok', database: 'terhubung' }))
        .catch(err => {
            console.error(err)
            res.status(500).json({ status: 'error', database: 'tidak terhubung' })
        })
})