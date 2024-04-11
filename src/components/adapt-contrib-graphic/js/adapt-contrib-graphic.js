define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel'
], function(Adapt, ComponentView, ComponentModel) {

  var GraphicView = ComponentView.extend({

    events: {
      'click .js-image-popup': 'openPopup',
      'click .js-graphic-link': 'openLink'
    },
    
    reRender: function() {
      this.listenTo(Adapt, 'device:changed', this.resizeImage);

      this.checkIfResetOnRevisit();
    },

    postRender: function() {
      this.resizeImage(Adapt.device.screenSize, true);
    },

    checkIfResetOnRevisit: function() {
      var isResetOnRevisit = this.model.get('_isResetOnRevisit');

      if (isResetOnRevisit) {
        this.model.reset(isResetOnRevisit);
      }
    },

    openPopup: function() {
      Adapt.trigger('notify:popup', {
        body: this.model.get('_popup')
      });
      this.$('.graphic__popup-icon').addClass('is-selected');
    },

    openLink: function() {
      window.open(
        this.model.get('_href'),
        '_blank'
      );
      this.$('.graphic__link-icon').addClass('is-selected');
    },

    resizeImage: function(width, setupInView) {
      var imageWidth = width === 'medium' ? 'small' : width;
      var imageSrc = (this.model.get('_graphic')) ? this.model.get('_graphic')[imageWidth] : '';
      this.$('.js-graphic-set-image-src').attr('src', imageSrc);

      this.$('.graphic__widget').imageready(function() {
        this.setReadyStatus();

        if (setupInView) {
          this.setupInviewCompletion('.graphic__widget');
        }
      }.bind(this));
    }
  });

  return Adapt.register('graphic', {
    model: ComponentModel.extend({}),// create a new class in the inheritance chain so it can be extended per component type if necessary later
    view: GraphicView
  });

});
