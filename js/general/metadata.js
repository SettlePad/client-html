//Metadata: contacts and identifiers
var contacts = []; //array
var identifiers = []; //array
var transaction_status = {latest: null, open: 0, unread: {open: 0, processed: 0, canceled: 0}};

function sync_metadata(){
		//update now and at regular intervals. Note that every time the website gets refreshed, everything will be reloaded!
		sync_metadata_now();

		setInterval(function(){
			contacts_get(false,false);
			settings_get(false,false);
		}, 60*60*1000); //every hour

		setInterval(function(){
			poll_status();
		}, 2*60*1000); //every two minutes
}

function sync_metadata_now(){
	poll_status();
	contacts_get(false,false);
	settings_get(false,false);
}

function settings_get(show_settings, show_identifiers) {
	$.ajaxWrapper(
		'settings', //resource
		'GET', //type
		true, //secure
		{}, //data,
		show_settings, //notification
		{
			success: function(data){
				localStorage.setItem('user_name', data.data.user_name);
				localStorage.setItem('user_default_currency', data.data.default_currency);
				identifiers = data.data.identifiers;
				if (identifiers.length > 1) {
					identifiers.sort(function(a, b){
						if(a.identifier.toLowerCase() < b.identifier.toLowerCase()) return -1;
				    if(a.identifier.toLowerCase() > b.identifier.toLowerCase()) return 1;
				    return 0;
					});
				}
				if(show_settings) {
					settings_load();
				} else if (show_identifiers) {
					identifiers_load();
				}
			}
		} //ajax options
	);
}


function contacts_get(show_connections, show_connection_identifier) {
	$.ajaxWrapper(
		'contacts', //resource
		'GET', //type
		true, //secure
		{}, //data,
		show_connections, //notification
		{
			success: function(data){
				if ($.isArray(data.data)) {
					contacts = data.data;
				} else {
					contacts = [];
				}
				contacts_add_metadata();
				if(show_connections) {
					connections_load();
				} else if (show_connection_identifier != false ){
					connection_load(show_connection_identifier);
				}

			}
		} //ajax options
	);
}

function contact_get_by_identifier(identifierStr) {
	//Get contact for identifierStr
	var retval = null;
	if (contacts != null && contacts.length > 0) {
		$.each(contacts, function(i, contact) {
			if (contact.identifiers != null) {
				$.each(contact.identifiers, function(j, identifierObj) {
					//console.log(identifierObj.identifier);
					if (identifierObj.identifier == identifierStr) {
						retval = contact;
						return false; //so get out of loop
					}
				});
			}
			if (retval != null) return false; //get out of loop
		});
	}
	return retval;
}

function contact_get_index_by_identifier(identifierStr) {
	//Get contact for identifierStr
	var retval = null;
	if (contacts != null && contacts.length > 0) {
		$.each(contacts, function(i, contact) {
			$.each(contact.identifiers, function(j, identifierObj) {
				//console.log(identifierObj.identifier);
				if (identifierObj.identifier == identifierStr) {
					retval = i;
					return false; //so get out of loop
				}
			});
			if (retval != null) return false; //get out of loop
		});
	}
	return retval;
}

function contacts_add_metadata() {
	//Add effective_name, primary_identifier and sorts contacts

	if (contacts.length > 0) {
		$.each(contacts, function(i, contact) {
			$.each(contact.identifiers, function(j, identifier) {
				contact.primary_identifier = identifier.identifier; //Actually not the primary one per se, but at least an active one
				return false; //1 is enough
			});

			if (contact.friendly_name != null && contact.friendly_name != '') {
				contact.effective_name = contact.friendly_name;
			} else if (contact['name'] != null){
				contact.effective_name = contact['name'];
			} else {
				contact.effective_name = contact['primary_identifier'];
			}
		});
	}
	if (contacts.length > 1) {
		contacts.sort(function(a, b){
			if(a.effective_name.toLowerCase() < b.effective_name.toLowerCase()) return -1;
			if(a.effective_name.toLowerCase() > b.effective_name.toLowerCase()) return 1;
			return 0;
		});
	}
}

function poll_status() {
	$.ajaxWrapper(
		'status', //resource
		'GET', //type
		true, //secure
		{}, //data,
		false, //notification
		{
			success: function(data){
				if (transaction_status.last_update == null || transaction_status.last_update < moment(data.data['latest'])) {
					transaction_status.last_update = moment(data.data['latest']);
					transaction_status.open = data.data.open;
					transaction_status.unread = data.data.unread;

					var val = transaction_status.unread.open + transaction_status.unread.canceled + transaction_status.unread.processed;
					if (val == 0) {
						val = '';
					}
					$('#navbar_menu_transactions_unread').html(val);
					$('#menu_transactions_unread').html(val);

					//update transaction counters
					if (transaction_status.unread.open > 0) {
						val = transaction_status.unread.open;
					} else {
						val = '';
					}
					$('#transactions_group_open .badge').html(val);

					if (transaction_status.unread.canceled > 0) {
						val = transaction_status.unread.canceled;
					} else {
						val = '';
					}
					$('#transactions_group_canceled .badge').html(val);

					if (transaction_status.unread.processed > 0) {
						val = transaction_status.unread.processed;
					} else {
						val = '';
					}
					$('#transactions_group_processed .badge').html(val);

				}
			}
		} //ajax options
	);
}
