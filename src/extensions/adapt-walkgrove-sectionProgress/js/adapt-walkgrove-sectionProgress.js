define([
  'core/js/adapt',
  './completionCalculations',
  './SectionProgressView',
  './SectionProgressCollection'
], function(Adapt, completionCalculations, SectionProgressView, SectionProgressCollection) {

  var SectionProgress = Backbone.Controller.extend({

    initialize: function() {
      Adapt.on({
        'app:dataReady': this.onDataReady.bind(this),
        'app:languageChanged': function() {
          // Remove events created by setUpEventListeners
          this.stopListening();
        }.bind(this)
      });
    },

    getCourseConfig: function() {
      return Adapt.course.get('_sectionProgress');
    },

    onDataReady: function() {
      // Do not proceed if SectionProgress is not enabled in course.json
      var coursePLPConfig = this.getCourseConfig();
      if (!coursePLPConfig || !coursePLPConfig._isEnabled) {
        return;
      }

      this.setUpEventListeners();
    },

    setUpEventListeners: function() {

      this.listenTo(Adapt, {
        'router:page': this.renderView
      });

      this.listenTo(Adapt.course, 'bubble:change:_isComplete', this.onCompletionChange);
    },

    onCompletionChange: function(event) {
      if (!Adapt.location._currentId) return;

      var currentModel = Adapt.findById(Adapt.location._currentId);
      var completionState = {
        currentLocation: completionCalculations.calculatePercentageComplete(currentModel),
        course: completionCalculations.calculatePercentageComplete(Adapt.course)
      };
      var hasChanged = !_.isMatch(this._previousCompletionState, completionState);
      if (!hasChanged) return;

      this._previousCompletionState = completionState;
      Adapt.trigger('sectionProgress:percentageCompleteChange', completionState);
    },

    renderView: function(pageModel) {

      // Do not render if turned off at course level
      var coursePLPConfig = this.getCourseConfig();
      if (!coursePLPConfig) {
        return;
      }

      // Do not proceed if SectionProgress is not enabled for the content object
      var pagePLPConfig = pageModel.get('_sectionProgress');
      if (!pagePLPConfig || !pagePLPConfig._isEnabled) {
        return;
      }

      var collection = new SectionProgressCollection(null, {
        pageModel: pageModel
      });

      if (collection.length === 0) {
        return;
      }

      $('.nav__drawer-btn').after(new SectionProgressView({
        model: pageModel,
        collection: collection
      }).$el);
    }

  });

  Adapt.SectionProgress = new SectionProgress();

});
