// db.js
const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'career_path_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Handle Heroku's JAWSDB_URL if it exists
if (process.env.JAWSDB_URL) {
    const db = mysql.createPool(process.env.JAWSDB_URL);
    module.exports = db.promise();
} else {
    module.exports = pool.promise();
}

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to MySQL database successfully!');
  
  // Create career_paths table if it doesn't exist
  connection.query(`
    CREATE TABLE IF NOT EXISTS career_paths (
      id INT AUTO_INCREMENT PRIMARY KEY,
      subject VARCHAR(50) NOT NULL,
      level VARCHAR(20) NOT NULL,
      career_title VARCHAR(100) NOT NULL,
      path_description TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating career_paths table:', err);
    } else {
      console.log('Career paths table created or already exists');
    }
  });

  // Test a simple query
  connection.query('SELECT 1', (err, results) => {
    connection.release();
    if (err) {
      console.error('Test query failed:', err);
      return;
    }
    console.log('Test query successful:', results);
  });
});

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Database connection was closed.');
  }
  if (err.code === 'ER_CON_COUNT_ERROR') {
    console.error('Database has too many connections.');
  }
  if (err.code === 'ECONNREFUSED') {
    console.error('Database connection was refused.');
  }
});

// Insert sample career paths
async function insertSampleCareerPaths() {
    const samplePaths = [
        {
            subject: 'Mathematics',
            level: 'Beginner',
            career_title: 'Data Entry Specialist',
            path_description: 'Start with basic data entry roles to develop numerical skills and attention to detail.'
        },
        {
            subject: 'Mathematics',
            level: 'Intermediate',
            career_title: 'Financial Analyst',
            path_description: 'Analyze financial data and create reports to help businesses make informed decisions.'
        },
        {
            subject: 'Mathematics',
            level: 'Advanced',
            career_title: 'Data Scientist',
            path_description: 'Use advanced mathematical and statistical techniques to extract insights from complex data.'
        },
        {
            subject: 'Science',
            level: 'Beginner',
            career_title: 'Laboratory Technician',
            path_description: 'Assist scientists in conducting experiments and maintaining laboratory equipment.'
        },
        {
            subject: 'Science',
            level: 'Intermediate',
            career_title: 'Research Assistant',
            path_description: 'Conduct experiments, collect data, and assist in scientific research projects.'
        },
        {
            subject: 'Science',
            level: 'Advanced',
            career_title: 'Research Scientist',
            path_description: 'Lead scientific research projects and develop new theories and technologies.'
        }
    ];

    try {
        for (const path of samplePaths) {
            await db.execute(`
                INSERT IGNORE INTO career_paths (subject, level, career_title, path_description)
                VALUES (?, ?, ?, ?)
            `, [path.subject, path.level, path.career_title, path.path_description]);
        }
        console.log('Sample career paths inserted successfully');
    } catch (err) {
        console.error('Error inserting sample career paths:', err);
    }
}

// Call the function to insert sample data
insertSampleCareerPaths();
