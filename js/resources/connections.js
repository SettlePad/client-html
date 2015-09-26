//Connections

function connections_load() {
  var compiledTemplate = Handlebars.getTemplate('connections');
  $("#content").html(compiledTemplate({connections: contacts}));
}

//Show modal
function connections_add() {
  $('#connectionsAddContactModal').modal();
}

$('#connectionsAddContactModal').on('shown.bs.modal', function (e) {
  $('#connectionsAddContactModalEmail').focus();
})

//Process submit
function connections_add_submit() {
  is_valid = true;
  if (!isValidEmailAddress($('#connectionsAddContactModalEmail').val())) {
      $('#connectionsAddContactModalEmail').focus();
      is_valid = false;
      $('#connectionsAddContactModalEmail').parent().addClass('has-error');
  } else {
      $('#connectionsAddContactModalEmail').parent().removeClass('has-error');
  }
  if (is_valid) {
    //hide
    emailVal = $('#connectionsAddContactModalEmail').val();
    $('#connectionsAddContactModal').modal('hide');

    //Propagate to API
    $.ajaxWrapper(
      'contacts/'+emailVal, //resource
      'POST', //type
      true, //secure
      {favorite: 1, auto_accept: 0, friendly_name: ''}, //data,
      true, //notification
      {
        success: function(data){
          //Refresh local database and show settings
          document.location.hash = 'connection/'+emailVal;
          //contacts_get(false, emailVal);
        }
      } //ajax options
    );

    //Add local
    contacts.push();

  }
}


//Connection
function connection_load(identifier) {
  currency_key = localStorage.getItem('user_default_currency');

  var compiledTemplate = Handlebars.getTemplate('connection');

  contactObj = contact_get_by_identifier(identifier);
  if (contactObj != null) {
    auto_accept_manual = (contactObj.auto_accept == 0);
    auto_accept_up_to_limit = (contactObj.auto_accept == 1);
    auto_accept_automatic = (contactObj.auto_accept == 2);
    $("#content").html(compiledTemplate({
      connection: contactObj,
      default_currency: currency_key,
      auto_accept_manual: auto_accept_manual,
      auto_accept_up_to_limit: auto_accept_up_to_limit,
      auto_accept_automatic: auto_accept_automatic,
    }));
    render_limits_table(auto_accept_up_to_limit); //in other cases, hide it
  } else {
    $("#content").html(compiledTemplate());
  }

  $("#connection_name").change(function(e) {
    connection_submit(identifier, 'name');
  });

  //$('#auto_accept_div .btn').click(function(){
  $('input[name="auto_accept"]').change(function() {
        connection_submit(identifier,'auto_accept');
  });

  $('input[name="favorite"]').change(function() {
        connection_submit(identifier,'favorite');
  });

  $('#connection_currency_input').typeahead(null, {
    displayKey: 'key',
    source: substringCurrencyMatcher(),
    templates: {
      suggestion: Handlebars.compile('<p><strong>{{value}}</strong> ({{key}})</p>')
    }
  });

  $('#connection_currency_input').bind('typeahead:selected', function(evt,suggestion,dataset){
    connection_parse_currency();
  });
}

function render_limits_table(show){
  if (show) {
    $('#limits_table').show();
  } else {
    $('#limits_table').hide();
  }
}

function connection_set_currency(currency) {
  $('#connection_currency').html(currency);
}

function connection_parse_currency() {
  result = true;
  if($('#connection_currency_input').val() in currencies) {//should be non-empty
    $('#connection_limit_group').removeClass('has-error');
  } else {
    $('#connection_limit_group').addClass('has-error');
    result = false;
  }
  if (result) {
    connection_set_currency($('#connection_currency_input').val());
    connection_show_currency_form();
  }
}

function connection_show_currency_form() {
  if ($('#connection_currency_group').hasClass('hidden')) {
    $('#connection_currency_group').removeClass('hidden');
    $('#connection_amount_group').addClass('hidden');
    $('#connection_currency_input').val('').focus();
  } else {
    $('#connection_currency_group').addClass('hidden');
    $('#connection_amount_group').removeClass('hidden');
    $('#connection_amount').focus();
  }
}

function connection_submit(identifier, field) {
  can_submit = false;

  if (field == 'limit') {
    $('#connection_amount').val($('#connection_amount').val().replace(',','.'));
    var patt=/^\d+(\.\d\d?)?$/;
    if (!patt.test($('#connection_amount').val()) && $('#connection_amount').val() != '') { //should be non-negamount
      $('#connection_amount').parent().addClass('has-error');
    } else {
      can_submit = true;
      if ($('#connection_amount').val() == '') {
        value = 0;
      } else {
        value = $('#connection_amount').val();
      }
      currency = $('#connection_currency').html();
      $('#connection_amount').parent().removeClass('has-error');

      contactObj = contact_get_by_identifier(identifier);
      if (contactObj != null) {
        if (value > 0) {
          if (contactObj.limits == null) contactObj.limits = {}
          contactObj.limits[currency] = value;
        } else if (contactObj.limits != null && contactObj.limits[currency] != null) {
          //so remove it, if it exists
          delete contactObj.limits[currency]; //limits is a object literal (so dictionary), on which you can do delete, see http://stackoverflow.com/questions/8173210/delete-vs-splice-on-associative-array
        }
        connection_post(identifier, {limits: contactObj.limits});
      }
      connection_load(identifier);
    }
  } else if (field == 'name') {
    value = $('#connection_name').val();
    $('#connection_name').parent().addClass('has-success');
    setTimeout(function() {
      $('#connection_name').parent().removeClass('has-success');
    }, 1000);
    connection_post(identifier, {friendly_name: value});
  } else if (field == 'auto_accept') {
      value = parseInt($('input[name="auto_accept"]:radio:checked').val());
      render_limits_table(value == 1);
      connection_post(identifier, {auto_accept: value});
  }  else if (field == 'favorite') {
    value = parseInt($('input[name="favorite"]:radio:checked').val());
    connection_post(identifier, {favorite: value});
  }

}

function connection_remove_limit(identifier,currency) {
  contactObj = contact_get_by_identifier(identifier);
  if (contactObj != null && contactObj.limits != null && contactObj.limits[currency] != null) {
    //so remove it, if it exists
    delete contactObj.limits[currency]; //limits is a object literal (so dictionary), on which you can do delete, see http://stackoverflow.com/questions/8173210/delete-vs-splice-on-associative-array
  }
  connection_post(identifier, {limits: contactObj.limits});
  connection_load(identifier);
}

function connection_remove_modal() {
  $('#connectionRemoveModal').modal();
}

function connection_remove(identifier) {
  $('#connectionRemoveModal').modal('hide');
  contactIndex = contact_get_index_by_identifier(identifier);
  if (contactIndex != null) {
    contacts.splice([contactIndex],1); //remove only 1
    connection_post(identifier, {identifier: ''});
  }
  document.location.hash = 'connections';
}

function connection_post(identifier, payload) {
  //Update local database
  contactObj = contact_get_by_identifier(identifier);
  if (contactObj != null) {
    $.each(payload, function(field, value) {
      contactObj[field] = value;
    });
    contacts_add_metadata();
  }

  //Propagate to API
  $.ajaxWrapper(
    'contacts/'+identifier, //resource
    'POST', //type
    true, //secure
    payload, //data,
    false, //notification
    {
    } //ajax options
  );
}
