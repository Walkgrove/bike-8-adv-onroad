define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel'
], function(Adapt, ComponentView, ComponentModel) {

  var FlipcardsView = ComponentView.extend({

    events: {
      'click .js-flip-item': 'onFlip'
    },
    
    preRender: function() {
      this.checkIfResetOnRevisit();
    },

    postRender: function() {
      this.setReadyStatus();
      //this.setupInview();
    },

    setupInview: function() {
      var selector = this.getInviewElementSelector();
      if (!selector) {
       // this.setCompletionStatus();
        return;
      }

      this.setupInviewCompletion(selector);
    },

    /**
     * determines which element should be used for inview logic - body, instruction or title - and returns the selector for that element
     */
    getInviewElementSelector: function() {
      if (this.model.get('body')) return '.component__body';

      if (this.model.get('instruction')) return '.component__instruction';

      if (this.model.get('displayTitle')) return '.component__title';

      return null;
    },

    checkIfResetOnRevisit: function() {
      var isResetOnRevisit = this.model.get('_isResetOnRevisit');

      // If reset is enabled set defaults
      if (isResetOnRevisit) {
        this.model.reset(isResetOnRevisit);
      }
    },

    onFlip: function(event) {
      event.preventDefault();

      const cardIndex = $(event.currentTarget).parent().data('index');

      if(this.$(event.currentTarget).hasClass('is-flipped') === true) {
        this.$(event.currentTarget).addClass('is-not-flipped');
        this.$(event.currentTarget).removeClass('is-flipped');

        if(this.$(event.currentTarget).find('.flipcards__title-front').length) {
          this.$(event.currentTarget).find('.flipcards__title-front').a11y_focus();
        } else {
          if(this.$(event.currentTarget).find('.flipcards__icon').length) {
            this.$(event.currentTarget).find('.flipcards__icon').a11y_focus();
          }else{
            this.$(event.currentTarget).a11y_focus();
          }
        }
      }else {
        this.$(event.currentTarget).addClass('is-flipped');
        this.$(event.currentTarget).removeClass('is-not-flipped');

        if(this.$(event.currentTarget).find('.flipcards__title-back').length) {
          this.$(event.currentTarget).find('.flipcards__title-back').a11y_focus();
        } else {
          if(this.$(event.currentTarget).find('.flipcards__content').length) {
            this.$(event.currentTarget).find('.flipcards__content').a11y_focus();
          }else{
            this.$(event.currentTarget).a11y_focus();
          }
        }

        //audio?
        if (Adapt.config.get('_sound')._isActive === true) {
          this.model.get('_items').forEach((item, i) => {
            if (i === cardIndex) {
              if (item._audio) {
                Adapt.trigger('audio:partial', {src: item._audio._src, transcript: item._audio.transcript});
              }
            }
          });
        }
      }

      
      this.setItemVisited(cardIndex);
    },

    setItemVisited: function(index) {
      this.$('.flipcards__widget').eq(index).addClass('is-visited');
      this.checkAllItemsCompleted();
    },

    checkAllItemsCompleted: function() {
      var complete = false;
      if(this.$('.flipcards__widget').length === this.$('.is-visited').length){
        complete = true;
      }
      if(complete) {
        this.setCompletionStatus();
      }
    },

  },
  {
    template: 'flipcards'
  });

  return Adapt.register('flipcards', {
    model: ComponentModel.extend({}),// create a new class in the inheritance chain so it can be extended per component type if necessary later
    view: FlipcardsView
  });
});
