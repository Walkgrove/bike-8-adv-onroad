define([
  'core/js/adapt',
  'core/js/views/componentView'
], function(Adapt, ComponentView) {

  var AccordionView = ComponentView.extend({

    events: {
      'click .js-toggle-item': 'onClick'
    },

    preRender: function() {
      this.checkIfResetOnRevisit();

      this.model.resetActiveItems();

      this.listenTo(this.model.get('_children'), {
        'change:_isActive': this.onItemsActiveChange,
        'change:_isVisited': this.onItemsVisitedChange
      });
    },

    postRender: function() {
      this.setReadyStatus();

      if (this.model.get('_setCompletionOn') === 'inview') {
        this.setupInviewCompletion();
      }
    },

    checkIfResetOnRevisit: function() {
      var isResetOnRevisit = this.model.get('_isResetOnRevisit');

      // If reset is enabled set defaults
      if (isResetOnRevisit) {
        this.model.reset(isResetOnRevisit);
      }
    },

    onClick: function(event) {
      event.preventDefault();

      this.model.toggleItemsState($(event.currentTarget).parent().data('index'));
    },

    onItemsActiveChange: function(item, isActive) {
      this.toggleItem(item, isActive);
    },

    onItemsVisitedChange: function(item, isVisited) {
      if (!isVisited) return;

      var $item = this.getItemElement(item);

      $item.children('.accordion__item-btn').addClass('is-visited');
    },

    toggleItem: function(item, shouldExpand) {
      var $item = this.getItemElement(item);
      var $body = $item.children('.accordion__item-content').stop(true, true);

      //var accIndex = item.get('_index');

      $item.children('.accordion__item-btn')
        .toggleClass('is-selected is-open', shouldExpand)
        .toggleClass('is-closed', !shouldExpand)
        .attr('aria-expanded', shouldExpand);

      if (!shouldExpand) {
        $body.slideUp(this.model.get('_toggleSpeed'));
        //this.$('.accordion__item-title').eq(accIndex).a11y_focus();
        return;
      } else {
        $item.a11y_focus();
        //audio?
        if (Adapt.config.get('_sound')._isActive === true) {
          if (item.attributes._audio) {
            Adapt.trigger('audio:partial', {src: item.attributes._audio._src, transcript: item.attributes._audio.transcript});
          }
          
        }
      }

      $body.slideDown(this.model.get('_toggleSpeed'));
    },

    getItemElement: function(item) {
      var index = item.get('_index');

      return this.$('.accordion__item').filter('[data-index="' + index +'"]');
    }

  });

  return AccordionView;

});
