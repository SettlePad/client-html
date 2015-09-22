function connections_load() {
  //TODO: slow to load!
  var compiledTemplate = Handlebars.getTemplate('connections');
  $("#content").html(compiledTemplate({connections: contacts}));
}

//Connection
function connection_load(id) {
  currency_key = localStorage.getItem('user_default_currency');

  var compiledTemplate = Handlebars.getTemplate('connection');
  if (id in contacts) {
    auto_accept_manual = (contacts[id].auto_accept == 0);
    auto_accept_up_to_limit = (contacts[id].auto_accept == 1);
    auto_accept_automatic = (contacts[id].auto_accept == 2);
    $("#content").html(compiledTemplate({
      connection: contacts[id],
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
    connection_submit(id, 'name');
  });


  //$('#auto_accept_div .btn').click(function(){
  $('input[name="auto_accept"]').change(function() {
        connection_submit(id,'auto_accept');
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

function connection_submit(id, field) {
  //Three fields: limit (non-neg float), favorite (0 or 1) and name (string)
  //Interpret 0 as NULL for limit and favorite, '' as NULL for name

  can_submit = false;

  if (field == 'limit') {
    $('#connection_amount').val($('#connection_amount').val().replace(',','.'));
    var patt=/^\d+(\.\d\d?)?$/;
    if (!patt.test($('#connection_amount').val()) && $('#connection_amount').val() != '') { //should be non-negamount
      $('#connection_amount').parent().addClass('has-error');
    } else {
      can_submit = true;
      if ($('#connection_amount').val() == '') {
        value = null;
      } else {
        value = $('#connection_amount').val();
      }
      $('#connection_amount').parent().removeClass('has-error');
      limit_post(id, $('#connection_currency').html(), $('#connection_amount').val());
      connection_load(id);
    }
  } else if (field == 'name') {
    value = $('#connection_name').val();
    $('#connection_name').parent().addClass('has-success');
    setTimeout(function() {
      $('#connection_name').parent().removeClass('has-success');
    }, 1000);
    connection_post(id, {friendly_name: value});
  } else if (field == 'auto_accept') {
      value = parseInt($('input[name="auto_accept"]:radio:checked').val());
      render_limits_table(value == 1);
      connection_post(id, {auto_accept: value});
  }  else if (field == 'favorite') {
    if ($('#connection_favorite').hasClass('glyphicon-star-empty')) {
      //to become a favorite
      $('#connection_favorite').removeClass('glyphicon-star-empty');
      $('#connection_favorite').removeClass('text-muted');
      $('#connection_favorite').addClass('glyphicon-star');
      $('#connection_favorite').addClass('connections_yellow');
      value = true;
    } else {
      //to become a non-favorite
      $('#connection_favorite').addClass('glyphicon-star-empty');
      $('#connection_favorite').addClass('text-muted');
      $('#connection_favorite').removeClass('glyphicon-star');
      $('#connection_favorite').removeClass('connections_yellow');
      value = false;
    }
    connection_post(id, {favorite: value});
  }

}

function connection_remove_limit(id,currency) {
  limit_post(id, currency, 0);
  connection_load(id);
}

function connection_post(id, payload) {
  //Update local database
  if (id in contacts) {
    $.each(payload, function(field, value) {
      contacts[id][field] = value;
    });
    localStorage.setItem('user_contacts', JSON.stringify(contacts));
  }

  //Propagate to API
  $.ajaxWrapper(
    'contacts/'+id, //resource
    'POST', //type
    true, //secure
    payload, //data,
    false, //notification
    {
    } //ajax options
  );
}

function limit_post(contact_id, currency, value) {
  //Update local database
  if (limits == null) limits = {};
  if (!(contact_id in limits)) limits[contact_id] = {};

  if (value > 0) {
    limits[contact_id][currency] = value;
  } else {;
    delete limits[contact_id][currency];
    value = 0;
  }
  add_limits_to_contacts();

  //Propagate to API
  $.ajaxWrapper(
    'autolimits/'+contact_id+'/'+currency, //resource
    'POST', //type
    true, //secure
    {auto_limit: value}, //data,
    false, //notification
    {
    } //ajax options
  );
}
