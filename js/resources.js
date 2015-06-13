//TODO: implement limits
//TODO: implement registration
//TODO: implement forgot my password (/#reset/email/token)

//Balance
	var multiple_currencies = true; //becomes true if balance_currencies is called, so that a back link can be shown to the currency overview page
	function balance_currencies() {
		var currencies;
		$.ajaxWrapper(
			'balance', //resource
			'GET', //type
			true, //secure
			{}, //data,
			true, //notification
			{
				success: function(data){
					currencies = balance_format(data.data);
					if (currencies !== undefined && currencies.length == 1) {
						multiple_currencies = false;
						balance_currency(currencies[0].currency);
					} else {
						var compiledTemplate = Handlebars.getTemplate('balance_currencies');
						$("#content").html(compiledTemplate({currencies: currencies}));
					}
				}
			} //ajax options
		);
	}

	function balance_currency(currency) {
		$.ajaxWrapper(
			'balance/currencies/'+currency, //resource
			'GET', //type
			true, //secure
			{}, //data,
			true, //notification
			{
				success: function(data){
					var compiledTemplate = Handlebars.getTemplate('balance_currency');
					if (data.data.connections !== undefined) {
						$("#content").html(compiledTemplate({selected_currency: currency, balaces: balance_format(data.data.summary[currency]), connections: balance_format(data.data.connections[currency].sort(balance_sort)), multiple_currencies: multiple_currencies}));
					} else {
						$("#content").html(compiledTemplate);
					}
				}
			} //ajax options
		);
	}

	function balance_sort(a,b) {
		return b.balance - a.balance;
	}

	function balance_format(data) {
		if (data.balance !== undefined) {
				data.balance_formatted = number_format(data.balance,2,true);
				data.balance_negative = data.balance < 0;
		}
		if (data.owe !== undefined) {
				data.owe_formatted = number_format(data.owe,2,true);
				data.owe_active = data.owe < 0;
		}
		if (data.get !== undefined) {
				data.get_formatted = number_format(data.get,2,true);
				data.get_active = data.get > 0;
		}
		for (index = 0; index < data.length; ++index) {
			if (data[index].balance !== undefined) {
					data[index].balance_formatted = number_format(data[index].balance,2,true);
					data[index].balance_negative = data[index].balance < 0;
			}
			if (data[index].owe !== undefined) {
					data[index].owe_formatted = number_format(data[index].owe,2,true);
					data[index].owe_active = data[index].owe < 0;
			}
			if (data[index].get !== undefined) {
					data[index].get_formatted = number_format(data[index].get,2,true);
					data[index].get_active = data[index].get > 0;
			}
		}
		return data;
	}

//Transactions
	transaction_max_request =20;
	search = '';
	function transactions_init() {
		$.ajaxWrapper(
			'transactions/initial/'+transaction_max_request+'/'+encodeURIComponent(search)+'/', //resource
			'GET', //type
			true, //secure
			{}, //data,
			true, //notification
			{
				success: function(data){
					var compiledTemplate = Handlebars.getTemplate('transactions_frame');
					if (data.data !== null) {
						transactions_oldest_id = data.data.oldest_id;
						transactions_newest_id = data.data.newest_id;
						transactions_last_update = data.data.last_update;
						transactions_end_reached = (data.data.transactions.length < transaction_max_request);
						$("#content").html(compiledTemplate({transactions_present: true, search: search}));
						var compiledTemplate = Handlebars.getTemplate('transactions_list');
						$("#transactions_list").html(compiledTemplate({transactions: transactions_format(data.data.transactions)}));
						if (transactions_end_reached) {
							$("#transactions_end_reached").removeClass('hidden'); //Hide load more button
							$("#transactions_load_button").addClass('hidden'); //Hide load more button
						}
					} else {
						$("#content").html(compiledTemplate({transactions_present: false, search: search}));
					}

					//Catch the search form submit
					$('#transactions_searchform').submit(function() {
						transaction_search();
						return false;
					});
				}
			} //ajax options
		);
	}

	transactions_loading = false;
	function transactions_older() {
		if (!transactions_loading) {
			transactions_loading = true;
			$("#transactions_load_loader").removeClass('hidden'); //Show AJAX loader ball
			$("#transactions_load_button").addClass('hidden'); //Hide load more button
			$.ajaxWrapper(
				'transactions/older/'+transactions_oldest_id+'/'+transaction_max_request+'/'+encodeURIComponent(search)+'/', //resource
				'GET', //type
				true, //secure
				{}, //data,
				true, //notification
				{
					success: function(data){
						if (data.data !== null) {
							transactions_oldest_id = data.data.oldest_id;
							transactions_end_reached = (data.data.transactions.length < transaction_max_request);
							var compiledTemplate = Handlebars.getTemplate('transactions_list');
							$("#transactions_list").append(compiledTemplate({transactions: transactions_format(data.data.transactions)}));
							if (transactions_end_reached) {
								$("#transactions_end_reached").removeClass('hidden'); //Hide load more button
							} else {
								$("#transactions_load_button").removeClass('hidden'); //Hide load more button
							}
						}
						$("#transactions_load_loader").addClass('hidden'); //Show AJAX loader ball
						transactions_loading = false;
					}
				} //ajax options
			);
		}
	}

	function transactions_newer() {
		$.ajaxWrapper(
			'transactions/newer/'+transactions_newest_id+'/'+transaction_max_request+'/'+encodeURIComponent(search)+'/', //resource
			'GET', //type
			true, //secure
			{}, //data,
			true, //notification
			{
				success: function(data){
					if (data.data !== null) {
						transactions_newest_id = data.data.newest_id;
					}
				}
			} //ajax options
		);
	}

	function transactions_update() {
		$.ajaxWrapper(
			'transactions/updates/'+transactions_oldest_id+'/'+transactions_newest_id+'/'+transactions_last_update+'/'+encodeURIComponent(search)+'/', //resource
			'GET', //type
			true, //secure
			{}, //data,
			true, //notification
			{
				success: function(data){
					if (data.data !== null) {
						transactions_last_update = data.data.last_update;
						var compiledTemplate = Handlebars.getTemplate('transactions_list');
						$.each(data.data.transactions, function(i, transaction) {
							$('#transaction_'+transaction.transaction_id).replaceWith(compiledTemplate({transactions: transactions_format([transaction])}));
						});
					}
				}
			} //ajax options
		);
	}

	function transactions_format(data) {
		for (index = 0; index < data.length; ++index) {
			if (data[index].amount !== undefined) {
				data[index].amount_formatted = number_format(data[index].amount,2,true);
				data[index].amount_negative = data[index].amount < 0;

				var d = moment(data[index].time_sent);
				data[index].time_sent_humane = d.fromNow();
				data[index].time_sent_formatted = d.format('D MMMM YYYY, HH:mm:ss');

				if(data[index].status <=1 && data[index].is_sender && moment().diff(d,'minutes') <= 4) {
					data[index].can_cancel = true;
				} else {
					data[index].can_cancel = false;
				}

				if (data[index].status == 3) {
					data[index].status_canceled = true;
				} else {
					data[index].status_canceled = false;
				}

				if (data[index].status == 1) {
					data[index].status_pending = true;
					if (!data[index].is_sender) {
						data[index].can_accept = true;
					} else {
						data[index].can_accept = false;
					}
				} else {
					data[index].status_pending = false;
					data[index].can_accept = false;
				}

				if (data[index].reduced == 1) {
					data[index].reduced = true;
				} else {
					data[index].reduced = false;
				}

				$.each(contacts, function(i, contact) {
					if (contact.id == data[index].counterpart_id && contact.friendly_name !== null) {
						data[index].counterpart_name = contact.friendly_name;
					}
				});
			}
		}
		return data;
	}

	function element_in_scroll(elem) {
		//Thanks to http://dumpk.com/2013/06/02/how-to-create-infinite-scroll-with-ajax-on-jquery/
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();
    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop + $(elem).height();
		return (elemBottom - 100 <= docViewBottom);
	}

	function transaction_toggle(e) {
			$(e).children("div").toggleClass('hidden');
			$(e).siblings().children("div.transaction_toggle").addClass('hidden');
			$(e).siblings().children("div.transaction_anti_toggle").removeClass('hidden');
	};

	function transaction_search() {
		search = $('#transactions_searchinput').val();
		transactions_init();
	}


	//Catch document scroll
	$(document).scroll(function(e){
		if( $('#transactions_list').length && transactions_end_reached == false) {
			if (element_in_scroll("#transactions_list")) transactions_older();
		}
	});

	function transaction_accept(id, action) {
		$.ajaxWrapper(
			'transactions/'+action+'/'+id, //resource
			'POST', //type
			true, //secure
			{}, //data,
			false, //notification
			{
				success: function(data){
					transactions_update();
				}
			} //ajax options
		);
	}

//Send IOU or UOMe
	function send_load(){
		var compiledTemplate = Handlebars.getTemplate('send_memo');
		$("#content").html(compiledTemplate({}));

		if (send_list.length > 0) {
			var compiledTemplate = Handlebars.getTemplate('send_list');
			$("#sendform_list").append(compiledTemplate({transactions: send_format(send_list.slice(0,send_list.length))}));
			$('#send_add_button').html('Add'); //Instead of add another
		}

		if(contacts_loaded) {
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
		}
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
	}

	function send_set_currency(currency) {
		$('#send_currency').html(currency);
	}

	//Typeahead for recipients
	var substringContactsMatcher = function() {
	  return function findMatches(q, cb) {
	    var matches, substrRegex;

	    // an array that will be populated with substring matches
	    matches = [];

	    // regex used to determine if a string contains the substring `q`
	    substrRegex = new RegExp(escapeRegExp(q), 'i');

	    // iterate through the pool of strings and for any string that
	    // contains the substring `q`, add it to the `matches` array
	    $.each(contacts, function(i, contact) {
				$.each(contact.identifiers, function(j, identifier) {
	      	if (substrRegex.test(identifier.identifier) || substrRegex.test(contact.name)) {
	        	// the typeahead jQuery plugin expects suggestions to a
	        	// JavaScript object, refer to typeahead docs for more info
	        	matches.push({ name: contact.name, identifier: identifier.identifier, identifier_type: identifier.type});
	      	}
	    	});
			});
	    cb(matches);
	  };
	};

	var send_list = []; //array of UOMe/IOU's
	var send_list_id = 0;

	function send_add(){
		if (send_check()) {
			if ($('#send_form input[type=radio]:checked').val() == 'iou') {
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
				'uome/send/', //resource
				'POST', //type
				true, //secure
				send_list, //data,
				true, //notification
				{
					success: function(data){
						if (data.data !== null) {
							document.location.hash = 'transactions';

							//reset send list
							send_list = []; //array of UOMe/IOU's
							send_list_id = 0;

							$.bootstrapGrowl('UOme sent. Not right? You can cancel them for 5 minutes (not yet implemented).', {'delay':2000, 'type':'success'});
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

//Settings
	function settings(){
		var compiledTemplate = Handlebars.getTemplate('settings');
		identifiers = $.parseJSON(localStorage.getItem('user_identifiers'));
		if (identifiers == null) {
			login_credentials_count = 0;
		} else {
			login_credentials_count = identifiers.length;
		}

		favorites = jQuery.grep(contacts, function( contact, index ) {
  		return ( contact.favorite == 1 );
		});
		if (favorites == null) {
			favorite_count = 0;
		} else {
			favorite_count = favorites.length;
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

	//Typeahead for currencies
	var substringCurrencyMatcher = function() {
	  return function findMatches(q, cb) {
	    var matches, substrRegex;

	    // an array that will be populated with substring matches
	    matches = [];

	    // regex used to determine if a string contains the substring `q`
	    substrRegex = new RegExp(escapeRegExp(q), 'i');

	    // iterate through the pool of strings and for any string that
	    // contains the substring `q`, add it to the `matches` array
			$.each(currencies, function(key, value) {
      	if (substrRegex.test(value) || substrRegex.test(key)) {
        	// the typeahead jQuery plugin expects suggestions to a
        	// JavaScript object, refer to typeahead docs for more info
        	matches.push({ key: key, value: value});
      	}
    	});

	    cb(matches);
	  };
	};

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

//Connections
	function connections_load() {
		var compiledTemplate = Handlebars.getTemplate('connections');
		$("#content").html(compiledTemplate({connections: contacts}));
		$('#connections_popover_auto_accept').popover();
		$('#connections_popover_favorite_debtor').popover();

		$("input[id^='connection_auto_accept_']").click(function(e) {
			//if checked, set default limit and focus on limit input box
			//if unchecked, clear limit field
			id = e.target.id.split('_')[3];
			if ($('#connection_auto_accept_'+id).prop('checked') == false) $('#connection_limit_'+id).val('');
			if ($('#connection_auto_accept_'+id).prop('checked') == true) {
				$('#connection_limit_'+id).val('100');
				$('#connection_limit_'+id).focus();
			}
			connections_submit(id, 'limit');
		});

		$("input[id^='connection_limit_']").on('input', function(e) {
			//check checkbox if input contains data
			//uncheck checkbox if input is cleared
			id = e.target.id.split('_')[2];
			$('#connection_limit_'+id).parent().removeClass('has-error');
			if (e.target.value != '' && $('#connection_auto_accept_'+id).prop('checked') == false) $('#connection_auto_accept_'+id).prop('checked', true);
			if (e.target.value == '' && $('#connection_auto_accept_'+id).prop('checked') == true) $('#connection_auto_accept_'+id).prop('checked', false);
		});

		$("input[id^='connection_limit_']").change(function(e) {
			id = e.target.id.split('_')[2];
			connections_submit(id, 'limit');
		});

		$("input[id^='connection_name_']").change(function(e) {
			id = e.target.id.split('_')[2];
			connections_submit(id, 'name');
		});
	}

	function connections_submit(id, field) {
		//Three fields: limit (non-neg float), favorite (0 or 1) and name (string)
		//Interpret 0 as NULL for limit and favorite, '' as NULL for name

		can_submit = false;

		//TODO: auto_limit implementation is outdated. Fix it!

		if (field == 'limit') {
			db_field = 'auto_limit';
			$('#connection_limit_'+id).val($('#connection_limit_'+id).val().replace(',','.'));
			var patt=/^\d+(\.\d\d?)?$/;
			if (!patt.test($('#connection_limit_'+id).val()) && $('#connection_limit_'+id).val() != '') { //should be non-negamount
				$('#connection_limit_'+id).parent().addClass('has-error');
			} else {
				can_submit = true;
				if ($('#connection_limit_'+id).val() == '') {
					value = null;
				} else {
					value = $('#connection_limit_'+id).val();
				}
				$('#connection_limit_'+id).parent().removeClass('has-error');
				$('#connection_limit_'+id).parent().addClass('has-success');
				setTimeout(function() {
					$('#connection_limit_'+id).parent().removeClass('has-success');
				}, 1000);
			}
		} else if (field == 'name') {
			db_field = 'friendly_name';
			can_submit = true;
			if ($('#connection_name_'+id).val() == ''){
				value = null;
			} else {
				value = $('#connection_name_'+id).val();
			}
			$('#connection_name_'+id).parent().addClass('has-success');
			setTimeout(function() {
				$('#connection_name_'+id).parent().removeClass('has-success');
			}, 1000);
		}  else if (field == 'favorite') {
			db_field = 'favorite';
			can_submit = true;
			if ($('#connection_favorite_'+id).hasClass('glyphicon-star-empty')) {
				//to become a favorite
				$('#connection_favorite_'+id).removeClass('glyphicon-star-empty');
				$('#connection_favorite_'+id).removeClass('text-muted');
				$('#connection_favorite_'+id).addClass('glyphicon-star');
				$('#connection_favorite_'+id).addClass('connections_yellow');
				value = 1;
			} else {
				//to become a non-favorite
				$('#connection_favorite_'+id).addClass('glyphicon-star-empty');
				$('#connection_favorite_'+id).addClass('text-muted');
				$('#connection_favorite_'+id).removeClass('glyphicon-star');
				$('#connection_favorite_'+id).removeClass('connections_yellow');
				value = null;
			}
		}

		if (can_submit) contacts_post(id, db_field, value);
	}

//Validate email address
	function validate_email(email,token) {
		$.ajaxWrapper(
			'register/verify/', //resource
			'POST', //type
			false, //secure
			{identifier: email, token: token}, //data,
			true, //notification
			{
				success: function(data){
					$.bootstrapGrowl('Email address validated. Now please login', {'delay':2000, 'type':'success'});
					document.location.hash = 'reset';
					$(window).hashchange();
				}
			} //ajax options
		);
	}

//Local contacts database (only API-contacts in webversion)
	var contacts = []; //array of objects
	var contacts_loaded = false;

	function contacts_get(show_connections) {
		//Load contacts first and limits afterwards
		localStorage.setItem('user_contacts_last_update', moment().unix());

		$.ajaxWrapper(
			'contacts', //resource
			'GET', //type
			true, //secure
			{}, //data,
			false, //notification
			{
				success: function(data){
					contacts = data.data;
					localStorage.setItem('user_contacts', JSON.stringify(contacts));
					$.ajaxWrapper(
						'autolimits', //resource
						'GET', //type
						true, //secure
						{}, //data,
						false, //notification
						{
							success: function(data){
								limits = data.data;
								contacts_loaded = true;
								localStorage.setItem('user_limits', JSON.stringify(limits));
								if(show_connections) connections_load();
							}
						} //ajax options
					);

				}
			} //ajax options
		);
	}


	function contacts_get_if_needed(){
		if (localStorage.getItem('user_contacts_last_update') === null || Number(localStorage.getItem('user_contacts_last_update')) < (moment().unix() - 60*60*24)) {
			//update if not present, otherwise every 24h
			contacts_get(false);
		} else if(!contacts_loaded) {
			//put in contacts var
			contacts = $.parseJSON(localStorage.getItem('user_contacts'));
 			limits = $.parseJSON(localStorage.getItem('user_limits'));
			contacts_loaded = true;
		}
	}

	function contacts_post(id, field, value) {
		//Update local database
		$.each(contacts, function(i, contact) {
			if (contact.id == id) {
				contacts[i][field] = value;
			}
		});
		localStorage.setItem('user_contacts', JSON.stringify(contacts));

		//Propagate to API
		$.ajaxWrapper(
			'contacts/'+id, //resource
			'POST', //type
			true, //secure
			{field: field, value: value}, //data,
			false, //notification
			{
			} //ajax options
		);
	}

//General functions
	function number_format(number,decimals,show_sign) {
		var decimal_sep = '.';
		var thousand_sep = ',';
		if(!show_sign) {
			number = Math.abs(number);
		} else {
			number = number*1;
		}
		number = number.toFixed(decimals) + '';
		var x = number.split('.');
		var x1 = x[0];
		var x2 = x.length > 1 ? decimal_sep + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + thousand_sep + '$2');
		}
		return x1 + x2;
	}

	function isValidEmailAddress(emailAddress) {
		//thanks to http://stackoverflow.com/questions/2855865/jquery-regex-validation-of-e-mail-address
		var pattern = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i);
	  return pattern.test(emailAddress);
	};

	function escapeRegExp(str) {
  	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	}
