let ws = new WebSocket('wss://socialiteorion2.dei.uc.pt:9004/liveQuestionnaire');

let quest;
let serverTime = new Date().getTime();
let intervalWaiting;
let intervalProgress;
let app;
let btnRow;
let professorRow;
let pageContent;

window.onload = function () {
    console = new Console();

    app = new Vue({
        el: '#app',
        data: {
            notTime: false,
            inTime: false,
            hours: "00",
            minutes: "00",
            seconds: "00",
            questTitle: '',
            liveStudents: '0',
            totalStudents: '0',
            progressMax: 0,
            progressValue: 0,
            questionType: 'simple',
            questionImage: '',
            questionNAnswers: 0,
            questionIndex: 0,
            questionTotal: 0,
            questionContent: '',
            questionOptions: [],
            questionCorrectRate: 0
        },
        methods: {
            moveBack: moveBack,
            moveNext: moveNext
        }
    });

    btnRow = new Vue({
        el: '#btnRow',
        data: {
            questionnaireId: '9206432a61ac15c6a43ad95a3cbbd354',
            questionnaires: [],
            questName: 'select a questionnaire'
        },
        methods: {
            selectQuestionnaire: selectQuestionnaire,
            registerClick: registerClick,
            unregisterClick: unregisterClick,
            stopClick: stopClick,
        }
    });
    professorRow = new Vue({
        el: '#professorRow',
        data: {
            professorEmail: 'uctx@test.com',
            classId: '160202'
        },
        methods: {
            findQuestionnaires: findQuestionnaires,
            findQuestionnairesByClass: findQuestionnairesByClass
        }
    });


};

function moveBack() {
    let index = app.questionIndex - 1; //remove one because the index starts in zero
    index = Math.max(0, index - 1);
    updateView(index)
}

function moveNext() {
    let index = app.questionIndex - 1; //remove one because the index starts in zero
    index = Math.min(app.questionTotal - 1, index + 1);
    updateView(index)
}

function reset() {
    app.notTime = false;
    app.inTime = false;

}

function registerClick() {
    registerQuestionnaire();
}

function findQuestionnaires() {
    let email = professorRow.professorEmail;
    console.log('Fetching list of questionnaires for professor: ' + email)
    sendMessage({id: 'findQuestionnaires', professor: email});
}

function findQuestionnairesByClass() {
    let classId = professorRow.classId;
    console.log('Fetching list of questionnaires for class: ' + classId)
    sendMessage({id: 'findQuestionnairesByClass', classId: classId});
}

function selectQuestionnaire(quest) {
    btnRow.questionnaireId = quest.id;
    btnRow.questName = quest.name;
}

function unregisterClick() {
    unregisterQuestionnaire();
    cancelIntervals();
    reset();
}

function stopClick() {
    stop();
    cancelIntervals();
    reset();
}


window.onbeforeunload = function () {
    ws.close();
    cancelIntervals();
};

ws.onmessage = function (message) {
    let parsedMessage = JSON.parse(message.data);
    //console.info('Received message: ' + message.data);

    switch (parsedMessage.id) {
        case 'findQuestionnaires':
            let message = parsedMessage['message'];
            console.info(`Found  ${message['questionnaires'].length} questionnaire(s) for professor: ${message['professor']['email']}`);
            btnRow['questionnaires'] = message['questionnaires'];
            break;

        case 'findQuestionnairesByClass':
            let messageByClass = parsedMessage['message'];
            console.info(`Found  ${messageByClass['questionnaires'].length} questionnaire(s) for class: ${messageByClass['class']['name']}`);
            btnRow['questionnaires'] = messageByClass['questionnaires'];
            break;
        case 'registerSuccess':
            let data = parsedMessage['message'];
            quest = data['questionnaire'];
            serverTime = data['serverTime'];
            console.info("registered with success for questionnaire: " + quest['id']);
            console.info("questionnaire: " + quest);
            onQuestionnaireLoad(0);
            break;
        case 'unregisterSuccess':
            let dataUnregister = parsedMessage['message'];
            quest = null;
            console.info("unregistered with success for questionnaire: " + dataUnregister['questionnaire']);
            break;
        case 'existingAnswers':
            console.info("Existing Answers:" + parsedMessage['message'])
            processExistingAnswers(parsedMessage['message']['answers']);
            break;
        case 'newAnswer':
            console.info("New Answer from:" + parsedMessage['message']['student']['username'])
            processNewAnswer(parsedMessage['message'])
            break;
        case 'newStudent':
            console.info("New Student entered:" + parsedMessage['message']['username'])
            processNewStudent(parsedMessage['message'])
            break;
        case 'newReport':
            let entity = parsedMessage['message'];
            ///console.info("Student finished:" + entity['student']['username']);
            if (Object.keys(entity).includes("correct_answers")) {
                let score = parseFloat(entity['correct_answers']);
                score = score * 100;
                console.info(`${entity['student']['username']} finished with ${score}%`);
            }
            processStudentLeft();
            break;
        case 'Error':
            console.info("Error:" + parsedMessage['message'])
            break;
        default:
            console.error('Unrecognized message', parsedMessage);
    }
};


function registerQuestionnaire() {
    let qId = btnRow.questionnaireId;
    console.log('registering updates for questionnaire: ' + qId)
    sendMessage({id: 'register', questionnaire: qId});
}

function unregisterQuestionnaire() {
    let qId = btnRow.questionnaireId;
    console.log('registering updates for questionnaire: ' + qId)
    sendMessage({id: 'unregister', questionnaire: qId});
}

function stop() {
    sendMessage({id: 'stop'});
}


function sendMessage(message) {
    let jsonMessage = JSON.stringify(message);
    console.log('Sending message: ' + jsonMessage);
    ws.send(jsonMessage);
}

function processNewStudent(student) {
    if (quest['students']['live'] < quest['students']['total'])
        quest['students']['live']++;
    updateView(app.questionIndex - 1, true);
}

function processStudentLeft() {
    if (quest['students']['live'] > 0)
        quest['students']['live']--;
    updateView(app.questionIndex - 1, true);
}

function processNewAnswer(answer) {
    let index = app.questionIndex - 1;
    if (quest !== undefined && quest['questions'] !== undefined) {
        let answerIndex = findIndexByAttr(quest['questions'], answer['question_id']);
        if (answerIndex !== null) {
            quest['questions'][answerIndex]['answers'].push(answer);
            updateView(index, true);
        }

    }
}

function processExistingAnswers(answers) {
    let index = app.questionIndex - 1;
    quest['questions'][index]['answers'] = answers;
    updateView(index, true);
}

function onQuestionnaireLoad(interval) {
    let countDownDate = new Date(quest['release_time']).getTime();
    let distance = countDownDate - new Date(serverTime).getTime() - interval;

    if (distance <= 0) {
        setTimeDisplay("00", "00", "00");
    } else if (distance > 0) {
        //let days = Math.floor(distance / (1000 * 60 * 60 * 24));
        let hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor((distance % (1000 * 60)) / 1000);


        if (hours < 10) {
            hours = "0" + hours
        }
        if (minutes < 10) {
            minutes = "0" + minutes
        }
        if (seconds < 10) {
            seconds = "0" + seconds
        }
        setTimeDisplay(hours, minutes, seconds)
    }


}

function setTimeDisplay(hours, minutes, seconds) {

    if (hours !== "00" || minutes !== "00" || seconds !== "00") {
        app.notTime = true;
        app.inTime = false;
        app.hours = hours;
        app.minutes = minutes;
        app.seconds = seconds;
        if (intervalWaiting == null)
            startIntervalWaiting();
    } else {
        app.inTime = true;
        app.notTime = false;
        cancelInterval(intervalWaiting);
        updateView(0);
        startIntervalProgress();

    }


}

function cancelInterval(interval) {
    if (interval != null)
        clearInterval(interval);
    interval = null;
}

function cancelIntervals() {
    cancelInterval(intervalWaiting);
    cancelInterval(intervalProgress);
}

function updateView(q_index, skipExistingAnswer = false) {

    app.questTitle = quest['name'];
    if (quest['students']) {
        app.liveStudents = quest['students']['live'];
        app.totalStudents = quest['students']['total'];
    }
    app.progressMax = quest['duration'];

    app.progressValue = Math.floor(new Date(quest['release_time']).getTime() / 1000 + quest['duration'] - serverTime / 1000);
    app.questionIndex = q_index + 1;
    app.questionTotal = quest['questions'].length;

    if (quest['questions'].length > 0) {
        let question = quest['questions'][q_index];
        if (!skipExistingAnswer)
            sendMessage({id: 'existingAnswers', questionnaire: quest['id'], question: question['id']});
        //if(question['picture']!=null && question['picture']!=='')
        app.questionImage = question['picture'];
        app.questionType = question['question_type'];
        let content = question['question'];
        //Conversion from markdown to html
        if (app.questionType.toLowerCase() === 'math')
            document.getElementById("textAreaQuestionMath").innerHTML = marked(content);
        else
            app.questionContent = content;


        app.questionOptions = [];
        app.questionCorrectRate = 0;
        if (question['answers'])
            app.questionNAnswers = question['answers'].length;

        if (question['options'] != null) {
            for (let i = 0; i < question['options'].length; i++) {
                let option = {};
                option['text'] = question['options'][i];
                option['isAnswer'] = question['answer'].includes(option['text']);
                option['n_answers'] = findAnswers(option['text'], question['answers']);
                if (option['isAnswer'] && app.questionNAnswers)
                    app.questionCorrectRate = (option['n_answers'] / app.questionNAnswers) * 100;
                app.questionOptions.push(option);
            }
        }
    }
}

function findIndexByAttr(entities, value, attr = 'id') {
    let index = null;
    for (let i = 0; i < entities.length; i++) {
        if (entities[i][attr] === value) {
            index = i;
            break;
        }
    }
    return index;
}

function findAnswers(option, answers) {
    let counter = 0;
    if (answers) {
        for (let i = 0; i < answers.length; i++) {
            if (answers[i]['answer'].includes(option))
                counter++
        }
    }
    return counter;
}

function startIntervalWaiting() {
    let intervalCounter = 0;
    let _tick = 1000;
    if (intervalWaiting != null)
        clearInterval(intervalWaiting);
    intervalWaiting = setInterval(function tick() {
        intervalCounter += _tick;
        onQuestionnaireLoad(intervalCounter);
    }, _tick);
}


function startIntervalProgress() {
    let intervalCounter = 0;
    let _tick = 1000;
    if (intervalProgress != null)
        clearInterval(intervalProgress);
    intervalProgress = setInterval(function tick() {
        intervalCounter += _tick;
        app.progressValue -= 1;
    }, _tick);
}

