const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT 1');
    console.log('Database connection test successful');
    res.json({ status: 'connected' });
  } catch (err) {
    console.error('Database connection test failed:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Test questions table
app.get('/api/test-questions', async (req, res) => {
  try {
    console.log('Testing questions table...');
    // First check if table exists
    const [tables] = await db.execute(
      "SHOW TABLES LIKE 'questions'"
    );
    
    if (tables.length === 0) {
      console.log('Questions table does not exist');
      return res.status(404).json({ error: 'Questions table not found' });
    }

    // Check if we have any questions
    const [count] = await db.execute(
      "SELECT COUNT(*) as count FROM questions"
    );
    
    console.log('Total questions in database:', count[0].count);

    // Get a sample of questions
    const [questions] = await db.execute(
      "SELECT * FROM questions LIMIT 5"
    );

    res.json({
      tableExists: true,
      totalQuestions: count[0].count,
      sampleQuestions: questions
    });
  } catch (err) {
    console.error('Error testing questions table:', err);
    res.status(500).json({ error: 'Error testing questions table' });
  }
});

// Test career_paths table
app.get('/api/test-career-paths', async (req, res) => {
  try {
    console.log('Testing career_paths table...');
    // First check if table exists
    const [tables] = await db.execute(
      "SHOW TABLES LIKE 'career_paths'"
    );
    
    if (tables.length === 0) {
      console.log('Career paths table does not exist');
      return res.status(404).json({ error: 'Career paths table not found' });
    }

    // Check if we have any career paths
    const [count] = await db.execute(
      "SELECT COUNT(*) as count FROM career_paths"
    );
    
    console.log('Total career paths in database:', count[0].count);

    // Get a sample of career paths
    const [careerPaths] = await db.execute(
      "SELECT * FROM career_paths LIMIT 5"
    );

    res.json({
      tableExists: true,
      totalCareerPaths: count[0].count,
      sampleCareerPaths: careerPaths
    });
  } catch (err) {
    console.error('Error testing career_paths table:', err);
    res.status(500).json({ error: 'Error testing career_paths table' });
  }
});

// Get quiz questions by subject
app.get('/api/questions/:subject', async (req, res) => {
  const { subject } = req.params;
  console.log('Received request for questions, subject:', subject);
  
  try {
    // First check if the subject exists in the database
    const [subjects] = await db.execute(
      'SELECT DISTINCT subject FROM questions'
    );
    console.log('Available subjects:', subjects.map(s => s.subject));

    if (!subjects.some(s => s.subject === subject)) {
      console.log('Subject not found in database:', subject);
      return res.status(404).json({ 
        error: 'Subject not found',
        availableSubjects: subjects.map(s => s.subject)
      });
    }

    // Get questions for the subject
    console.log('Fetching questions for subject:', subject);
    const [questions] = await db.execute(`
      SELECT id, question_text, option_a, option_b, option_c, option_d, correct_option
      FROM questions
      WHERE subject = ?
      ORDER BY RAND()
      LIMIT 10
    `, [subject]);
    
    console.log('Number of questions found:', questions.length);
    
    if (questions.length === 0) {
      console.log('No questions found for subject:', subject);
      return res.status(404).json({ 
        error: 'No questions found',
        subject: subject
      });
    }

    // Log the first question to verify data
    if (questions.length > 0) {
      console.log('Sample question:', {
        id: questions[0].id,
        text: questions[0].question_text,
        options: {
          A: questions[0].option_a,
          B: questions[0].option_b,
          C: questions[0].option_c,
          D: questions[0].option_d
        },
        correct: questions[0].correct_option
      });
    }

    res.json(questions);
  } catch (err) {
    console.error('Error in questions endpoint:', err);
    res.status(500).json({ 
      error: 'Error fetching questions',
      details: err.message
    });
  }
});

// Get career path based on subject and level
app.post('/api/get-career-path', async (req, res) => {
  const { subject, level } = req.body;
  console.log('Received career path request:', { subject, level });

  try {
    // First check if the career_paths table exists
    const [tables] = await db.execute(
      "SHOW TABLES LIKE 'career_paths'"
    );
    
    if (tables.length === 0) {
      console.error('Career paths table does not exist');
      return res.status(500).json({ 
        error: 'Career paths table not found',
        details: 'The career_paths table does not exist in the database'
      });
    }

    // Query the career_paths table
    console.log('Querying career_paths table for:', { subject, level });
    const [careerPaths] = await db.execute(`
      SELECT subject, level, career_title, path_description
      FROM career_paths
      WHERE subject = ? AND level = ?
    `, [subject, level]);

    console.log('Found career paths:', careerPaths);

    if (careerPaths.length === 0) {
      console.log('No career paths found for:', { subject, level });
      return res.status(404).json({ 
        error: 'No career paths found',
        details: `No career path found for subject: ${subject} and level: ${level}`
      });
    }

    res.json(careerPaths);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ 
      error: 'Error fetching career paths',
      details: err.message 
    });
  }
});

// User signup
app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if user already exists
        const [existingUsers] = await db.execute(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new user
        const [result] = await db.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        res.json({ message: 'User created successfully' });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Error creating user' });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({
            userId: user.id,
            username: user.username
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Error during login' });
    }
});

// Get quiz history for a user
app.get('/api/quiz-history/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log('Fetching quiz history for user:', userId);

  try {
    // First check if the quiz_history table exists
    const [tables] = await db.execute(
      "SHOW TABLES LIKE 'quiz_history'"
    );
    
    if (tables.length === 0) {
      // Create the quiz_history table if it doesn't exist
      await db.execute(`
        CREATE TABLE IF NOT EXISTS quiz_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(50) NOT NULL,
          subject VARCHAR(50) NOT NULL,
          score INT NOT NULL,
          total_questions INT NOT NULL,
          completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          career_path_shown VARCHAR(255)
        )
      `);
      console.log('Created quiz_history table');
    }

    // Get the user's quiz history
    const [history] = await db.execute(`
      SELECT * FROM quiz_history 
      WHERE user_id = ? 
      ORDER BY completion_date DESC
    `, [userId]);

    console.log('Found quiz history entries:', history.length);
    res.json(history);
  } catch (err) {
    console.error('Error fetching quiz history:', err);
    res.status(500).json({ 
      error: 'Error fetching quiz history',
      details: err.message
    });
  }
});

// Save quiz result
app.post('/api/save-quiz-result', async (req, res) => {
  const { userId, subject, score, totalQuestions, career_path_shown } = req.body;
  console.log('Saving quiz result:', { userId, subject, score, totalQuestions, career_path_shown });

  try {
    // First check if the quiz_history table exists
    const [tables] = await db.execute(
      "SHOW TABLES LIKE 'quiz_history'"
    );
    
    if (tables.length === 0) {
      // Create the quiz_history table if it doesn't exist
      await db.execute(`
        CREATE TABLE IF NOT EXISTS quiz_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(50) NOT NULL,
          subject VARCHAR(50) NOT NULL,
          score INT NOT NULL,
          total_questions INT NOT NULL,
          completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          career_path_shown TEXT
        )
      `);
      console.log('Created quiz_history table');
    }

    // Save the quiz result with career path
    const [result] = await db.execute(`
      INSERT INTO quiz_history (user_id, subject, score, total_questions, career_path_shown)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, subject, score, totalQuestions, career_path_shown]);

    console.log('Quiz result saved successfully with ID:', result.insertId);
    res.json({ 
      success: true,
      id: result.insertId
    });
  } catch (err) {
    console.error('Error saving quiz result:', err);
    res.status(500).json({ 
      error: 'Error saving quiz result',
      details: err.message
    });
  }
});

// Initialize career paths table with sample data
app.get('/api/init-career-paths', async (req, res) => {
  try {
    // Create career_paths table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS career_paths (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subject VARCHAR(50) NOT NULL,
        level VARCHAR(20) NOT NULL,
        career_title VARCHAR(100) NOT NULL,
        path_description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert sample career paths
    const sampleCareerPaths = [
      {
        subject: 'Science',
        level: 'Beginner',
        career_title: 'Laboratory Technician',
        path_description: 'Start as a laboratory technician, assisting in experiments and research. Focus on building practical skills and understanding basic scientific principles.'
      },
      {
        subject: 'Science',
        level: 'Intermediate',
        career_title: 'Research Scientist',
        path_description: 'Work as a research scientist, conducting experiments and analyzing data. Specialize in a specific field of science and contribute to scientific discoveries.'
      },
      {
        subject: 'Science',
        level: 'Advanced',
        career_title: 'Senior Research Scientist',
        path_description: 'Lead research projects, mentor junior scientists, and contribute to groundbreaking discoveries. Consider pursuing a PhD and specializing in a niche area.'
      },
      {
        subject: 'Math',
        level: 'Beginner',
        career_title: 'Data Analyst',
        path_description: 'Start as a data analyst, working with basic statistical analysis and data visualization. Focus on developing analytical skills and understanding data patterns.'
      },
      {
        subject: 'Math',
        level: 'Intermediate',
        career_title: 'Financial Analyst',
        path_description: 'Work as a financial analyst, using mathematical models to analyze market trends and make investment recommendations.'
      },
      {
        subject: 'Math',
        level: 'Advanced',
        career_title: 'Quantitative Analyst',
        path_description: 'Develop complex mathematical models for financial markets. Work on high-frequency trading algorithms and risk assessment systems.'
      }
    ];

    // Insert sample data
    for (const path of sampleCareerPaths) {
      await db.execute(`
        INSERT INTO career_paths (subject, level, career_title, path_description)
        VALUES (?, ?, ?, ?)
      `, [path.subject, path.level, path.career_title, path.path_description]);
    }

    res.json({ message: 'Career paths table initialized with sample data' });
  } catch (err) {
    console.error('Error initializing career paths:', err);
    res.status(500).json({ error: 'Error initializing career paths' });
  }
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
