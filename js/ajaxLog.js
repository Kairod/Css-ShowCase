var test = function(){
    console.log('ajaxLog.js loaded');
}

var submitButton = document.querySelector(".login--contener-buttons--login");

//if (submitButton){
    submitButton.addEventListener('click', function(e){
        e.preventDefault();

        var req = new XMLHttpRequest();
        req.onreadystatechange = function(e){
            if(req.readyState == 4){
                if(req.status == 200){

                    /* Reponse au login */
                    console.log('Login ok');
                    var notification = document.querySelector("#LoginIndicator");

                    notification.innerHTML = req.responseText;

                    notification.style.left = '0';
                     setTimeout(function(){
                       notification.style.left = '-100%';
                   }, 4000);

                   /* Affichage du nom dans le nav  */
                   if((req.responseText!='Le nom d\'utilisateur ne doit pas être vide.\n')
                    && (req.responseText!='Le mot de pass ne doit pas être vide.\n')
                    && (req.responseText!='Le nom d\'utilisateur et le mot de pass sont invalides.\n')){

                        var userLoged = document.querySelector("#be-log--father");
                        var text = document.querySelector("#be-log--username");
                        var userNotLoged = document.querySelector("#user-indicator");
                        var logout = document.querySelector("#logout");

                        text.innerHTML = userName;
                        userNotLoged.style.display = 'none';
                        userLoged.style.display = 'inline-block';
                        logout.style.display = 'block';
                   }

                }
                else{
                    console.log('Login Issue')
                }
            }
        }

        var userName = document.querySelector("#username").value;
        var userPassword = document.querySelector("#password").value;

        req.open('POST', 'htbin/login.py', true);
        req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        req.send('username=' + userName + '&userpwd=' + userPassword);
    });
//}
