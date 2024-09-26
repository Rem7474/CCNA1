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
