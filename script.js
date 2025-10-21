// Application de quiz modernisée — charge soit JSON (si présent) soit parse le CSV `ExamCisco1.csv`
let allQuestions = [];
let shuffledQuestions = [];
let currentQuestionIndex = 0;
let score = 0;

// Initialisation au chargement de la page
document.addEventListener("DOMContentLoaded", init);

async function init() {
    await loadQuestions();
    setupEventListeners();
}

// Try JSON first, fallback to CSV parsing (ISO-8859-1)
async function loadQuestions() {
    // Try example JSON files (prefer full converted one if present)
    const jsonCandidates = [
        'exemple/questions_from_csv.json',
        'exemple/questions.json'
    ];
    for (const path of jsonCandidates) {
        try {
            const res = await fetch(path);
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.questions)) {
                    allQuestions = data.questions;
                    postLoadSetup();
                    return;
                }
            }
        } catch (e) {
            // try next
        }
    }

    // Fallback: fetch CSV and parse it client-side (handles ISO-8859-1)
    try {
        const res = await fetch('ExamCisco1.csv');
        if (!res.ok) throw new Error('CSV not reachable');
        const buf = await res.arrayBuffer();
        const decoder = new TextDecoder('iso-8859-1');
        const text = decoder.decode(buf);
        parseCSVText(text);
        postLoadSetup();
        return;
    } catch (err) {
        console.error('Erreur lors du chargement CSV:', err);
        alert('Impossible de charger les questions (ni JSON ni CSV). Voir console.');
    }
}

function postLoadSetup() {
    // update maximum allowed value for the question count input if present
    const numInput = document.getElementById('numQuestions');
    if (numInput) {
        numInput.max = allQuestions.length;
        // if default value is greater than available questions, cap it
        if (parseInt(numInput.value, 10) > allQuestions.length) {
            numInput.value = Math.min(20, allQuestions.length);
        }
    }
}

function parseCSVText(csvData) {
    // Split into lines and parse semicolon-separated values
    const lines = csvData.split(/\r?\n/).filter(l => l.trim().length > 0);
    const questions = [];
    let id = 1;
    for (const line of lines) {
        const cols = line.split(';');
        // Defensive: ensure at least the basic columns exist
        const questionText = (cols[0] || '').trim();
        const typeField = (cols[1] || '1').trim();
        const nbReponses = parseInt(cols[2] || '0', 10) || 0;
        const nbReponsesCorrectes = parseInt(cols[3] || '0', 10) || 0;

        const answers = [];
        for (let i = 0; i < nbReponses; i++) {
            answers.push((cols[4 + i] || '').trim());
        }

        const correctIndices = [];
        for (let j = 0; j < nbReponsesCorrectes; j++) {
            const idxStr = cols[4 + nbReponses + j];
            if (idxStr && idxStr.trim() !== '') {
                const v = parseInt(idxStr, 10);
                if (!Number.isNaN(v)) correctIndices.push(v - 1); // CSV is 1-based
            }
        }

        const imageField = cols[4 + nbReponses + nbReponsesCorrectes];
        const image = (imageField && imageField.trim() !== '') ? imageField.trim() : null;

        questions.push({
            id: id,
            question: questionText,
            type: typeField === '2' ? 'image' : 'text',
            answers: answers,
            correctAnswers: correctIndices,
            image: image
        });
        id++;
    }
    allQuestions = questions;
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    const form = document.getElementById('quiz-setup-form');
    if (form) {
        form.addEventListener('submit', startQuiz);
    }
}

// Démarrer le quiz
function startQuiz(event) {
    event.preventDefault();
    
    const numQuestions = parseInt(document.getElementById('numQuestions').value);
    
    // Validation
    if (numQuestions < 1 || numQuestions > allQuestions.length) {
        alert(`Veuillez choisir entre 1 et ${allQuestions.length} questions.`);
        return;
    }
    
    // Réinitialiser l'état
    currentQuestionIndex = 0;
    score = 0;
    
    // Mélanger et sélectionner les questions
    shuffledQuestions = shuffleArray([...allQuestions]).slice(0, numQuestions);
    
    // Afficher la section quiz et masquer la configuration
    document.getElementById('setup').style.display = 'none';
    document.getElementById('questions').style.display = 'block';
    
    // Afficher la première question
    displayQuestion();
}

// Mélanger un tableau (algorithme Fisher-Yates)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Afficher la question actuelle
function displayQuestion() {
    const question = shuffledQuestions[currentQuestionIndex];
    const quizContainer = document.getElementById('quizz');
    
    // Mise à jour de la barre de progression
    updateProgress();
    
    // Construire le HTML de la question
    const html = `
        <div class="question-header">
            <span class="question-number">Question ${currentQuestionIndex + 1} / ${shuffledQuestions.length}</span>
        </div>
        
        <div class="question-text">
            ${question.question}
        </div>
        
        ${question.image ? `<img src="${question.image}" alt="Question image">` : ''}
        
        <div class="answers-container">
            ${question.answers.map((answer, index) => `
                <div class="answer-option" data-index="${index}">
                    <input 
                        type="${question.correctAnswers.length === 1 ? 'radio' : 'checkbox'}" 
                        name="answer" 
                        id="answer-${index}" 
                        value="${index}">
                    <label for="answer-${index}">${answer}</label>
                </div>
            `).join('')}
        </div>
        
        <div class="button-group">
            <button class="btn-primary" onclick="checkAnswer()">Valider</button>
        </div>
    `;
    
    quizContainer.innerHTML = html;
    
    // Ajouter les événements de clic après le rendu
    attachAnswerClickEvents();
}

// Attacher les événements de clic sur les réponses
function attachAnswerClickEvents() {
    const answerOptions = document.querySelectorAll('.answer-option');
    const question = shuffledQuestions[currentQuestionIndex];
    const isMultiple = question.correctAnswers.length > 1;
    
    answerOptions.forEach((option) => {
        option.addEventListener('click', function(e) {
            // Ne pas traiter si on clique directement sur l'input ou le label
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') {
                return;
            }
            
            const index = this.dataset.index;
            const input = document.getElementById(`answer-${index}`);
            
            if (isMultiple) {
                // Checkbox - toggle
                input.checked = !input.checked;
            } else {
                // Radio button - sélectionner celui-ci
                input.checked = true;
            }
        });
    });
}

// Mettre à jour la barre de progression
function updateProgress() {
    const progress = document.getElementById('progress');
    const percentage = ((currentQuestionIndex) / shuffledQuestions.length) * 100;
    progress.style.width = `${percentage}%`;
}

// Vérifier la réponse
function checkAnswer() {
    const question = shuffledQuestions[currentQuestionIndex];
    const selectedAnswers = Array.from(document.querySelectorAll('input[name="answer"]:checked'))
        .map(input => parseInt(input.value));
    
    // Vérifier si des réponses ont été sélectionnées
    if (selectedAnswers.length === 0) {
        alert('Veuillez sélectionner au moins une réponse.');
        return;
    }
    
    // Vérifier si la réponse est correcte
    const isCorrect = arraysEqual(selectedAnswers.sort(), question.correctAnswers.sort());
    
    if (isCorrect) {
        score++;
        nextQuestion();
    } else {
        showCorrectAnswers(question);
    }
}

// Comparer deux tableaux
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((value, index) => value === arr2[index]);
}

// Afficher les bonnes réponses
function showCorrectAnswers(question) {
    const correctionsSection = document.getElementById('corrections');
    const correctAnswersDiv = document.getElementById('correct-answers');
    
    const correctAnswersText = question.correctAnswers
        .map(index => question.answers[index])
        .join(', ');
    
    correctAnswersDiv.innerHTML = `
        <p><strong>Les bonnes réponses sont :</strong></p>
        <p>${correctAnswersText}</p>
        <div class="button-group">
            <button class="btn-secondary" onclick="nextQuestion()">Continuer</button>
        </div>
    `;
    
    correctionsSection.style.display = 'block';
    document.getElementById('questions').style.display = 'none';
}

// Passer à la question suivante
function nextQuestion() {
    // Masquer les corrections
    document.getElementById('corrections').style.display = 'none';
    
    // Passer à la question suivante
    currentQuestionIndex++;
    
    // Vérifier si le quiz est terminé
    if (currentQuestionIndex >= shuffledQuestions.length) {
        // S'assurer que la section questions est visible pour afficher les résultats
        document.getElementById('questions').style.display = 'block';
        showResults();
    } else {
        // Afficher la prochaine question
        document.getElementById('questions').style.display = 'block';
        displayQuestion();
    }
}

// Afficher les résultats finaux
function showResults() {
    const quizContainer = document.getElementById('quizz');
    const percentage = ((score / shuffledQuestions.length) * 100).toFixed(1);
    
    // Déterminer le message en fonction du score
    let message = '';
    let emoji = '';
    if (percentage >= 90) {
        message = 'Excellent ! 🎉';
        emoji = '🏆';
    } else if (percentage >= 75) {
        message = 'Très bien ! 👏';
        emoji = '⭐';
    } else if (percentage >= 60) {
        message = 'Bien joué ! 👍';
        emoji = '✅';
    } else {
        message = 'Continuez à réviser ! 📚';
        emoji = '💪';
    }
    
    const html = `
        <div class="score-display">
            <div class="score-value">${emoji}</div>
            <h2 style="color: var(--text-primary); margin-bottom: 2rem;">${message}</h2>
            <div class="score-label">Votre score</div>
            <div class="score-value">${score} / ${shuffledQuestions.length}</div>
            <div class="percentage" style="margin-top: 1rem; color: var(--primary-color);">${percentage}%</div>
            <div class="button-group" style="margin-top: 3rem;">
                <button class="btn-primary" onclick="restartQuiz()">Recommencer</button>
            </div>
        </div>
    `;
    
    quizContainer.innerHTML = html;
    
    // Mettre à jour la barre de progression à 100%
    const progress = document.getElementById('progress');
    if (progress) {
        progress.style.width = '100%';
    }
}

// Recommencer le quiz
function restartQuiz() {
    // Réinitialiser
    currentQuestionIndex = 0;
    score = 0;
    shuffledQuestions = [];
    
    // Afficher la page de configuration
    document.getElementById('setup').style.display = 'block';
    document.getElementById('questions').style.display = 'none';
    document.getElementById('corrections').style.display = 'none';
    
    // Réinitialiser la barre de progression
    document.getElementById('progress').style.width = '0%';
}
//utilise un fichier csv contenant les questions et réponse du quizz d'entrainement au ccna2
//structure du fichier : question;type de question(1 pour texte 2 pour image); nb de réponses; nb réponse correcte; réponse1; réponse2; réponse3; réponse4; réponse correcte1; réponse correcte2; réponse correcte3; réponse correcte4; lien de l'image
//affichage des questions et réponses dans une page html
//affichage du score à la fin du quizz, qui est composé de question pris aléatoirement dans le fichier csv (et pas deux fois la même question)
//affichage du temps mis pour répondre à l'ensemble des questions
//affichage du nombre de question correcte et incorrecte
//affichage du pourcentage de réussite

//event listener pour le chargement de la page
localStorage.setItem("score", 0);
localStorage.setItem("currentQuestionIndex", 0);
// Event listener pour le chargement de la page
document.addEventListener("DOMContentLoaded", setupQuiz);
//fonction pour récupérer les données du fichier csv
function getCSVData() {
    //récupération du fichier csv (décodage ANSI)
    var csvFile = new XMLHttpRequest();
    csvFile.open("GET", "ExamCisco1.csv", false);
    csvFile.overrideMimeType("text/plain; charset=iso-8859-1"); // specify the character encoding
    csvFile.send(null);
    var csvData = csvFile.responseText;
    //séparation des lignes
    var lines = csvData.split("\n");
    //création d'un tableau pour chaque ligne
    var data = [];
    for (var i = 0; i < lines.length - 1; i++) {
        data.push(lines[i].split(";"));
    }
    return data;
}

//fonction pour récupérer les questions et réponses
function getQuestions() {
    var data = getCSVData();
    var questions = [];
    for (var i = 0; i < data.length; i++) {
        var question = {
            question: data[i][0],
            type: data[i][1],
            nbReponses: data[i][2],
            nbReponsesCorrectes: data[i][3],
            reponses: [],
            reponsesCorrectes: [],
            image: data[i][4 + parseInt(data[i][2]) + parseInt(data[i][3])]
        }
        for (var j = 4; j < 4 + parseInt(question.nbReponses); j++) {
            question.reponses.push(data[i][j]);
        }
        for (var j = 4 + parseInt(question.nbReponses); j < 4 + parseInt(question.nbReponses) + parseInt(question.nbReponsesCorrectes); j++) {

            question.reponsesCorrectes.push(question.reponses[parseInt(data[i][j]) - 1]);
        }


        questions.push(question);
    }
    return questions;
}

//fonction pour mélanger les questions et en choisir 
function shuffleQuestions(questions, nombreQuestions) {
    var shuffledQuestions = [];
    //vérification du nombre de questions
    if (nombreQuestions > questions.length) {
        nombreQuestions = questions.length;
    }
    for (var i = 0; i < nombreQuestions; i++) {
        var randomIndex = Math.floor(Math.random() * questions.length);
        shuffledQuestions.push(questions[randomIndex]);
        questions.splice(randomIndex, 1);
    }
    return shuffledQuestions;
}

//fonction pour commencer le quizz
function GetDataQuizz(nombreQuestions) {
    var questions = getQuestions();
    var shuffledQuestions = shuffleQuestions(questions, nombreQuestions);
    return shuffledQuestions;
}


// Fonction pour initialiser le quizz
function setupQuiz() {
    // Ajouter un formulaire pour choisir le nombre de questions
    var numQuestionsForm = document.createElement("form");
    numQuestionsForm.innerHTML = "<label for='numQuestions'>Nombre de questions :</label>";
    numQuestionsForm.innerHTML += "<input type='number' id='numQuestions' min='1' max='130' value='10'>";
    numQuestionsForm.innerHTML += "<button type='submit'>Commencer le quizz</button>";
    numQuestionsForm.addEventListener("submit", startQuiz);
    document.getElementById("questions").style.display = "none";
    var main = document.querySelector("main");
    main.appendChild(numQuestionsForm);
}

// Fonction pour démarrer le quizz
function startQuiz(event) {
    event.preventDefault();
    var numQuestions = parseInt(document.getElementById("numQuestions").value);
    shuffledQuestions = GetDataQuizz(numQuestions); // Passer le nombre de questions choisi
    localStorage.setItem("score", 0);
    localStorage.setItem("currentQuestionIndex", 0);
    //retire l'affichage du formulaire
    event.target.remove();
    document.getElementById("questions").style.display = "block";
    displayQuestions();
}

// Fonction pour afficher les questions et réponses
function displayQuestions() {
    // Récupérer l'élément div pour afficher le quizz
    var div = document.getElementById("quizz");
    div.innerHTML = "";

    // Vérifier si la correction des réponses fausses est activée
    var showCorrections = localStorage.getItem("showCorrections");
    
    // Afficher la question en cours
    var currentQuestionIndex = localStorage.getItem("currentQuestionIndex");
    var question = shuffledQuestions[currentQuestionIndex];
    var divQuestion = document.createElement("div");
    divQuestion.setAttribute("id", "question");
    div.appendChild(divQuestion);
    
    // Afficher le numéro de la question
    var questionNumber = document.createElement("p");
    questionNumber.innerHTML = "Question " + (parseInt(currentQuestionIndex) + 1) + " / " + shuffledQuestions.length;
    divQuestion.appendChild(questionNumber);
    
    // Afficher la question
    var questionText = document.createElement("p");
    questionText.innerHTML = question.question;
    divQuestion.appendChild(questionText);
    
    // Afficher l'image si le type de question est une image
    if (question.type == 2) {
        var image = document.createElement("img");
        image.setAttribute("src", question.image);
        divQuestion.appendChild(image);
    }
    
    // Afficher les réponses
    var divReponses = document.createElement("div");
    divReponses.setAttribute("class", "reponses");
    divQuestion.appendChild(divReponses);
    for (var i = 0; i < question.reponses.length; i++) {
        var divReponse = document.createElement("div");
        divReponse.setAttribute("class", "reponse");
        divReponses.appendChild(divReponse);
        
        var input = document.createElement("input");
        input.setAttribute("type", question.nbReponsesCorrectes == 1 ? "radio" : "checkbox");
        input.setAttribute("name", "reponse");
        input.setAttribute("id", "reponse" + i);
        divReponse.appendChild(input);
        
        var label = document.createElement("label");
        label.setAttribute("for", "reponse" + i);
        label.innerHTML = question.reponses[i];
        divReponse.appendChild(label);
    }
    
    // Afficher le bouton Valider
    var divReponse = document.createElement("div");
    divReponse.setAttribute("id", "reponses");
    div.appendChild(divReponse);
    var reponse = document.createElement("button");
    reponse.innerHTML = "Valider";
    reponse.addEventListener("click", checkAnswer);
    divReponse.appendChild(reponse);
    
    // Afficher les corrections si activées
    if (showCorrections === "true") {
        var corrections = document.createElement("p");
        corrections.innerHTML = "Réponses correctes :";
        for (var i = 0; i < question.reponsesCorrectes.length; i++) {
            corrections.innerHTML += " " + question.reponsesCorrectes[i];
        }
        divReponse.appendChild(corrections);
    }
}

// Fonction pour vérifier la réponse donnée
function checkAnswer() {
    var reponses = document.getElementsByName("reponse");
    var currentQuestionIndex=localStorage.getItem("currentQuestionIndex");
    var reponsesCorrectes = shuffledQuestions[currentQuestionIndex].reponsesCorrectes;
    var score = parseInt(localStorage.getItem("score"));
    var nbReponsesCorrectes = 0;
    for (var i = 0; i < reponses.length; i++) {
        if (reponses[i].checked && reponsesCorrectes.includes(reponses[i].nextSibling.innerHTML)) {
            nbReponsesCorrectes++;
        }
    }
    if (nbReponsesCorrectes == shuffledQuestions[currentQuestionIndex].nbReponsesCorrectes) {
        score++;
        localStorage.setItem("score", score);
        NextAnswer();
    } else {
        // Afficher les réponses correctes en cas de réponse incorrecte
        displayCorrectAnswers(reponsesCorrectes);
    }
}

// Fonction pour afficher les réponses correctes en cas de réponse incorrecte
function displayCorrectAnswers(correctAnswers) {
    //enlever bouton valider dans reponses
    var reponses = document.getElementById("reponses");
    reponses.innerHTML = "";
    // Afficher les réponses correctes
    var correctionsSection = document.getElementById("corrections");
    correctionsSection.style.display = "block";
    var correctAnswersDiv = document.getElementById("correct-answers");
    correctAnswersDiv.innerHTML = "";
    var p = document.createElement("p");
    p.innerHTML = "Réponses correctes :";
    correctAnswers.forEach(function (answer) {
        var span = document.createElement("span");
        span.innerHTML = answer;
        //ajout de la classe correct pour mettre en vert les réponses correctes
        span.classList.add("correct");
        p.appendChild(span);
        p.innerHTML += ", ";
    });
    // Retirer la virgule supplémentaire à la fin
    p.innerHTML = p.innerHTML.slice(0, -2);
    correctAnswersDiv.appendChild(p);

    // Ajout d'un bouton "Suivant"
    var nextButton = document.createElement("button");
    nextButton.textContent = "Suivant";
    nextButton.addEventListener("click", NextAnswer);
    correctAnswersDiv.appendChild(nextButton);
}
function NextAnswer() {
    // Stocker l'index de la prochaine question dans le stockage local
    var currentQuestionIndex = localStorage.getItem("currentQuestionIndex");
    var nextQuestionIndex = parseInt(currentQuestionIndex) + 1;
    localStorage.setItem("currentQuestionIndex", nextQuestionIndex);
    //supprimer les réponses correctes
    var correctionsSection = document.getElementById("corrections");
    correctionsSection.style.display = "none";
    // Vérifier si le quizz est terminé
    
    if (nextQuestionIndex < shuffledQuestions.length) {
        displayQuestions();
    } else {
        displayScore();
    }
}

// Fonction pour afficher le score
function displayScore() {
    var div = document.getElementById("quizz");
    div.innerHTML = "";
    var score = localStorage.getItem("score");
    var p = document.createElement("p");
    p.innerHTML = "Score : " + score + " / " + shuffledQuestions.length;
    div.appendChild(p);
    var p = document.createElement("p");
    p.innerHTML = "Pourcentage de réussite : " + (score / shuffledQuestions.length * 100) + " %";
    div.appendChild(p);
    //ajout d'un bouton pour recommencer le quizz
    var button = document.createElement("button");
    button.innerHTML = "Recommencer";
    button.addEventListener("click", setupQuiz);
    div.appendChild(button);
}
