function settings(){
  var compiledTemplate = Handlebars.getTemplate('settings');
  if (identifiers == null) {
    login_credentials_count = 0;
  } else {
    login_credentials_count = identifiers.length;
  }


  favorite_count = 0;
  if (contacts != null) {
    $.each(contacts, function(key, contact) {
      if (contact.favorite == 1) {
        favorite_count++;
      }
    });
  }

  if (limits == null) {
    limit_count = 0;
  } else {
    limit_count = Object.keys(limits).length;
  }

  currency_key = localStorage.getItem('user_default_currency');
  $("#content").html(compiledTemplate({name: localStorage.getItem('user_name'), login_credentials: login_credentials_count, login_credentials_multiple: login_credentials_count != 1, default_currency: currency_key, favorites: favorite_count, favorites_multiple: favorite_count != 1, limits: limit_count, limits_multiple: limit_count != 1}));

  $("#settings_name").change(function(e) {
    settings_post('name', e.target.value, true);
  });

  $("#settings_default_currency").change(function(e) {
    settings_post('default_currency', e.target.value, true);
  });

  $('#settings_default_currency').typeahead(null, {
    displayKey: 'key',
    source: substringCurrencyMatcher(),
    templates: {
      suggestion: Handlebars.compile('<p><strong>{{value}}</strong> ({{key}})</p>')
    }
  });

  $('#settings_default_currency').bind('typeahead:selected', function(evt,suggestion,dataset){
    settings_post('default_currency', suggestion.key, true);
  });
}



function settings_post(field, value, propagate) {
  //Update local database
  oldValue = localStorage.getItem('user_'+field, value);
  localStorage.setItem('user_'+field, value);

  payload = {};
  payload[field] = value;

  if (propagate) {
    //Propagate to API
    $.ajaxWrapper(
      'settings/', //resource
      'POST', //type
      true, //secure
      payload, //data,
      false, //notification
      {
        error: function(xhr, errorType, exception) {
          //revert
          settings_post(field,oldValue,false);
          settings();
        },
        success: function(data){
          $.bootstrapGrowl('Saved', {'delay':2000, 'type':'success'});
        }
      } //ajax options
    );
  }
}
