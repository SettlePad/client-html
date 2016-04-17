transaction_max_request =20;
transactions_search = '';
transactions_group = 'open';
function transactions_init(group) {
  if (group != null && group != '' && group != false) transactions_group = group;
  $.ajaxWrapper(
    'transactions/initial/'+transaction_max_request+'/'+transactions_group+'/'+encodeURIComponent(transactions_search)+'/', //resource
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
          $("#content").html(compiledTemplate({transactions_present: true, search: transactions_search, unread_open: transaction_status.unread.open, unread_processed: transaction_status.unread.processed, unread_canceled: transaction_status.unread.canceled}));
          var compiledTemplate = Handlebars.getTemplate('transactions_list');
          $("#transactions_list").html(compiledTemplate({transactions: transactions_format(data.data.transactions)}));
          if (transactions_end_reached) {
            $("#transactions_end_reached").removeClass('hidden'); //Hide load more button
            $("#transactions_load_button").addClass('hidden'); //Hide load more button
          }
          transactions_are_shown(data.data.transactions);
        } else {
          $("#content").html(compiledTemplate({transactions_present: false, search: transactions_search, unread_open: transaction_status.unread.open, unread_processed: transaction_status.unread.processed, unread_canceled: transaction_status.unread.canceled}));
        }

        //Activate correct group pill
        $("li[id^='transactions_group_']").removeClass('active');
        $("#transactions_group_"+transactions_group).addClass('active');

        //Catch the search form submit
        $('#transactions_searchform').submit(function() {
          transaction_search(false);
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
      'transactions/older/'+transactions_oldest_id+'/'+transaction_max_request+'/'+transactions_group+'/'+encodeURIComponent(transactions_search)+'/', //resource
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
            transactions_are_shown(data.data.transactions);
          }
          $("#transactions_load_loader").addClass('hidden'); //Show AJAX loader ball
          transactions_loading = false;
        }
      } //ajax options
    );
  }
}

function transactions_update() {
  $.ajaxWrapper(
    'transactions/updates/'+transactions_oldest_id+'/'+transactions_newest_id+'/'+transactions_last_update+'/'+transactions_group+'/'+encodeURIComponent(transactions_search)+'/', //resource
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
          transactions_are_shown(data.data.transactions);
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

      if (data[index].is_read == 1) {
        data[index].is_read_bool = true;
      } else {
        data[index].is_read_bool = false;
      }

      contactObj = contact_get_by_identifier(data[index].counterpart_primary_identifier);
      if (contactObj != null) {
        data[index]['contact'] = true;
        data[index].counterpart_name = contactObj.effective_name;
      }
    }
  }
  return data;
}

function transactions_are_shown(transactions){
  //Do js work after transactions are visible
  if ($('#transactions_list > .list-group-item-success').length > 0) {
    $('#transactions_list > .list-group-item-success').removeClass('list-group-item-success',
      {
        duration: 5000,
        complete: function() {
          poll_status();
        }
      }
    )
  }

  transactions_to_mark_as_read = [];
  for (index = 0; index < transactions.length; ++index) {
    if (transactions[index].is_read != 1) {
      transactions_to_mark_as_read.push(transactions[index].transaction_id);
    }
  }
  if (transactions_to_mark_as_read.length > 0) {
      transaction_accept(transactions_to_mark_as_read, 'mark_read',false, false);
  }
}

function element_in_scroll(elem) {
  //Thanks to http://dumpk.com/2013/06/02/how-to-create-infinite-scroll-with-ajax-on-jquery/
  var docViewTop = $(window).scrollTop();
  var docViewBottom = docViewTop + $(window).height();
  var elemTop = $(elem).offset().top;
  var elemBottom = elemTop + $(elem).height();
  return (elemBottom - 100 <= docViewBottom);
}

function transaction_search(searchStr) {
  if (searchStr == false) {
    transactions_search = $('#transactions_searchinput').val();
    transactions_init(false);
  } else {
    //Only call from outside of transactions, otherwise hash will not change
    transactions_search = searchStr;
    transactions_group = 'all';
    document.location.hash = 'transactions';
  }

}


//Catch document scroll
$(document).scroll(function(e){
  if( $('#transactions_list').length && transactions_end_reached == false) {
    if (element_in_scroll("#transactions_list")) transactions_older();
  }
});

function transaction_accept(id, action, reload, ask_confirmation) {
  if (!ask_confirmation || confirm("Are you sure?") == true) {
    if ($.isArray(id)) {
      resource = 'transactions/'+action;
      payload = {'transactions': id};
    } else {
      resource = 'transactions/'+action+'/'+id;
      payload = {};
    }

    $.ajaxWrapper(
      resource, //resource
      'POST', //type
      true, //secure
      payload, //data,
      false, //notification
      {
        success: function(data){
          if (reload) {
            transactions_init(false);
          }
        }
      } //ajax options
    );
  }
}
