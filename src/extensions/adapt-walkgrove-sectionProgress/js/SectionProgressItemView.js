define([
  'core/js/adapt',
  './SectionProgressIndicatorView'
], function(Adapt, SectionProgressIndicatorView) {

  var SectionProgressItemView = Backbone.View.extend({

    className: function () {
      return [
        'sectionprogress__item drawer__item',
        this.model.get('_type') + '__indicator'
      ].join(' ');
    },

    attributes: {
      'role': 'listitem'
    },

    initialize: function() {
      this.listenTo(Adapt, 'remove', this.remove);
      this.render();
      this.addIndicator();
    },

    render: function() {
      var data = this.model.toJSON();
      var template = Handlebars.templates[this.constructor.template];
      this.$el.html(template(data));
    },

    addIndicator: function() {
      var item = new SectionProgressIndicatorView({
        model: this.model
      });
      this.$('.js-indicator').append(item.$el);
    }

  }, {
    template: 'sectionProgressItem'
  });

  return SectionProgressItemView;

});
