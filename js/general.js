$(document).ready(function(){
	//Prep callapse menu
	 $('#collapse_navbar').collapse({'toggle': false});
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
	$.ajax($.extend({
		type: type,
		contentType: contenttype,
		url: "http://127.0.0.1/api/"+resource, //local
		//url: "http://settlepad.com/api/"+resource, //web
		dataType: "json",
		//data: {data: data},
		data: data,
		beforeSend: function(jqXHR, settings){
			var timestamp = Math.round((new Date()).getTime() / 1000);
			jqXHR.setRequestHeader('X-TIME', timestamp);
			if (secure) {
				if(type =='POST') {
					var hash = CryptoJS.HmacSHA256(localStorage.getItem('user_series')+timestamp+data, localStorage.getItem('user_token')).toString();
				} else {
					var hash = CryptoJS.HmacSHA256(localStorage.getItem('user_series')+timestamp, localStorage.getItem('user_token')).toString();
				}
				jqXHR.setRequestHeader('X-HASH', hash);
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

//Bind an event to window.onhashchange that, when the hash changes, gets the hash and adds the class "selected" to any matching nav link.
$(window).hashchange( function(){
	var hash = location.hash.slice(1);
	var hash_split = hash.split("/");

	menu_item = hash_split[0];
	if (menu_item =='connections' || menu_item == 'profile') menu_item = 'settings';

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
		if (hash_split[0] == 'test') {
			$('#loginEmail').val("pete@mailinator.com");
			$('#loginPassword').val("aa");
		} else {
			$('#loginEmail').val("");
			$('#loginPassword').val("");
		}
		$('#username_top').html("");
		$('#username_left').html("");
		$('#loginModal').modal({keyboard: false, backdrop: 'static'});
	} else {
		//Logged in
		$('#username_top').html(localStorage.getItem('user_name'));
		$('#username_left').html(localStorage.getItem('user_name'));
		contacts_get_if_needed(); //Check whether contacts should be obtained, and if so, do so

		if (hash_split[0] == 'transactions') {
			search = '';
			transactions_init();
		} else if (hash == 'send') {
			send_load();
		} else if (hash == 'balance') {
			balance_currencies();
		} else if (hash_split[0] == 'balance') {
			balance_currency(hash_split[1]);
		} else if (hash == 'settings') {
			settings();
		} else if (hash == 'connections') {
			contacts_get(true);
		} else if (hash == 'logout') {
			$.ajaxWrapper(
				'logout', //resource
				'POST', //type
				true, //secure
				{}, //data,
				false, //notification
				{} //ajax options
			);

			//Clear local credentials independent of success of logout
			Object.keys(localStorage).forEach(function(key){
				if (/^user_/.test(key)) localStorage.removeItem(key); //kill all localstorage items starting with user_
			});
			$("#content").html('');
			document.location.hash = '';
		} else {
			//default
			document.location.hash = 'balance';
		}
	}
})

//Catch the login form submit
$('#loginForm').submit(function() {
	//do login
	$.ajaxWrapper(
		'login', //resource
		'POST', //type
		false, //secure
		{user: $('#loginEmail').val(), password: $('#loginPassword').val(), provider: 'password'}, //data,
		true, //notification
		{
			success: function(data){
				localStorage.setItem('user_series', data.series);
				localStorage.setItem('user_token', data.token);
				localStorage.setItem('user_id', data.user_id);
				localStorage.setItem('user_name', data.user_name);
				localStorage.setItem('user_default_currency', data.default_currency);
				localStorage.setItem('user_identifiers', JSON.stringify(data.identifiers));
				$.bootstrapGrowl('Logged in', {'delay':2000, 'type':'success'});
				$('#loginModal').modal('hide');
				$(window).hashchange();
			}
		} //ajax options
		);
	return false;
});

//currencies
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
