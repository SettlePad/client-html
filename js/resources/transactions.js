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
