$(document).ready(function(){
  updateMessagePreview()
})

$(function(){
  updateMessagePreview()
});

var updateMessagePreview = function(){
  var chatboxPreview = $('#chatbox-content')
  chatboxPreview.empty()

  // Recuperer les message pour les afficher
  $.getJSON('../htbin/chatget.py', function(data){
    $.each(data, function(key, val){
      chatboxPreview.append('<span class="chatbox-time">' + val.time + '</span>')
      chatboxPreview.append('<span class="chatbox-name">' +' '+val.user +': '+ '</span>')
      chatboxPreview.append('<span class="chatbox-msg">' + val.msg + '</span>')
      chatboxPreview.append('<div></div>')
    })
  })
}

var sendMessage = function(){
  var messageArea = $('#message-area'),
      num = 0

  if(!(messageArea).val()){
    num = 1
    return
  }

  num = 0

  $.ajax({
      url: '../htbin/chatsend.py',
      cache: false,
      data: 'num=' + num + '&msg=' + messageArea.val(),
      success:function(content){
        updateMessagePreview();
      },
      error:function(XMLhttpRequest,textStatus,errorThrown){
          console.log('Send ajax error');
      }
  })

  // efface le textarea
  messageArea.val('');

  return false
}

$('#send-button').on('click', function(e){
  e.preventDefault()
  sendMessage()
})

$('.emoji').on('click', function(){
  var textarea = $('#message-area')

  textarea.val(textarea.val() + this.innerText)
})
