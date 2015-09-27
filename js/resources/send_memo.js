function send_load(){
  currency_key = localStorage.getItem('user_default_currency');

  var compiledTemplate = Handlebars.getTemplate('send_memo');
  $("#content").html(compiledTemplate({default_currency: currency_key}));

  if (send_list.length > 0) {
    var compiledTemplate = Handlebars.getTemplate('send_list');
    $("#sendform_list").append(compiledTemplate({transactions: send_format(send_list.slice(0,send_list.length))}));
    $('#send_add_button').html('Add'); //Instead of add another
  }

  $('#sendform_to').typeahead(null, {
    name: 'contacts',
    displayKey: 'identifier',
    source: substringContactsMatcher(),
    templates: {
      suggestion: Handlebars.compile('<p><strong>{{name}}</strong> &lt;{{identifier}}&gt;</p>')
    }
  });
  $('#sendform_to').bind('typeahead:selected', function(evt,suggestion,dataset){
      //submit form or add another
      //send_add();
  });

  $('#sendform_to').on('paste', function () {
    setTimeout(function () {
      //if(!jQuery.isEmptyObject(contacts)) {
        $('#sendform_to').typeahead('val', $('#sendform_to').val().match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi) );
      //} else {
      //  $('#sendform_to').val($('#sendform_to').val().match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi));
      //}
    }, 100);
  });

  $('#sendform_description').focus();

  $('#send_form').submit(function() {
    return false;
  });
  $('#sendform_description').keydown(function() {
    if (event.keyCode == 13) $('#sendform_amount').focus();
  });
  $('#sendform_amount').keydown(function() {
    if (event.keyCode == 13) $('#sendform_to').focus();
  });
  $('#sendform_to').keydown(function() {
    if (event.keyCode == 13) send_add();
  });

  $('#sendform_currency').typeahead(null, {
    displayKey: 'key',
    source: substringCurrencyMatcher(),
    templates: {
      suggestion: Handlebars.compile('<p><strong>{{value}}</strong> ({{key}})</p>')
    }
  });

  $('#sendform_currency').bind('typeahead:selected', function(evt,suggestion,dataset){
    send_parse_currency();
  });
}

function send_set_currency(currency) {
  $('#send_currency').html(currency);
}

function send_parse_currency() {
  result = true;
  if($('#sendform_currency').val() in currencies) {//should be non-empty
    $('#send_currency_group').removeClass('has-error');
  } else {
    $('#send_currency_group').addClass('has-error');
    result = false;
  }
  if (result) {
    send_set_currency($('#sendform_currency').val());
    send_show_currency_form();
  }
}

function send_show_currency_form() {
  if ($('#sendform_currency_row').hasClass('hidden')) {
    $('#sendform_currency_row').removeClass('hidden');
    $('#sendform_amount_row').addClass('hidden');
    $('#send_add_button').addClass('hidden');
    $('#send_send_button').addClass('hidden');
    $('#sendform_currency').val('').focus();
  } else {
    $('#sendform_currency_row').addClass('hidden');
    $('#sendform_amount_row').removeClass('hidden');
    $('#send_add_button').removeClass('hidden');
    $('#send_send_button').removeClass('hidden');
    $('#sendform_amount').focus();
  }
}


var send_list = []; //array of memos
var send_list_id = 0;

function send_add(){
  if (send_check()) {
    if ($('#send_form input[type=radio]:checked').val() == 'owe') {
      amount = -1*parseFloat($('#sendform_amount').val());
    } else {
      amount = parseFloat($('#sendform_amount').val());
    }
    name = '';
    $.each(contacts, function(i, contact) {
      $.each(contact.identifiers, function(j, identifier) {
        if (identifier.identifier == $('#sendform_to').val()) {
          // the typeahead jQuery plugin expects suggestions to a
          // JavaScript object, refer to typeahead docs for more info
          name = contact.name;
        }
      });
    });
    send_list.push({
      recipient: $('#sendform_to').val(),
      currency: $('#send_currency').html(),
      name: name,
      name_available: name != '',
      description: $('#sendform_description').val(),
      amount: amount,
      id: send_list_id
    });
    send_list_id++;
    var compiledTemplate = Handlebars.getTemplate('send_list');
    $("#sendform_list").append(compiledTemplate({transactions: send_format(send_list.slice(send_list.length-1,send_list.length))}));
    $('.typeahead').typeahead('val', '');
    $('#send_add_button').html('Add'); //Instead of add another
    $('#sendform_to').focus();
    return true;
  } else {
    return false;
  }
}

function send_send() {
  can_send=false;

  if ($('#sendform_to').val() != '') {
    if (send_add()) can_send=true;
  } else {
    if (send_list.length > 0) can_send=true;
  }

  if (can_send) {
    $.ajaxWrapper(
      'memo/send/', //resource
      'POST', //type
      true, //secure
      send_list, //data,
      true, //notification
      {
        success: function(data){
          if (data.data !== null) {
            transactions_search = '';
            document.location.hash = 'transactions';

            //reset send list
            send_list = []; //array of memos
            send_list_id = 0;

            contacts_get(false,false);
            $.bootstrapGrowl('Memo sent. Not right? You can cancel them for 5 minutes.', {'delay':2000, 'type':'success'});
          }

        }
      } //ajax options
    );
  }
}

function send_remove(identifier){
  //Remove from array
  send_list = $.grep(send_list, function(send_item,i) {
      return (send_item.id == identifier);
  },true);

  //Remove from DOM
  $('#sendlist_'+identifier).remove();

  if (send_list.length == 0) $('#send_add_button').html('Add another'); //Instead of add another

  $('#sendform_to').focus();
}

function send_format(data) {
  for (index = 0; index < data.length; ++index) {
    if (data[index].amount !== undefined) {
        data[index].amount_formatted = number_format(data[index].amount,2,true);
        data[index].amount_negative = data[index].amount < 0;
    }
  }
  return data;
}

function send_check() {
  result = true;
  if(!isValidEmailAddress($('#sendform_to').val())) { //should be email address
      $('#send_recipient_group').addClass('has-error');
      result = false;
  } else {
    $('#send_recipient_group').removeClass('has-error');
  }

  $('#sendform_amount').val($('#sendform_amount').val().replace(',','.'));
  var patt=/^\d+(\.\d\d?)?$/;
  if (!patt.test($('#sendform_amount').val())) { //should be non-negamount
    $('#send_amount_group').addClass('has-error');
    result = false;
  } else {
    $('#send_amount_group').removeClass('has-error');
  }


  if($('#sendform_description').val() == '') {//should be non-empty
    $('#send_description_group').addClass('has-error');
    result = false;
  } else {
    $('#send_description_group').removeClass('has-error');
  }
  return result;
}
