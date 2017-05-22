// FONCTION logout

var userLoged = document.querySelector("#be-log--father");
var text = document.querySelector("#be-log--username");
var userNotLoged = document.querySelector("#user-indicator");
var logout = document.querySelector("#logout");


console.log('Logout enable');
logout.addEventListener('click', function(){funLogOut();});

function funLogOut(){
    logout.style.display = 'none';
    userLoged.style.display = 'none';
    text.innerHTML = 'UserName';
    userNotLoged.style.display = 'inline-block';
}
