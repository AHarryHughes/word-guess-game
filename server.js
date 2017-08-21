const express = require('express');
const bodyParser = require('body-parser');
const mustache = require('mustache-express');
const fs = require('fs');
const session = require('express-session');
const expressValidator = require('express-validator')

var application = express();

application.engine('mustache', mustache());

application.set('views', './views');
application.set('view engine', 'mustache');

application.use(bodyParser());
application.use(bodyParser.urlencoded({ extended: true }));

application.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}));

application.use(expressValidator({
    customValidators: {
        isOneChar: function(value) {
            return value.length == 1;
        },
        isNotGuessed: function(value) {
            return check_guess(value);
        }
    }
}));

const words = fs.readFileSync("/usr/share/dict/words", "utf-8").toLowerCase().split("\n");

function get_random_word() {
    var random_index = Math.floor(Math.random() * (words.length));
    return words[random_index];
}

function game_setup(){
    // Store the word the user is trying to guess in a session.
    session.word = get_random_word();
    session.word_array = session.word.split('');
    //show the number of letters "_ _ _ _ _ _ _"
    session.guess_word_array = [];
    for(var i in session.word_array){
        session.guess_word_array.push('_');
    }
    // allowed 8 guesses. guesses in the session.
    session.wrong_guesses_left = 8;
    // lists guessed letters
    session.guessed_letters = [];
}

function letter_guess(letter){
    while(session.word_array.indexOf(letter) > -1){
       var letter_index = session.word_array.indexOf(letter);
       session.word_array.splice(letter_index, 1, '_');
       session.guess_word_array.splice(letter_index, 1, letter);
    }
}

function check_guess(letter){
    for(let i = 0; i < session.guessed_letters.length; i++){
        if(session.guessed_letters[i] == letter){
            return false;
        }
    }
    for(let i = 0; i < session.guess_word_array.length; i++){
        if(session.guess_word_array[i] == letter){
            return false;
        }
    }
    return true;
}

function have_won(){
    for(let i = 0; i < session.guess_word_array.length; i++){
        if(session.guess_word_array[i] == '_'){
            return false;
        }
    }
    return true;
}


application.get('/', (request, response) => {
    game_setup();
    let model = {
        word: session.word,
        word_array: session.word_array,
        guess_word_array: session.guess_word_array,
        guessed_letters: session.guessed_letters,
        wrong_guesses_left: session.wrong_guesses_left 
    };
    response.render('game', model);
});

application.post('/game', (request, response) => {

    let errors = [];

    // user one guess (i.e. letter) using a form. should be validated only 1 letter guessed.
    if(request.checkBody('guess', 'You may only guess one letter').isOneChar().validationErrors[0]){
        errors.push(request.checkBody('guess', 'You may only guess one letter').isOneChar().validationErrors[0]);
    }

    // If the user guesses the same letter twice, do not take away a guess. Instead, display a message
    if(request.checkBody('guess', 'You have already guessed this letter').isNotGuessed().validationErrors[0]){
        errors.push(request.checkBody('guess', 'You have already guessed this letter').isNotGuessed().validationErrors[0]);
    }
    
    if(!errors[0]){
        // This letter can be upper or lower case. more than one letter, tell them invalid.
        let guess = request.body.guess.toLowerCase();

        //put letter in guessed array
        if(session.word_array.indexOf(guess) > -1){
            letter_guess(guess);
        }
        else{
            session.guessed_letters.push(guess);
            session.wrong_guesses_left -= 1;
        }
        
        var model = {
            msgs: [],
            word: session.word,
            word_array: session.word_array,
            guess_word_array: session.guess_word_array,
            guessed_letters: session.guessed_letters,
            wrong_guesses_left: session.wrong_guesses_left 
        };

        //If the word is guessed send to the won page
        if(have_won()){
            response.redirect('won_game');
        }
        // If the player runs out of guesses, reveal the word to the user when the game ends.
        else if(session.wrong_guesses_left < 1){
            response.redirect('lost_game'); 
        }
        else{
             response.render('game', model);
        }
    }
    else{
        var model = {
            msgs: [],
            word: session.word,
            word_array: session.word_array,
            guess_word_array: session.guess_word_array,
            guessed_letters: session.guessed_letters,
            wrong_guesses_left: session.wrong_guesses_left  
        }

        for(let i = 0; i < errors.length; i++){
            model.msgs.push(errors[i].msg);
        }
        
        response.render('game', model);
    }
});


application.get('/game_restart', (request, response) => {
    response.redirect('/');
});

application.get('/won_game', (request, response) => {
    // When a game ends, ask the user if they want to play again.
    var model = {
        word: session.word
    }
    response.render('won_game', model);
});

application.get('/lost_game', (request, response) => {
    // When a game ends, ask the user if they want to play again.
    var model = {
        word: session.word
    }
    response.render('lost_game', model);
});

application.listen(4000);