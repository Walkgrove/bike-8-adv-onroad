define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel'
], function(Adapt, ComponentView, ComponentModel) {

  var ClickShowView = ComponentView.extend({

    events: {
      'click .js-clickshow-image': 'onImageShow',
      'click .js-clickshow-item': 'onShow'
    },
    
    preRender: function() {

      Handlebars.registerHelper('if_eq', function(a, b, opts) {
        if (a == b) {
            return opts.fn(this);
        } else {
            return opts.inverse(this);
        }
      });

      this.checkIfResetOnRevisit();
    },

    postRender: function() {
      this.setReadyStatus();
    },

    checkIfResetOnRevisit: function() {
      var isResetOnRevisit = this.model.get('_isResetOnRevisit');

      // If reset is enabled set defaults
      if (isResetOnRevisit) {
        this.model.reset(isResetOnRevisit);
      }
      
    },

    onImageShow: function(event) {
      event.preventDefault();

      const itemIndex = $(event.currentTarget).parent().data('index');
      this.setItemVisited(itemIndex);

      //audio?
      if (Adapt.config.get('_sound') && Adapt.config.get('_sound')._isActive === true) {
        this.model.get('_items').forEach((item, index) => {
          if (index === itemIndex) {
            if (item._audio) {
              Adapt.trigger('audio:partial', {src: item._audio._src, transcript: item._audio.transcript});
            }
          }
        });
      }

    },

    onShow: function(event) {
      event.preventDefault();

      const itemIndex = $(event.currentTarget).data('index');
      this.setItemVisited(itemIndex);

      //audio?
      if (Adapt.config.get('_sound') && Adapt.config.get('_sound')._isActive === true) {
        this.model.get('_items').forEach((item, index) => {
          if (index === itemIndex) {
            if (item._audio) {
              Adapt.trigger('audio:partial', {src: item._audio._src, transcript: item._audio.transcript});
            }
          }
        });
      }

    },

    setItemVisited: function(index) {
      this.$('.clickshow__widget').eq(index).addClass('is-visited');
      this.checkAllItemsCompleted();
    },

    checkAllItemsCompleted: function() {
      var complete = false;
      if(this.$('.clickshow__widget').length === this.$('.is-visited').length){
        complete = true;
      }
      if(complete) {
        this.setCompletionStatus();
      }
    }

  },
  {
    template: 'clickshow'
  });

  return Adapt.register('clickshow', {
    model: ComponentModel.extend({}),// create a new class in the inheritance chain so it can be extended per component type if necessary later
    view: ClickShowView
  });
});
