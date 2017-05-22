// var input
var lastName = document.querySelector('#lastname');
var firstName = document.querySelector('#firstname');
var birthDate = document.querySelector('#birthdate');
var userName = document.querySelector('#username');
var userPwd = document.querySelector('#userpwd');
var userMail = document.querySelector('#useremail');
// var button submit
var submitButton = document.querySelector('#submit-button');

// tableau de verification de champs
var allGoodInput = [false,false,true,false,false,false];

// ajouter la classe isBad pour que le champ passe en rouge
function badInput(e){
    if(e.classList.contains('register--contener--field--isGood')){
        e.classList.remove('register--contener--field--isGood');
    }
    e.classList.add('register--contener--field--isBad');
}

function goodInput(e){
    if(e.classList.contains('register--contener--field--isBad')){
        e.classList.remove('register--contener--field--isBad');
    }
    e.classList.add('register--contener--field--isGood');
}


// Test de chaque input
function checkLastname(e){
    if(e.value===''){
        badInput(e);
        allGoodInput[0]=false;
    }
    else{
        goodInput(e);
        allGoodInput[0]=true;
    }
    enableButton(allGoodInput);
}

function checkFirstname(e){
    if(e.value===''){
        badInput(e);
        allGoodInput[1]=false;
    }
    else{
        goodInput(e);
        allGoodInput[1]=true;
    }
    enableButton(allGoodInput);
}

function checkBirthdate(e){
    var dateSplited = e.value.split('/');
    var date = new Date(dateSplited[2],dateSplited[1]-1,dateSplited[0]);

    if((date.getDate()==dateSplited[0] && (date.getMonth()+1)==dateSplited[1] && date.getFullYear()==dateSplited[2]) || e.value==''){
        goodInput(e);
        allGoodInput[2]=true;
    }
    else{
        badInput(e);
        allGoodInput[2]=false;
    }
    enableButton(allGoodInput);
}

function checkUsername(e){
    if(e.value==='' || e.value.length<6){
        badInput(e);
        allGoodInput[3]=false;
    }
    else{
        goodInput(e);
        allGoodInput[3]=true;
    }
    enableButton(allGoodInput);
}

function checkUserpwd(e){
    var re=/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    if(!re.test(e.value)){
        badInput(e);
        allGoodInput[4]=false;
    }
    else{
        goodInput(e);
        allGoodInput[4]=true;
    }
    enableButton(allGoodInput);
}

function checkUsermail(e){
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(!re.test(e.value)){
        badInput(e);
        allGoodInput[5]=false;
    }
    else{
        goodInput(e);
        allGoodInput[5]=true;
    }
    enableButton(allGoodInput);
}

// Fonction de déverouillage du bouton suivant allGoodInput
function enableButton(tab){
    var unlock = tab[0];
    for (var i = 1; i < allGoodInput.length; i++) {
        unlock = unlock && allGoodInput[i];
    }

    if(unlock){
        if(submitButton.classList.contains('register--contener--button--lock')){
            submitButton.classList.remove('register--contener--button--lock');
        }
        submitButton.disabled=false;
        console.log('Sublit unlock');
    }
    else{
        submitButton.classList.add('register--contener--button--lock');
        submitButton.disabled=true;
        console.log('Sublit lock');

    }
}

// Listeners des inputs
lastName.addEventListener('input', function(){checkLastname(this);});
firstName.addEventListener('input', function(){checkFirstname(this);});
birthDate.addEventListener('input', function(){checkBirthdate(this);});
userName.addEventListener('input', function(){checkUsername(this);});
userPwd.addEventListener('input', function(){checkUserpwd(this);});
userMail.addEventListener('input', function(){checkUsermail(this);});
