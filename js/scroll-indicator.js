var topIndicator = document.querySelector('.scroll-indicator--top');
var bottomIndicator = document.querySelector('.scroll-indicator--bottom');

window.addEventListener('scroll', function(e){

    //firefox
    var windowSizeYMax = document.documentElement.scrollHeight-document.documentElement.clientHeight;
    //chrome
    var windowSizeYMax1 = document.body.scrollHeight-document.documentElement.clientHeight;

    /////

    var scrollPosition = window.scrollY;

    // pour topIndicator
    if(scrollPosition == 0){
        topIndicator.classList.add('scroll-indicator--disabled');
    }
    else if(topIndicator.classList.contains('scroll-indicator--disabled')){
        topIndicator.classList.remove('scroll-indicator--disabled');
    }

    //pour bottomIndicator
    if(scrollPosition === windowSizeYMax || scrollPosition === windowSizeYMax1){
            bottomIndicator.classList.add('scroll-indicator--disabled');
    }
    else if(bottomIndicator.classList.contains('scroll-indicator--disabled')){
        bottomIndicator.classList.remove('scroll-indicator--disabled');
    }
})
