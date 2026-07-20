const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// API Endpoints
app.post('/api/rsvp', (req, res) => {
    const { name, email, attending, guests, message } = req.body;

    if (!name || !attending) {
        return res.status(400).json({ error: 'Name and Attendance status are required' });
    }

    const query = `INSERT INTO guests (name, email, attending, guests_count, message) VALUES (?, ?, ?, ?, ?)`;
    const params = [name, email || '', attending, parseInt(guests) || 0, message || ''];

    db.run(query, params, function (err) {
        if (err) {
            console.error('Error inserting data:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({
            message: 'RSVP received successfully',
            id: this.lastID
        });
    });
});

// Endpoint to view list (for verification)
app.get('/api/guests', (req, res) => {
    db.all(`SELECT * FROM guests ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
