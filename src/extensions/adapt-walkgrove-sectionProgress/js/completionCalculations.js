define([
  'core/js/adapt'
], function(Adapt) {

  var Completion = Backbone.Controller.extend({

    subProgressCompleted: 0,
    subProgressTotal: 0,
    nonAssessmentCompleted: 0,
    nonAssessmentTotal: 0,
    assessmentCompleted: 0,
    assessmentTotal: 0

  });

  // Calculate completion of a contentObject
  function calculateCompletion(contentObjectModel) {

    var completion = new Completion();

    var viewType = contentObjectModel.get('_type');
    var isComplete = contentObjectModel.get('_isComplete') ? 1 : 0;
    var children;

    switch (viewType) {
      case 'page':
        // If it's a page
        children = contentObjectModel.getAllDescendantModels().filter(function(model) {
          return model.get('_isAvailable') && !model.get('_isOptional');
        });

        var availableChildren = filterAvailableChildren(children);
        var components = getSectionProgressEnabledModels(availableChildren);

        var nonAssessmentComponents = getNonAssessmentComponents(components);

        completion.nonAssessmentTotal = nonAssessmentComponents.length;
        completion.nonAssessmentCompleted = getComponentsCompleted(nonAssessmentComponents).length;

        var assessmentComponents = getAssessmentComponents(components);

        completion.assessmentTotal = assessmentComponents.length;
        completion.assessmentCompleted = getComponentsInteractionCompleted(assessmentComponents).length;

        var showPageCompletionCourse = Adapt.course.get('_sectionProgress') && Adapt.course.get('_sectionProgress')._showPageCompletion !== false;
        var showPageCompletionPage = contentObjectModel.get('_sectionProgress') && contentObjectModel.get('_sectionProgress')._showPageCompletion !== false;

        if (showPageCompletionCourse && showPageCompletionPage) {
          // optionally add one point extra for page completion to eliminate incomplete pages and full progress bars
          // if _showPageCompletion is true then the progress bar should also consider it so add 1 to nonAssessmentTotal
          completion.nonAssessmentCompleted += isComplete;
          completion.nonAssessmentTotal += 1;
        }

        break;
    }

    return completion;
  }

  function getNonAssessmentComponents(models) {
    return models.filter(function(model) {
      return !model.get('_isPartOfAssessment');
    });
  }

  function getAssessmentComponents(models) {
    return models.filter(function(model) {
      return model.get('_isPartOfAssessment');
    });
  }

  function getComponentsCompleted(models) {
    return models.filter(function(item) {
      return item.get('_isComplete');
    });
  }

  function getComponentsInteractionCompleted(models) {
    return models.filter(function(item) {
      return item.get('_isComplete');
    });
  }

  //Get only those models who were enabled for SectionProgress
  function getSectionProgressEnabledModels(models) {
    return models.filter(function(model) {
      var config = model.get('_pageLevelProgress');
      return config && config._isEnabled;
    });
  }

  function unavailableInHierarchy(parents) {
    if (!parents) return;
    return parents.some(function(parent) {
      return !parent.get('_isAvailable');
    });
  }

  function filterAvailableChildren(children) {
    var availableChildren = [];

    for (var i = 0, count = children.length; i < count; i++) {
      var parents = children[i].getAncestorModels();
      if (unavailableInHierarchy(parents)) continue;
      availableChildren.push(children[i]);
    }

    return availableChildren;
  }

  function calculatePercentageComplete(model) {
    var completionObject = calculateCompletion(model);
    // take all assessment, nonassessment and subprogress into percentage
    // this allows the user to see if assessments have been passed, if assessment components can be retaken, and all other component's completion
    var completed = completionObject.nonAssessmentCompleted + completionObject.assessmentCompleted + completionObject.subProgressCompleted;
    var total  = completionObject.nonAssessmentTotal + completionObject.assessmentTotal + completionObject.subProgressTotal;
    var percentageComplete = Math.floor((completed / total)*100);
    return percentageComplete;
  }

  return {
    calculateCompletion: calculateCompletion,
    calculatePercentageComplete: calculatePercentageComplete,
    getSectionProgressEnabledModels: getSectionProgressEnabledModels,
    filterAvailableChildren: filterAvailableChildren
  };

});
