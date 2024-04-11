define([
 'core/js/adapt',
 './SectionProgressItemView'
], function(Adapt, SectionProgressItemView) {

  var SectionProgressView = Backbone.View.extend({

    className: 'sectionprogress',

    events: {
      'click .js-sectionprogress-item-click': 'scrollToPageElement'
    },

    initialize: function() {
      this.listenTo(Adapt, 'remove', this.remove);
      this.render();
      this.addChildren();
    },

    scrollToPageElement: function(event) {
      if (event && event.preventDefault) event.preventDefault();

      var $target = $(event.currentTarget);
      if ($target.is('.is-disabled')) return;

      var currentComponentSelector = '.' + $target.attr('data-Sectionprogress-id');

      // Adapt.once('drawer:closed', function() {
        Adapt.scrollTo(currentComponentSelector, { duration: 400 });
      // }).trigger('drawer:closeDrawer', $(currentComponentSelector));
    },

    render: function() {
      var template = Handlebars.templates['sectionProgress'];
      this.$el.html(template({}));
    },

    addChildren: function() {
      var $children = this.$('.js-children');
      this.collection.each(function(model) {
        $children.append(new SectionProgressItemView({
          model: model
        }).$el);
      }.bind(this));
    }

  });

  return SectionProgressView;

});
