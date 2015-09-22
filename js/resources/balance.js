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
