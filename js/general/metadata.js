//Metadata: contacts and identifiers
var contacts = []; //array
var metadata_last_update = 0;
var identifiers = []; //array

function sync_metadata_if_needed(){
	if (metadata_last_update < (moment().unix() - 60*60)) {
		//update if not present, otherwise every hour. Note that every time the website gets refreshed, everything will be reloaded!
		contacts_get(false,false);
		settings_get(false,false);
		metadata_last_update = moment().unix();
	}
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
				contacts = data.data;
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
	$.each(contacts, function(i, contact) {
		if (contact.identifiers != null) {
			$.each(contact.identifiers, function(j, identifierObj) {
				//console.log(identifierObj.identifier);
				if (identifierObj.identifier == identifierStr && identifierObj.active == true) {
					retval = contact;
					return false; //so get out of loop
				}
			});
		}
		if (retval != null) return false; //get out of loop
	});
	return retval;
}

function contact_get_index_by_identifier(identifierStr) {
	//Get contact for identifierStr
	var retval = null;
	$.each(contacts, function(i, contact) {
		$.each(contact.identifiers, function(j, identifierObj) {
			//console.log(identifierObj.identifier);
			if (identifierObj.identifier == identifierStr && identifierObj.active == true) {
				retval = i;
				return false; //so get out of loop
			}
		});
		if (retval != null) return false; //get out of loop
	});
	return retval;
}

function contacts_add_metadata() {
	//Add effective_name, primary_identifier and sorts contacts

	if (contacts.length > 0) {
		$.each(contacts, function(i, contact) {
			if (contact.friendly_name != null && contact.friendly_name != '') {
				contact.effective_name = contact.friendly_name;
			} else {
				contact.effective_name = contact['name'];
			}
			$.each(contact.identifiers, function(j, identifier) {
				if (identifier.active == true) {
					contact.primary_identifier = identifier.identifier; //Actually not the primary one per se, but at least an active one
					return false; //1 is enough
				}
			});
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
