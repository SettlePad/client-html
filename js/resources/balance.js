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
				currencies = balance_format_multiple_currencies(data.data);
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
					$("#content").html(compiledTemplate({selected_currency: currency, balances: balance_format(data.data.summary[currency]), connections: balance_format_connections(data.data.connections[currency].sort(balance_sort)), multiple_currencies: multiple_currencies}));
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
	return data;
}

function balance_format_multiple_currencies(data) {
	for (index = 0; index < data.length; ++index) {
		data[index] = balance_format(data[index]);
	}
	return data;
}

function balance_format_connections(data) {
	for (index = 0; index < data.length; ++index) {
		data[index] = balance_format(data[index]);
		//Check whether primary identifier is available in contact, so that we can replace name with effective_name
		contactObj = contact_get_by_identifier(data[index].primary_identifier);
		if (contactObj != null) {
			data[index]['contact'] = true;
			data[index]['name'] = contactObj.effective_name;
			data[index]['favorite'] = contactObj.favorite;
		} else {
			data[index]['favorite'] = 0;
		}
	}
	return data;
}
