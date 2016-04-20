$(document).ready(function(){
	//Prep callapse menu
	 $('#collapse_navbar').collapse({'toggle': false});

	 //initiate metadata_sync (poll)
	 sync_metadata(); //Check whether contacts etc. should be obtained, and if so, do so


	//Load content
	$(window).hashchange();
});	//executed after the page has loaded

//AJAX wrapper function
jQuery.ajaxWrapper = function(resource, type, secure, data, notification, ajaxOptions) {
	var alert;
	if (type == 'POST') {
		var data = JSON.stringify(data);
		var contenttype = 'application/json';
	} else {
		var data = '';
		var contenttype = 'application/x-www-form-urlencoded; charset=UTF-8'; //is actually only true for POST requests, but this is default, see http://api.jquery.com/jquery.ajax/
	}
	if(localStorage.getItem('user_id') === null && secure) {
		console.log('Tried to call '+resource+' while not logged in.');
	} else {
		$.ajax($.extend({
			type: type,
			contentType: contenttype,
			//url: "http://api.settlepad.local/"+resource, //local
			url: "https://api.settlepad.com/"+resource, //web
			dataType: "json",
			data: data,
			beforeSend: function(jqXHR, settings){
				var timestamp = Math.round((new Date()).getTime() / 1000);
				if (secure) {
					jqXHR.setRequestHeader('X-USER-ID', localStorage.getItem('user_id'));
					jqXHR.setRequestHeader('X-SERIES', localStorage.getItem('user_series'));
				}
				if (notification) {
					alert = $.bootstrapGrowl("Loading...");
				}
			},
			complete: function(jqXHR, textStatus){
				if (notification) {
					alert.alert("close");
				}

				if (textStatus == 'error') {
					try {
						var error_data = $.parseJSON(jqXHR.responseText);
						$.bootstrapGrowl(error_data.error.text, {'delay':2000, 'type':'danger'});
					 } catch (e) {
							$.bootstrapGrowl('Unknown error!', {'delay':2000, 'type':'danger'});
					}
				}
			}
	  }, ajaxOptions));
	}
}

//Bind an event to window.onhashchange that, when the hash changes, gets the hash and adds the class "selected" to any matching nav link.
$(window).hashchange( function(){
	var hash = location.hash.slice(1);
	var hash_split = hash.split("/");

	menu_item = hash_split[0];
	if (menu_item =='connections' || menu_item == 'profile' || menu_item == 'connection' || menu_item == 'identifiers') menu_item = 'settings';

	$("li[id^='menu_']").removeClass('active');
	$('#menu_'+menu_item).addClass('active');

	$("li[id^='navbar_menu_']").removeClass('active');
	$('#navbar_menu_'+menu_item).addClass('active');
	$('#collapse_navbar').collapse('hide');

	//Reset
	if (hash == 'reset') {
		Object.keys(localStorage).forEach(function(key){
			localStorage.removeItem(key); //kill all localstorage items
		});
		$("#content").html('');
		document.location.hash = '';
	}

	if (hash_split[0] == 'validate') validate_email(hash_split[1],hash_split[2]);

	if (localStorage.getItem('user_id') === null) {
		//Not logged in
		if (hash_split[0] == 'register') {
			$('.modal').modal('hide'); //Hide all modals
			$('#registerModalName').val("");
			$('#registerModalEmail').val("");
			$('#registerModalPassword').html("");
			$('#registerModal').modal();
		} else if (hash_split[0] == 'verify') {
			$('.modal').modal('hide'); //Hide all modals
			$('#verifyIdentifierModalToken').html("");
			$('#verifyIdentifierModalIdentifier').html(hash_split[1]);
			$('#verifyIdentifierModal').modal();
		} else {
			$('.modal').modal('hide'); //Hide all modals
			$('#loginEmail').val("");
			$('#loginPassword').val("");
			$('#username_top').html("");
			$('#username_left').html("");
			$('#loginModal').modal();
		}
	} else {
		//Logged in
		$('#username_top').html(localStorage.getItem('user_name'));
		$('#username_left').html(localStorage.getItem('user_name'));

		if (hash_split[0] == 'transactions') {
			search = '';
			transactions_init(hash_split[1]);
		} else if (hash == 'send') {
			send_load();
		} else if (hash == 'balance') {
			balance_currencies();
		} else if (hash_split[0] == 'balance') {
			balance_currency(hash_split[1]);
		} else if (hash == 'message') {
			message_load();
		} else if (hash == 'settings') {
			settings_get(true,false);
		} else if (hash == 'connections') {
			contacts_get(true,false);
		} else if (hash == 'identifiers') {
			settings_get(false,true);
		} else if (hash_split[0] == 'connection'){
			contacts_get(false,hash_split[1]);
		} else if (hash == 'logout') {
			logout(true);
		} else {
			//default
			document.location.hash = 'balance';
		}
	}
})

$('#loginModal').on('shown.bs.modal', function (e) {
	$('#loginEmail').focus();
})

$('#registerModal').on('shown.bs.modal', function (e) {
	$('#registerModalName').focus();
})

$('#verifyIdentifierModal').on('shown.bs.modal', function (e) {
	$('#verifyIdentifierModalToken').focus();
})

//Catch the login form submit
$('#loginForm').submit(function() {
	//do login
	$.ajaxWrapper(
		'login', //resource
		'POST', //type
		false, //secure
		{user: $('#loginEmail').val(), password: $('#loginPassword').val(), provider: 'password'}, //data,
		false, //notification
		{
			success: function(data){
				localStorage.setItem('user_series', data.series);
				localStorage.setItem('user_token', data.token);
				localStorage.setItem('user_id', data.user_id);
				localStorage.setItem('user_name', data.user_name);
				localStorage.setItem('user_iban', data.user_iban);
				localStorage.setItem('user_notify_by_mail', JSON.stringify(data.user_notify_by_mail)); //To save a bool as string
				localStorage.setItem('user_default_currency', data.default_currency);
				identifiers = data.identifiers;

				$.bootstrapGrowl('Logged in', {'delay':2000, 'type':'success'});
				$('#loginModal').modal('hide');
				sync_metadata_now();
				$(window).hashchange();
			},
			error: function(xhr, errorType, exception) {
				//revert
				var error_data = $.parseJSON(xhr.responseText);
				if (error_data.error.code == 'incorrect_credentials') {
					$('#loginModal').modal('hide');
					//$('#loginModal').on('hidden.bs.modal', function (e) {
					$('#requestPasswordResetModal').modal();
					$('#requestPasswordResetModal').on('hidden.bs.modal', function (e) {
						$('#loginModal').modal();
					});
					//});
				} else if (error_data.error.code == 'not_validated') {
					document.location.hash = 'verify/'+$('#loginEmail').val();
				}
			}
		} //ajax options
		);
	return false;
});

$('#registerForm').submit(function() {
	//register new account
	$.ajaxWrapper(
		'register/account', //resource
		'POST', //type
		false, //secure
		{identifier: $('#registerModalEmail').val(), name: $('#registerModalName').val(), password: $('#registerModalPassword').val(), type: 'email', 'primary_currency': 'EUR'}, //data,
		true, //notification
		{
			success: function(data){
				$.bootstrapGrowl('Account created. Check your inbox for a validation code', {'delay':2000, 'type':'success'});
				$('#loginEmail').val($('#registerModalEmail').val());
				$('#loginPassword').val($('#registerModalPassword').val());
				document.location.hash = 'verify/'+$('#registerModalEmail').val();
			}
		} //ajax options
		);
	return false;
});

$('#verifyForm').submit(function() {
  //Propagate to API
  $.ajaxWrapper(
    'register/verify/', //resource
    'POST', //type
    false, //secure
    {identifier: $('#verifyIdentifierModalIdentifier').html(), token: $('#verifyIdentifierModalToken').val()}, //data,
    true, //notification
    {
      success: function(data){
				if ($('#loginEmail').val() != '' && $('#loginPassword').val() != '') {
					//We came here via registerForm and can log in directly
					$('.modal').modal('hide'); //Hide all modals
					$('#loginForm').submit();
				} else {
					//We came here via url, show login form
					$.bootstrapGrowl('Token validated. Now log in please', {'delay':2000, 'type':'success'});
					$('.modal').modal('hide'); //Hide all modals
					document.location.hash = '';
				}

      }
    } //ajax options
  );
	return false;
});

function change_password_submit() {
	$.ajaxWrapper(
		'register/reset_password', //resource
		'POST', //type
		false, //secure
		{identifier: $('#loginEmail').val(), token: $('#resetToken').val(), password: $('#resetPassword').val()}, //data,
		true, //notification
		{
			success: function(data){
				$.bootstrapGrowl("Password successfully changed. Please login with your new password.", {'delay':2000, 'type':'success'});
				$('#resetPasswordModal').modal('hide');

			}
		} //ajax options
	);
}

function change_password_form(sender) {
	$(sender).unbind();
	$(sender).modal('hide');
	$('#resetPasswordModal').modal();
	$('#resetPasswordModal').on('hidden.bs.modal', function (e) {
		$('#loginModal').modal();
	});
}

function request_reset() {
	$.ajaxWrapper(
		'register/request_reset_password', //resource
		'POST', //type
		false, //secure
		{identifier: $('#loginEmail').val()}, //data,
		true, //notification
		{
			success: function(data){
				$.bootstrapGrowl("Email with token sent", {'delay':2000, 'type':'success'});
				change_password_form('#requestPasswordResetModal');
			}
		} //ajax options
	);
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

function logout(also_on_server) {
	if (also_on_server) {
		$.ajaxWrapper(
			'logout', //resource
			'POST', //type
			true, //secure
			{}, //data,
			false, //notification
			{} //ajax options
		);
	}

	//Clear local credentials independent of success of logout
	Object.keys(localStorage).forEach(function(key){
		if (/^user_/.test(key)) localStorage.removeItem(key); //kill all localstorage items starting with user_
	});
	contacts = []; //dict
	identifiers = []; //array*/
	var transaction_status = {latest: null, open: 0, unread: {open: 0, processed: 0, canceled: 0}};

	$("#content").html('');
	document.location.hash = '';
}

//Format number
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


//Typeahead function: clean input
	function escapeRegExp(str) {
		return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
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


//Check whether email adres conforms to spec
	function isValidEmailAddress(emailAddress) {
		//thanks to http://stackoverflow.com/questions/2855865/jquery-regex-validation-of-e-mail-address
		var pattern = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i);
		return pattern.test(emailAddress);
	};


//Currencies
	var currencies = {
		'AFN':'Afghani',
		'ALL':'Lek',
		'DZD':'Algerian Dinar',
		'USD':'US Dollar',
		'EUR':'Euro',
		'AOA':'Kwanza',
		'XCD':'East Caribbean Dollar',
		'ARS':'Argentine Peso',
		'AMD':'Armenian Dram',
		'AWG':'Aruban Florin',
		'AUD':'Australian Dollar',
		'AZN':'Azerbaijanian Manat',
		'BSD':'Bahamian Dollar',
		'BHD':'Bahraini Dinar',
		'BDT':'Taka',
		'BBD':'Barbados Dollar',
		'BYR':'Belarussian Ruble',
		'BZD':'Belize Dollar',
		'XOF':'CFA Franc BCEAO',
		'BMD':'Bermudian Dollar',
		'BTN':'Ngultrum',
		'BOB':'Boliviano',
		'BAM':'Convertible Mark',
		'BWP':'Pula',
		'NOK':'Norwegian Krone',
		'BRL':'Brazilian Real',
		'BND':'Brunei Dollar',
		'BGN':'Bulgarian Lev',
		'BIF':'Burundi Franc',
		'KHR':'Riel',
		'XAF':'CFA Franc BEAC',
		'CAD':'Canadian Dollar',
		'CVE':'Cape Verde Escudo',
		'KYD':'Cayman Islands Dollar',
		'CLP':'Chilean Peso',
		'CNY':'Yuan Renminbi',
		'COP':'Colombian Peso',
		'KMF':'Comoro Franc',
		'CDF':'Congolais Franc',
		'NZD':'New Zealand Dollar',
		'CRC':'Costa Rican Colon',
		'HRK':'Croatian Kuna',
		'CUP':'Cuban Peso',
		'CUC':'Peso Convertible',
		'ANG':'Netherlands Antillean Guilder',
		'CZK':'Czech Koruna',
		'DKK':'Danish Krone',
		'DJF':'Djibouti Franc',
		'DOP':'Dominican Peso',
		'EGP':'Egyptian Pound',
		'ERN':'Nakfa',
		'ETB':'Ethiopian Birr',
		'FKP':'Falkland Islands Pound',
		'FJD':'Fiji Dollar',
		'XPF':'CFP Franc',
		'GMD':'Dalasi',
		'GEL':'Lari',
		'GHS':'Ghana Cedi',
		'GIP':'Gibraltar Pound',
		'GTQ':'Quetzal',
		'GBP':'Pound Sterling',
		'GNF':'Guinea Franc',
		'GYD':'Guyana Dollar',
		'HTG':'Gourde',
		'HNL':'Lempira',
		'HKD':'Hong Kong Dollar',
		'HUF':'Forint',
		'ISK':'Iceland Krona',
		'INR':'Indian Rupee',
		'IDR':'Rupiah',
		'IRR':'Iranian Rial',
		'IQD':'Iraqi Dinar',
		'ILS':'New Israeli Sheqel',
		'JMD':'Jamaican Dollar',
		'JPY':'Yen',
		'JOD':'Jordanian Dinar',
		'KZT':'Tenge',
		'KES':'Kenyan Shilling',
		'KPW':'North Korean Won',
		'KRW':'Won',
		'KWD':'Kuwaiti Dinar',
		'KGS':'Som',
		'LAK':'Kip',
		'LVL':'Latvian Lats',
		'LBP':'Lebanese Pound',
		'LSL':'Loti',
		'LRD':'Liberian Dollar',
		'LYD':'Libyan Dinar',
		'CHF':'Swiss Franc',
		'LTL':'Lithuanian Litas',
		'MOP':'Pataca',
		'MKD':'Denar',
		'MGA':'Malagasy Ariary',
		'MWK':'Kwacha',
		'MYR':'Malaysian Ringgit',
		'MVR':'Rufiyaa',
		'MRO':'Ouguiya',
		'MUR':'Mauritius Rupee',
		'MXN':'Mexican Peso',
		'MDL':'Moldovan Leu',
		'MNT':'Tugrik',
		'MAD':'Moroccan Dirham',
		'MZN':'Mozambique Metical',
		'MMK':'Kyat',
		'NAD':'Namibia Dollar',
		'NPR':'Nepalese Rupee',
		'NIO':'Cordoba Oro',
		'NGN':'Naira',
		'OMR':'Rial Omani',
		'PKR':'Pakistan Rupee',
		'PAB':'Balboa',
		'PGK':'Kina',
		'PYG':'Guarani',
		'PEN':'Nuevo Sol',
		'PHP':'Philippine Peso',
		'PLN':'Zloty',
		'QAR':'Qatari Rial',
		'RON':'New Romanian Leu',
		'RUB':'Russian Ruble',
		'RWF':'Rwanda Franc',
		'SHP':'Saint Helena Pound',
		'WST':'Tala',
		'STD':'Dobra',
		'SAR':'Saudi Riyal',
		'RSD':'Serbian Dinar',
		'SCR':'Seychelles Rupee',
		'SLL':'Leone',
		'SGD':'Singapore Dollar',
		'SBD':'Solomon Islands Dollar',
		'SOS':'Somali Shilling',
		'ZAR':'Rand',
		'SSP':'South Sudanese Pound',
		'LKR':'Sri Lanka Rupee',
		'SDG':'Sudanese Pound',
		'SRD':'Surinam Dollar',
		'SZL':'Lilangeni',
		'SEK':'Swedish Krona',
		'SYP':'Syrian Pound',
		'TWD':'New Taiwan Dollar',
		'TJS':'Somoni',
		'TZS':'Tanzanian Shilling',
		'THB':'Baht',
		'TOP':'Paʻanga',
		'TTD':'Trinidad and Tobago Dollar',
		'TND':'Tunisian Dinar',
		'TRY':'Turkish Lira',
		'TMT':'Turkmenistan New Manat',
		'UGX':'Uganda Shilling',
		'UAH':'Hryvnia',
		'AED':'UAE Dirham',
		'UYU':'Peso Uruguayo',
		'UZS':'Uzbekistan Sum',
		'VUV':'Vatu',
		'VEF':'Bolivar Fuerte',
		'VND':'Dong',
		'YER':'Yemeni Rial',
		'ZMW':'New Zambian Kwacha',
		'ZWL':'Zimbabwe Dollar'
	};
