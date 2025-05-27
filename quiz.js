let currentQuestions = [];
let currentAnswers = [];
let currentSubject = '';

document.getElementById('startTestBtn').addEventListener('click', function() {
    // Get the subject from the URL or session storage
    currentSubject = new URLSearchParams(window.location.search).get('subject') || 'Math';
    startQuiz(currentSubject);
});

async function startQuiz(subject) {
    try {
        const response = await fetch(`http://localhost:3000/api/questions/${subject}`);
        if (!response.ok) {
            throw new Error('Failed to fetch questions');
        }
        currentQuestions = await response.json();
        displayQuestions(currentQuestions);
    } catch (err) {
        console.error('Error fetching questions:', err);
        alert('Error loading quiz. Please try again.');
    }
}

function displayQuestions(questions) {
    const questionContainer = document.getElementById('questionContainer');
    questionContainer.innerHTML = ''; // Clear previous questions
    
    questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'question';
        questionElement.innerHTML = `
            <h3>Question ${index + 1}</h3>
            <p>${question.question_text}</p>
            <div class="options">
                <label><input type="radio" name="q${index}" value="A"> ${question.option_a}</label>
                <label><input type="radio" name="q${index}" value="B"> ${question.option_b}</label>
                <label><input type="radio" name="q${index}" value="C"> ${question.option_c}</label>
                <label><input type="radio" name="q${index}" value="D"> ${question.option_d}</label>
            </div>
        `;
        questionContainer.appendChild(questionElement);
    });

    // Add submit button
    const submitButton = document.createElement('button');
    submitButton.textContent = 'Submit Quiz';
    submitButton.onclick = submitQuiz;
    questionContainer.appendChild(submitButton);
}

async function submitQuiz() {
    // Collect answers
    currentAnswers = currentQuestions.map((_, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        return selected ? selected.value : null;
    });

    // Calculate score
    const score = currentQuestions.reduce((total, question, index) => {
        return total + (currentAnswers[index] === question.correct_option ? 1 : 0);
    }, 0);

    // Save quiz results
    try {
        const userId = sessionStorage.getItem('userId');
        if (!userId) {
            throw new Error('User not logged in');
        }

        // Get career path suggestion
        const level = score >= 8 ? 'Advanced' : score >= 5 ? 'Intermediate' : 'Beginner';
        const careerPathResponse = await fetch('http://localhost:3000/api/get-career-path', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subject: currentSubject,
                level
            })
        });

        if (!careerPathResponse.ok) {
            throw new Error('Failed to get career path');
        }

        const careerPaths = await careerPathResponse.json();
        if (!careerPaths || careerPaths.length === 0) {
            throw new Error('No career paths found');
        }

        // Get the first career path
        const careerPath = careerPaths[0];
        console.log('Selected career path:', careerPath);

        // Save quiz result with career path
        const response = await fetch('http://localhost:3000/api/save-quiz-result', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                subject: currentSubject,
                score,
                totalQuestions: currentQuestions.length,
                career_path_shown: JSON.stringify(careerPath)
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save quiz results');
        }

        const saveResult = await response.json();
        console.log('Quiz result saved:', saveResult);
        
        // Redirect to results page with score and career path
        window.location.href = `results.html?score=${score}&total=${currentQuestions.length}&careerPath=${encodeURIComponent(JSON.stringify(careerPath))}`;
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving quiz results. Please try again.');
    }
}
  