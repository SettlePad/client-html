function identifiers_load() {
  var compiledTemplate = Handlebars.getTemplate('identifiers');
  $("#content").html(compiledTemplate({identifiers: identifiers}));

  //Add listeners
  $('#identifiersAddIdentifierModal').on('shown.bs.modal', function (e) {
    $('#identifiersAddIdentifierModalEmail').val('');
    $('#identifiersAddIdentifierModalPassword').val('');
    $('#identifiersAddIdentifierModalPassword2').val('');
    $('#identifiersAddIdentifierModalEmail').focus();
  })
  $('#identifiersChangePasswordModal').on('shown.bs.modal', function (e) {
    $('#identifiersChangePasswordModalPassword').val('');
    $('#identifiersChangePasswordModalPassword2').val('');
    $('#identifiersChangePasswordModalPassword').focus();
  })
  $('#identifiersVerifyIdentifierModal').on('shown.bs.modal', function (e) {
    $('#identifiersVerifyIdentifierModalToken').val('');
    $('#identifiersVerifyIdentifierModalToken').focus();
  })
}

//Add a new identifier
  //Show modal
  function identifier_add() {
    $('#identifiersAddIdentifierModal').modal();
  }

  //Process submit
  function identifier_add_submit() {
    is_valid = true;
    if (!isValidEmailAddress($('#identifiersAddIdentifierModalEmail').val())) {
        $('#identifiersAddIdentifierModalEmail').focus();
        is_valid = false;
        $('#identifiersAddIdentifierModalEmail').parent().addClass('has-error');
    } else {
        $('#identifiersAddIdentifierModalEmail').parent().removeClass('has-error');
    }
    if ($('#identifiersAddIdentifierModalPassword').val() == '' || $('#identifiersAddIdentifierModalPassword').val() != $('#identifiersAddIdentifierModalPassword2').val()) {
        if (is_valid) $('#identifiersAddIdentifierModalPassword').focus();
        is_valid = false;
        $('#identifiersAddIdentifierModalPassword').parent().addClass('has-error');
    } else {
        $('#identifiersAddIdentifierModalPassword').parent().removeClass('has-error');
    }
    if ($('#identifiersAddIdentifierModalPassword2').val() == '' || $('#identifiersAddIdentifierModalPassword').val() != $('#identifiersAddIdentifierModalPassword2').val()) {
        if (is_valid) $('#identifiersAddIdentifierModalPassword2').focus();
        is_valid = false;
        $('#identifiersAddIdentifierModalPassword2').parent().addClass('has-error');
    } else {
        $('#identifiersAddIdentifierModalPassword2').parent().removeClass('has-error');
    }
    if (is_valid) {
      //hide
      $('#identifiersAddIdentifierModal').modal('hide');

      //Propagate to API
      $.ajaxWrapper(
        'identifiers/new/', //resource
        'POST', //type
        true, //secure
        {identifier: $('#identifiersAddIdentifierModalEmail').val(), password: $('#identifiersAddIdentifierModalPassword').val(), type: 'email'}, //data,
        true, //notification
        {
          success: function(data){
            //Update local database and refresh
            identifiers.push(data.data);
            localStorage.setItem('user_identifiers', JSON.stringify(identifiers)); //TODO: get all localstorage to one place
            identifiers_load();
          }
        } //ajax options
      );
    }
  }

function identifier_change_pwd_modal(identifier) {
  $('#identifiersChangePasswordModalIdentifier').html(identifier);
  $('#identifiersChangePasswordModal').modal();
}

function identifier_change_pwd() {
  is_valid = true;
  if ($('#identifiersChangePasswordModalPassword').val() == '' || $('#identifiersChangePasswordModalPassword').val() != $('#identifiersChangePasswordModalPassword2').val()) {
      if (is_valid) $('#identifiersChangePasswordModalPassword').focus();
      is_valid = false;
      $('#identifiersChangePasswordModalPassword').parent().addClass('has-error');
  } else {
      $('#identifiersChangePasswordModalPassword').parent().removeClass('has-error');
  }
  if ($('#identifiersChangePasswordModalPassword2').val() == '' || $('#identifiersChangePasswordModalPassword').val() != $('#identifiersChangePasswordModalPassword2').val()) {
      if (is_valid) $('#identifiersChangePasswordModalPassword2').focus();
      is_valid = false;
      $('#identifiersChangePasswordModalPassword2').parent().addClass('has-error');
  } else {
      $('#identifiersChangePasswordModalPassword2').parent().removeClass('has-error');
  }
  if (is_valid) {
    //hide
    $('#identifiersChangePasswordModal').modal('hide');

    //Propagate to API
    $.ajaxWrapper(
      'identifiers/change_pwd/', //resource
      'POST', //type
      true, //secure
      {identifier: $('#identifiersChangePasswordModalIdentifier').html(), password: $('#identifiersChangePasswordModalPassword').val()}, //data,
      true, //notification
      {
        success: function(data){
          $.bootstrapGrowl('Password for '+$('#identifiersChangePasswordModalIdentifier').html()+' changed.', {'delay':2000, 'type':'success'});
        }
      } //ajax options
    );
  }
}

function identifier_verify_modal(identifier) {
  $('#identifiersVerifyIdentifierModalIdentifier').html(identifier);
  $('#identifiersVerifyIdentifierModal').modal();
}

function identifier_verify() {
  $('#identifiersVerifyIdentifierModal').modal('hide');

  //Propagate to API
  $.ajaxWrapper(
    'register/verify/', //resource
    'POST', //type
    true, //secure
    {identifier: $('#identifiersVerifyIdentifierModalIdentifier').html(), token: $('#identifiersVerifyIdentifierModalToken').val()}, //data,
    true, //notification
    {
      success: function(data){
        //Update local database and refresh
        identifiers = identifiers.filter(function(e){return e.identifier!==$('#identifiersVerifyIdentifierModalIdentifier').html()})
        identifiers.push(data.data);
        localStorage.setItem('user_identifiers', JSON.stringify(identifiers)); //TODO: get all localstorage to one place
        identifiers_load();
        $.bootstrapGrowl('You have validated '+$('#identifiersChangePasswordModalIdentifier').html()+' successfully.', {'delay':2000, 'type':'success'});
      }
    } //ajax options
  );
}

function identifier_resend_verification_code(identifier) {
  $.ajaxWrapper(
    'register/resend_token/', //resource
    'POST', //type
    false, //secure
    {identifier: identifier, user_id: localStorage.getItem('user_id')}, //data,
    true, //notification
    {
      success: function(data){
        //Update local database and refresh
        $.bootstrapGrowl('A new verification code has been sent to '+identifier+'.', {'delay':2000, 'type':'success'});
      }
    } //ajax options
  );
}

function identifier_remove_modal(identifier) {
  $('#identifiersRemoveIdentifierModalIdentifier').html(identifier);
  $('#identifiersRemoveIdentifierModal').modal();
}

function identifier_remove() {
  //hide
  $('#identifiersRemoveIdentifierModal').modal('hide');

  //Propagate to API
  $.ajaxWrapper(
    'identifiers/delete/', //resource
    'POST', //type
    true, //secure
    {identifier: $('#identifiersRemoveIdentifierModalIdentifier').html()}, //data,
    true, //notification
    {
      success: function(data){
        //Update local database and refresh
        identifiers = identifiers.filter(function(e){return e.identifier!==$('#identifiersRemoveIdentifierModalIdentifier').html()})
        localStorage.setItem('user_identifiers', JSON.stringify(identifiers)); //TODO: get all localstorage to one place
        identifiers_load();
      }
    } //ajax options
  );
}
