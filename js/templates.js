
//Template loader
//see http://berzniz.com/post/24743062344/handling-handlebars-js-like-a-pro
//TODO: compile all templates into templates.js
Handlebars.getTemplate = function(name) {
  if (Handlebars.templates === undefined || Handlebars.templates[name] === undefined) {
    $.ajax({
      url : 'templates/' + name + '.handlebars',
      success : function(data) {
        if (Handlebars.templates === undefined) {
          Handlebars.templates = {};
        }
        Handlebars.templates[name] = Handlebars.compile(data);
      },
      async : false,
      cache: false //Added by Rob: make sure latest version is obtained
    });
  }
  return Handlebars.templates[name];
};
