function message_load(){
  var compiledTemplate = Handlebars.getTemplate('message');
  $("#content").html(compiledTemplate({}));

  $('#message_form').submit(function() {
    message_post($('#message_textarea').val());
    return false;
  });
}



function message_post(message) {
  $.ajaxWrapper(
    'message/', //resource
    'POST', //type
    true, //secure
    {'message': message}, //data,
    true, //notification
    {
      success: function(data){
        $.bootstrapGrowl('Sent', {'delay':2000, 'type':'success'});
        $('#message_textarea').val('');
      }
    } //ajax options
  );
}
