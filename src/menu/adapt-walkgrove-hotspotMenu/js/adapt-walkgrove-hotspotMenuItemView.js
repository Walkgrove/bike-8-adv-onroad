define([
  'core/js/adapt',
  "core/js/views/menuItemView"
], function(Adapt, MenuItemView) {

  var HotspotMenuItemView = MenuItemView.extend({

    events: {
      'click .js-btn-click' : 'onClickMenuItemButton'
    },

    onClickMenuItemButton: function(event) {
      if (event && event.preventDefault) event.preventDefault();
      if (this.model.get('_isLocked')) return;
      if (Adapt.config.get('_sound')._isActive === true) {
        Adapt.trigger('audio:setup', {src: 'course/en/audio/blank.mp3'});
        Adapt.trigger('audio:pause');
      }
      Backbone.history.navigate('#/id/' + this.model.get('_id'), {trigger: true});
    }

  }, {
    className: 'hotspotmenu-item',
    template: 'hotspotMenuItem'
  });

  return HotspotMenuItemView;

});
