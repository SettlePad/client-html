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
		//url: "http://uoless.com/api/"+resource, //web
		dataType: "json",
		//data: {data: data},
		data: data,
		error: function(xhr, errorType, exception) {
			try {
				var error_data = $.parseJSON(xhr.responseText);
				$.bootstrapGrowl(error_data.error.text, {'delay':2000, 'type':'danger'});
			 } catch (e) {
				if (exception !== null) {
					$.bootstrapGrowl('Error status: '+exception, {'delay':2000, 'type':'danger'});
				} else if (errorType !== null) {
					$.bootstrapGrowl('Error type: '+errorType, {'delay':2000, 'type':'danger'});
				} else {
					$.bootstrapGrowl('Unknown error!', {'delay':2000, 'type':'danger'});
				}
			}
		},
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
		}
  }, ajaxOptions));
}

//Bind an event to window.onhashchange that, when the hash changes, gets the hash and adds the class "selected" to any matching nav link.
$(window).hashchange( function(){
	var hash = location.hash.slice(1);
	var hash_split = hash.split("_");

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


	//Check whether logged in
	if (localStorage.getItem('user_id') === null) {
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
		} else if (hash == 'profile') {
			var compiledTemplate = Handlebars.getTemplate('profile');
			$("#content").html(compiledTemplate);
		} else if (hash == 'connections') {
			contacts_get(true);
		} else if (hash == 'logout') {
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
				$.bootstrapGrowl('Logged in', {'delay':2000, 'type':'success'});
				$('#loginModal').modal('hide');
				$(window).hashchange();
			}
		} //ajax options
		);
	return false;
});
