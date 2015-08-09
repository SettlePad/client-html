//TODO: implement registration

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

				if((data[index].status == 0 && data[index].is_sender && moment().diff(d,'minutes') <= 4) || (data[index].status == 1 && data[index].is_sender)) {
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

//Send memo
	function send_load(){
		currency_key = localStorage.getItem('user_default_currency');

		var compiledTemplate = Handlebars.getTemplate('send_memo');
		$("#content").html(compiledTemplate({default_currency: currency_key}));

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
		$('#sendform_to').on('paste', function () {
		  setTimeout(function () {
				if(contacts_loaded) {
					$('#sendform_to').typeahead('val', $('#sendform_to').val().match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi) );
				} else {
					$('#sendform_to').val($('#sendform_to').val().match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi));
				}
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
							document.location.hash = 'transactions';

							//reset send list
							send_list = []; //array of memos
							send_list_id = 0;

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

//Settings
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

//Identifiers
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

//Connections
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
			if ($('#connection_name').val() == ''){
				value = null;
			} else {
				value = $('#connection_name').val();
			}
			$('#connection_name').parent().addClass('has-success');
			setTimeout(function() {
				$('#connection_name').parent().removeClass('has-success');
			}, 1000);
			connection_post(id, 'friendly_name', value);
		} else if (field == 'auto_accept') {
				value = parseInt($('input[name="auto_accept"]:radio:checked').val());
				render_limits_table(value == 1);
				connection_post(id, 'auto_accept', value);
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
			connection_post(id, 'favorite', value);
		}

	}

	function connection_remove_limit(id,currency) {
		limit_post(id, currency, 0);
		connection_load(id);
	}

	function connection_post(id, field, value) {
		//Update local database
		if (id in contacts) {
			contacts[id][field] = value;
			localStorage.setItem('user_contacts', JSON.stringify(contacts));
		}

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

//Local metadata: contacts, limits and identifiers
	var contacts = {}; //dict
	var contacts_loaded = false;
	var limits = {}; //dict
	var identifiers = []; //array

	function contacts_get(show_connections) {
		//Load contacts first and limits afterwards
		localStorage.setItem('user_contacts_last_update', moment().unix());

		$.ajaxWrapper(
			'contacts', //resource
			'GET', //type
			true, //secure
			{}, //data,
			show_connections, //notification
			{
				success: function(data){
					contacts = data.data;
					$.ajaxWrapper(
						'autolimits', //resource
						'GET', //type
						true, //secure
						{}, //data,
						false, //notification
						{
							success: function(data){
								if (data.data != '') limits = data.data;
								contacts_loaded = true;
								add_limits_to_contacts();
								if(show_connections) connections_load();
							}
						} //ajax options
					);

				}
			} //ajax options
		);
	}

	function add_limits_to_contacts() {
		if (contacts != null) {
			//clean current limits
			$.each(contacts, function(key, contact) {
				contacts[key]['limits'] = null;
			});

			//add new
			if (limits != null) {
				$.each(limits, function(id, connection_limits) {
					if (id in contacts) {
						contacts[id]['limits'] = {};
						$.each(connection_limits, function(currency, limit) {
							contacts[id]['limits'][currency] = number_format(limit,2,true);
						});
					}
				});
				localStorage.setItem('user_limits', JSON.stringify(limits));
			}
			localStorage.setItem('user_contacts', JSON.stringify(contacts));
		}
	}

	function sync_metadata_if_needed(){
		if (localStorage.getItem('user_contacts_last_update') === null || Number(localStorage.getItem('user_contacts_last_update')) < (moment().unix() - 60*60*24)) {
			//update if not present, otherwise every 24h
			contacts_get(false);
			//TODO: also update identifiers

		} else if(!contacts_loaded) {
			//put in contacts var
			contacts = $.parseJSON(localStorage.getItem('user_contacts'));
 			limits = $.parseJSON(localStorage.getItem('user_limits'));
			identifiers = $.parseJSON(localStorage.getItem('user_identifiers'));
			contacts_loaded = true;
		}
	}




//General functions
