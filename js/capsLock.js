var indicator = document.querySelector('#login-capsLock-indicator');
var inputPassword = document.querySelector('#password');

document.addEventListener( 'keyup', function(e) {
    var caps = e.getModifierState( 'CapsLock' );
    if(caps){
        indicator.classList.remove('login--capsLock-hidden');
        indicator.classList.add('login--capsLock-visible');
    }
    else{
        indicator.classList.remove('login--capsLock-visible');
        indicator.classList.add('login--capsLock-hidden');
    }

});
