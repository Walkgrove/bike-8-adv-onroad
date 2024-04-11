define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel'
], function(Adapt, ComponentView, ComponentModel) {

  var TimelineView = ComponentView.extend({

    _timelineIndex: -1,

    events: {
      'click .js-timeline-more-click': 'onMoreClicked'
    },
    
    preRender: function() {
      this.checkIfResetOnRevisit();
    },

    postRender: function() {
      this.setReadyStatus();

      this.setupInview();

      if(this.model.get( 'buttonMore' )) {

        this.$('.timeline__button-more').addClass('is-visible');

        this.$('.timeline__items').addClass('is-hidden');
        this.$('.timeline__items').addClass('is-more');

        this.model.get( '_items' ).forEach((date, index) => {
          this.$('.timeline__widget').eq(index).addClass('is-hidden');
        });

      }

    },

    onMoreClicked: function() {
      var tempTimelineIndex = this._timelineIndex;
      var nextTimelineDate = tempTimelineIndex++;

      this.$('.timeline__items').removeClass('is-hidden');

      if(nextTimelineDate < 0) {
        nextTimelineDate = 0;
      }
      
      if(this._timelineIndex < this.model.get( '_items' ).length) {
        this._timelineIndex++;
      }

      this.model.get( '_items' ).forEach((date, index) => {
        if(index <= this._timelineIndex) { //index > tempTimelineIndex && 
          this.$('.timeline__widget').eq(index).removeClass('is-hidden');
        }
        if(index === this._timelineIndex) {
          //audio?
          if (Adapt.config.get('_sound')._isActive === true) {
            //console.log(date._audio);
            if ( date._audio) {
              Adapt.trigger('audio:partial', {src: date._audio._src, transcript: date._audio.transcript});
            }
          }
        }
      });

      //console.log(this._timelineIndex, this.model.get( '_items' ).length-1);

      if(this._timelineIndex === this.model.get( '_items' ).length-1) {
        this.$('.timeline__button-more').removeClass('is-visible');
        this.setCompletionStatus();
      }

      this.$('#timeline__widget-' + nextTimelineDate + '').a11y_focus();
      Adapt.scrollTo(this.$('#timeline__widget-' + nextTimelineDate + ''));

      this.setupInview();
    },


    setupInview: function() {
      var selector = this.getInviewElementSelector();
      if (!selector) {
       // this.setCompletionStatus();
        return;
      }

      if(!this.model.get( 'buttonMore' )) {
        this.setupInviewCompletion(selector);
      }
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
    }
  },
  {
    template: 'timeline'
  });

  return Adapt.register('timeline', {
    model: ComponentModel.extend({}),// create a new class in the inheritance chain so it can be extended per component type if necessary later
    view: TimelineView
  });
});
