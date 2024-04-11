define([
  'core/js/adapt',
  './completionCalculations'
], function(Adapt, completionCalculations) {

  var SectionProgressCollection = Backbone.Collection.extend({

    initialize: function(models, options) {
      this.listenTo(Adapt, 'remove', this.reset);
      if (!options || !options.pageModel) return;
      this._pageModel = options.pageModel;
      this.repopulate();
    },

    repopulate: function() {
      this.reset();
      if (!this._pageModel) return;

      var allDescendants = this._pageModel.getAllDescendantModels(true);
      //console.log('allDescendants: ' + allDescendants);
      var currentPageItems = allDescendants.filter(function(item) {
        return item.get('_isAvailable') === true;
      });
      //console.log('currentPageItems: ' + currentPageItems);
      var availableItems = completionCalculations.filterAvailableChildren(currentPageItems);
      //console.log('availableItems: ' + availableItems);
      var enabledProgressItems = completionCalculations.getSectionProgressEnabledModels(availableItems);
      //console.log('enabledProgressItems: ' + enabledProgressItems);

      this.add(enabledProgressItems);
    }

  });

  return SectionProgressCollection;

});
