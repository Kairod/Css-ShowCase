
// FONCTION: AFFICHER POP UP DE LOG
//var
var wantLog = document.querySelector('#user-indicator');
var loginDiv = document.querySelector('.login');

wantLog.addEventListener('click', function(){
    loginDiv.style.display='block';
});

// FONCTION FAIRE DISPARAITRE
var login = document.querySelector('.login--contener-buttons--login');
var logNone = document.querySelector('.login--exit');

login.addEventListener('click', function(){disableLog();});
logNone.addEventListener('click', function(){disableLog();});

function disableLog(){
    loginDiv.style.display='none';
}
