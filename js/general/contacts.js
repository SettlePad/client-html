//Local metadata: contacts, limits and identifiers
var contacts = {}; //dict
var user_contacts_last_update = 0;
/*var limits = {}; //dict
var identifiers = []; //array*/

function sync_metadata_if_needed(){
	if (user_contacts_last_update < (moment().unix() - 60*60)) {
		//update if not present, otherwise every hour. Note that every time the website gets refreshed, everything will be reloaded!
		contacts_get(false);
	}
}

function contacts_get(show_connections) {
	$.ajaxWrapper(
		'contacts', //resource
		'GET', //type
		true, //secure
		{}, //data,
		show_connections, //notification
		{
			success: function(data){
				contacts = data.data;
				if(show_connections) connections_load();
			}
		} //ajax options
	);
	user_contacts_last_update = moment().unix();
}
