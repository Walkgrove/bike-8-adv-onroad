define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel' //,
  //'./RobotoSlab-VariableFont_wght-normal.js'
], function(Adapt, ComponentView, ComponentModel) { //, FontModel

  var ReflectionView = ComponentView.extend({

    events: {
      'click .js-reflection-save-click': 'onSaveData',
      'click .js-reflection-export-click': 'onExportPDF',
      'input .reflection__item-textbox': 'onSaveActive'
    },

    _data: '',
    _fontfamily: 'default',
    
    preRender: function() {
      this.checkIfResetOnRevisit();

      Handlebars.registerHelper('if_eq', function(a, b, opts) {
        if (a == b) {
            return opts.fn(this);
        } else {
            return opts.inverse(this);
        }
      });
    },

    postRender: function() {
      this.setReadyStatus();

      this.setupInview();

      this.$('.js-reflection-save-click').prop('disabled', true);

      if(this.model.get('_buttons').save === "") {
        this.$('.js-reflection-export-click').addClass('is-visible');
        this.$('.js-reflection-export-click').addClass('float-left');
        this.$('.js-reflection-save-click').addClass('is-hidden');
      }

    },

    onSaveActive: function() {

      let allowSave = true;

      //check if all textboxes have data ...
      this.$('.reflection__item-textbox').each((index) => {
        if(this.$('.reflection__item-textbox').eq(index).val() === '') {
          allowSave = false;
        }
        const charCountLeft = 255 - this.$('.reflection__item-textbox').eq(index).val().length;
        this.$('.reflection__character-count').eq(index).html('' + charCountLeft + '');
      });

      // and disable/enable the save button as required
      if(allowSave) {
        this.$('.js-reflection-save-click').prop('disabled', false);
      } else {
        this.$('.js-reflection-save-click').prop('disabled', true);
      }



    


    },

    setupInview: function() {
      var selector = this.getInviewElementSelector();
      if (!selector) {
        // this.setCompletionStatus();
        return;
      }

      this.setupInviewCompletion(selector);
    },

    onSaveData: function() {

      // save to scorm data
      //let reflectionData = 'c-182^Reflection 1^Info about the refection for the PDF export ...$0^Step 1^Subtitle content goes in here ...^What are we asking ...?^D$$c-180^Reflection 1^Info about the refection for the PDF export ...$0^Step 1^Subtitle content goes in here ...^What are we asking ...?^A$1^Step 2^ ^What are we asking for this reflection input ...?^B$2^ ^ ^Question ...?^C$$';
      let reflectionData = Adapt.offlineStorage.get('reflection_data');

      let dataFound = true;
      if (reflectionData === 'undefined' || reflectionData === null || reflectionData === "") {
        dataFound = false;
      }

      let activityFound = false;
      let activityID = "";
      const reflectActivities = reflectionData.split("$$");
      for(let a=0; a<reflectActivities.length; a++) {
        const reflects = reflectActivities[a].split("$");
        for(let r=0; r<reflects.length-1; r++){
          let reflect = reflects[r].split("^");
          if(r === 0 ) {
            if (reflect[0] === this.model.get('_id')) {
              activityFound = true;
              activityID = this.model.get('_id');
            }
          }
        }
      }

      const activityTitle = this.model.get('_activity').title ? this.model.get('_activity').title : ' ';
      const activityBody = this.model.get('_activity').body ? this.model.get('_activity').body : ' ';

      // add initial activity info ...
      const reflectionActivityData = this.model.get('_id') + '^' + activityTitle + '^' + activityBody + '$';

      let reflectionDataNew = '';

      if(dataFound === true) {
        let newRData = '';
        // loop through existing and add it to the new str - if not current activity
        for(let a=0; a<reflectActivities.length; a++) {
          let activityToChange = false;
          const reflects = reflectActivities[a].split("$");
          for(let r=0; r<reflects.length-1; r++){
            let reflect = reflects[r].split("^");
            if(r === 0) {
              if(reflect[0] === activityID) {
                activityToChange = true;
              }
            }
          }
          if(activityToChange === false) {
            newRData += reflectActivities[a];
          }
        }
        reflectionDataNew += newRData + '$$';
      }

      // add any new activity data
      if(dataFound === false || activityFound === false) {

        if(this.model.get('_items').length === 1) {

          const titleText = this.model.get('_items')[0].title ? this.model.get('_items')[0].title : ' ';
          const subTitleText = this.model.get('_items')[0].subtitle ? this.model.get('_items')[0].subtitle : ' ';
          const questionText = this.model.get('_items')[0].question ? this.model.get('_items')[0].question : ' ';

          reflectionDataNew += reflectionActivityData + '0^' + titleText + '^' + subTitleText + '^' + questionText + '^' + $('.' + this.model.get('_id') + '').find('.js-reflection-textbox').eq(0).val()+ '$$';

        } else {

          reflectionDataNew += '' + reflectionActivityData;
          this.model.get('_items').forEach((item, i) => {
            const titleText = item.title ? item.title : ' ';
            const subTitleText = item.subtitle ? item.subtitle : ' ';
            const questionText = item.question ? item.question : ' ';
            reflectionDataNew += '' + i + '^' + titleText + '^' + subTitleText + '^' + questionText + '^' + $('.' + this.model.get('_id') + '').find('.js-reflection-textbox').eq(i).val() + '$';
          });
          reflectionDataNew += '$';

        }

      }

      // if activity already exists, update the relevant 
      if(activityFound === true) {
        
        let newData = "";

        if(this.model.get('_items').length === 1) {

          const reflectActivities = reflectionData.split("$$");
          for(let a=0; a<reflectActivities.length; a++) {
            let activityToChange = false;
            const reflects = reflectActivities[a].split("$");
            for(let r=0; r<reflects.length; r++){
              let reflect = reflects[r].split("^");
              if(r === 0) {
                if(reflect[0] === activityID) {
                  activityToChange = true;
                  newData += reflect[0] + '^' + reflect[1] + '^' + reflect[2] + '$';
                }
              } else {
                if(activityToChange === true) {
                  reflect[4] = $('.' + activityID + '').find('.js-reflection-textbox').eq(0).val();
                  newData += reflect[0] + '^' + reflect[1] + '^' + reflect[2] + '^' + reflect[3] + '^' + reflect[4] + '$';
                } 
              }
            }
          }
          reflectionDataNew += newData + '$';

        } else {

          const reflectActivities = reflectionData.split("$$");
          for(let a=0; a<reflectActivities.length; a++) {
            let activityToChange = false;
            const reflects = reflectActivities[a].split("$");
            for(let r=0; r<reflects.length; r++){
              let reflect = reflects[r].split("^");
              if(reflect.length > 1) {
                if(r === 0) {
                  if(reflect[0] === activityID) {
                    activityToChange = true;
                    newData += reflect[0] + '^' + reflect[1] + '^' + reflect[2] + '$';
                  }
                } else {
                  if(activityToChange === true) {
                    this.model.get('_items').forEach((item, i) => {
                      if(i === Number(reflect[0])) {
                        reflect[4] = $('.' + activityID + '').find('.js-reflection-textbox').eq(i).val();
                        newData += reflect[0] + '^' + reflect[1] + '^' + reflect[2] + '^' + reflect[3] + '^' + reflect[4] + '$';
                      }
                    });
                  } 
                }
              }
            }
          }
          reflectionDataNew += newData + '$';

        }

      }


      this._data = reflectionDataNew;
      // save to SCORM
      Adapt.offlineStorage.set('r', this._data);

      // show as saved ...
      if(this.model.get('_message')._inline === true) {
        // ... inline
        this.$('.reflection__message').addClass('is-visible');
      } else {
        // ... or, as a notify popup
        Adapt.trigger('notify:popup', {
          body: this.model.get('_message').content  
        });
      }

      // show export button - if required
      if(this.model.get('_buttons')._exportEnabled === true) {
        this.$('.js-reflection-export-click').addClass('is-visible');
      }
      
      this.setCompletionStatus();      

    },

    setFillColorHexToRgb: function(doc, hex) {
      var m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
      //console.log(parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16));
      return doc.setFillColor( parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16) );
    },
    setTextColorHexToRgb: function(doc, hex) {
      var m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
      //console.log(parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16));
      return doc.setTextColor( parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16) );
    },

    onExportPDF: function() {

      // if suing this component as an export button only
      if(this.model.get('_items') === "undefined" || this.model.get('_items') === undefined || this.model.get('_items') === null) {
        this.setCompletionStatus();
      }

      //set the up-to-date content/data to use in the creation of the PDF
      // if (this._data === '') {
        //let reflectionData = 'c-182^Reflection 1^Info about the refection for the PDF export ...$0^Step 1^Subtitle content goes in here ...^What are we asking ...?^D$$c-180^Reflection 1^Info about the refection for the PDF export ...$0^Step 1^Subtitle content goes in here ...^What are we asking ...?^A$1^Step 2^ ^What are we asking for this reflection input ...?^B$2^ ^ ^Question ...?^C$$';
        let reflectionData = Adapt.offlineStorage.get('reflection_data');
        this._data = reflectionData;
      // }

      //import the JSPDF library
      require(['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.0.0/jspdf.umd.js'], ({ jsPDF }) => {

        const doc = new jsPDF();

        const pageHeight = doc.internal.pageSize.height - 30;
        let yPos = 10;
        const leftPos = 10;
        const maxWidth = doc.internal.pageSize.width;

        const vPadding = 10;

        const d = new Date();
        const dateToday = '' + d.getDate() + (d.getMonth() + 1) + d.getFullYear() + '';
      
        this._fontfamily = this.model.get('pdf')._font;
        if(this._fontfamily !== "default") {
          doc.setFont(this._fontfamily, "normal");
        }

        //doc.setFontType("bold");

        const PDFHeaderTitle = this.model.get('pdf')._header.title ? this.model.get('pdf')._header.title : ' ';

        // HEADER
        // -- image
        if(this.model.get('pdf')._header && this.model.get('pdf')._header.image !== null) {
          const pdfImage = this.model.get('pdf')._header.image;
          const imgArray = pdfImage.split(".");
          const imgType = imgArray[imgArray.length-1];

          const wPercVar = doc.internal.pageSize.width/100;
          const hPercVar = doc.internal.pageSize.height/100;
          let widthVar = Math.round(this.model.get('pdf')._header._imageStyling._width * wPercVar);
          let heightVar = Math.round(this.model.get('pdf')._header._imageStyling._height * hPercVar);
          let leftVar = Math.round(this.model.get('pdf')._header._imageStyling._left * wPercVar);
          let topVar = Math.round(this.model.get('pdf')._header._imageStyling._top * hPercVar);

          doc.addImage(pdfImage, imgType, leftVar, topVar, widthVar, heightVar, '', 'none', 0);
          yPos += (this.model.get('pdf')._header._imageStyling._marginBottom + heightVar);
        }

        // --- PDFHeaderTitle -- title box
        doc.setDrawColor(0);
        this.setFillColorHexToRgb(doc, this.model.get('pdf')._header._titleStyling._backgroundColour);
        const boxH = this.model.get('pdf')._header._titleStyling._fontSize + vPadding/2;
        const boxY = yPos-(vPadding/2)-(this.model.get('pdf')._header._titleStyling._fontSize/2)+5;
        doc.rect(0, boxY, maxWidth, boxH, "F");
        // -- title
        doc.setFontSize(this.model.get('pdf')._header._titleStyling._fontSize);
        this.setTextColorHexToRgb(doc, this.model.get('pdf')._header._titleStyling._fontColour);
        if(this._fontfamily !== "default") {
          doc.setFont(this._fontfamily, "bold");
        }
        let leftP = leftPos;
        switch(this.model.get('pdf')._header._titleStyling._fontAlign){
          case "center":
            leftP = maxWidth/2;
            break;
          case "right":
            leftP = maxWidth - leftPos;
            break;
        }
        doc.text(PDFHeaderTitle, leftP, yPos+5, { align: this.model.get('pdf')._header._titleStyling._fontAlign, maxWidth: maxWidth });
        
        yPos += (boxH + vPadding/2)+5;

        if(this._fontfamily !== "default") {
          doc.setFont(this._fontfamily, "normal");
        }

        // INPUT CONTENT

        let tempID = '';
        //split into each activity
        const reflectActivities = this._data.split("$$");

        for(let a=0; a<reflectActivities.length-1; a++) {

          if(a !== 0 ) {
            yPos = this.checkNewPagePDF(doc, yPos);
          }

          const reflects = reflectActivities[a].split("$");

          //loop through each activity
          for(let r=0; r<reflects.length; r++){
            const reflect = reflects[r].split("^");

            if(reflect.length > 1 ) {
              if(r === 0) {
                const _id = reflect[0];

                // set activity id
                if (_id !== tempID) {
                  tempID = _id;
                }

                this.setTextColorHexToRgb(doc, this.model.get('pdf')._fontColour);

                //activityTitle
                const activityTitle = reflect[1];
                const actTitleSize = this.model.get('pdf')._header._titleStyling._fontSize - 2;
                if(activityTitle !== ' ') {
                  this.setTextColorHexToRgb(doc, this.model.get('pdf')._items._activityStyling._fontColour);
                  doc.setFontSize(actTitleSize);
                  doc.text(activityTitle, leftP, yPos, { align: this.model.get('pdf')._header._titleStyling._fontAlign, maxWidth: maxWidth - 20 });
                  yPos += vPadding*1.5; //(actTitleSize/2 + vPadding);
                  yPos = this.checkNewPagePDF(doc, yPos, pageHeight);
                }

                //activityBody
                const activityBody = reflect[2];
                const actBodySize = this.model.get('pdf')._items._activityStyling._fontSize;
                if(activityBody !== ' ') {
                  this.setTextColorHexToRgb(doc, this.model.get('pdf')._fontColour);
                  doc.setFontSize(actBodySize);
                  doc.text(activityBody, leftP, yPos, { align: this.model.get('pdf')._header._titleStyling._fontAlign, maxWidth: maxWidth - 20 });
                  yPos += vPadding*2; //(actBodySize/2 + vPadding);
                  yPos = this.checkNewPagePDF(doc, yPos, pageHeight);
                }

              } else {

                // item title
                let itemTitle = reflect[1];
                if(itemTitle !== ' ') {
                  this.setTextColorHexToRgb(doc, this.model.get('pdf')._items._titleStyling._fontColour);
                  doc.setFontSize(this.model.get('pdf')._items._titleStyling._fontSize);
              
                  itemTitle = itemTitle.replace(/(<([^>]+)>)/ig," ");
                  doc.text(itemTitle, leftPos, yPos, { align: 'left', maxWidth: maxWidth - 20 });
                  yPos += vPadding*1.5;
                  yPos = this.checkNewPagePDF(doc, yPos, pageHeight);
                }
                
                // item subtitle
                let itemSubtitle = reflect[2];
                if(itemSubtitle !== ' ') {
                  this.setTextColorHexToRgb(doc, this.model.get('pdf')._items._subtitleStyling._fontColour);
                  doc.setFontSize(this.model.get('pdf')._items._subtitleStyling._fontSize);
              
                  itemSubtitle = itemSubtitle.replace(/(<([^>]+)>)/ig," ");
                  doc.text(itemSubtitle, leftPos, yPos, { align: 'left', maxWidth: maxWidth - 20 });
                  yPos += vPadding*1.5;
                  yPos = this.checkNewPagePDF(doc, yPos, pageHeight);
                }

                // item question
                let itemQuestion = reflect[3];
                if(itemQuestion !== ' ') {
                  this.setTextColorHexToRgb(doc, this.model.get('pdf')._items._questionStyling._fontColour);
                  doc.setFontSize(this.model.get('pdf')._items._questionStyling._fontSize);
                
                  itemQuestion = itemQuestion.replace(/(<([^>]+)>)/ig," ");
                  doc.text(itemQuestion, leftPos, yPos, { align: 'left', maxWidth: maxWidth - 20 });
                  const rows = Math.round(itemQuestion.length/75)+1;
                  yPos += ((rows * 5) + vPadding + 5);
                  yPos = this.checkNewPagePDF(doc, yPos, pageHeight);
                }

                const boxY = Number(yPos) - Number(vPadding);

                // input content
                this.setTextColorHexToRgb(doc, this.model.get('pdf')._fontColour);
                const contentTextSize = this.model.get('pdf')._fontSize;
                doc.setFontSize(contentTextSize);

                const inputContent = reflect[4];
                doc.text(inputContent, leftPos + 10, yPos, { align: 'left', maxWidth: maxWidth - 40 }); ///to fit inside box
                const rows = Math.round(inputContent.length/75)+1;
                yPos += ((rows * 5) + vPadding + 5);

                this.setFillColorHexToRgb(doc, '#f2f2f2');
                doc.setLineWidth(0.1);
                doc.roundedRect(leftPos, boxY, maxWidth-20, (rows*5)+10, 3, 3);

                // yPos = this.checkNewPagePDF(doc, yPos, pageHeight);

              }
            }
          }
        }

        this.addFooter(doc);

        let filename = this.model.get('pdf').filename;
        filename.replace(" ", "-");
        doc.save("" + filename + "-" + dateToday + ".pdf");

      });

      

    },

    checkNewPagePDF: function(doc, yPos, pageHeight) {
      if (yPos >= pageHeight) {
          this.addFooter(doc);
          doc.addPage();
          doc.setFont(this._fontfamily, "normal");
          yPos = 20; // Restart height position
      }
      return yPos;
    },

    newPagePDF: function(doc, yPos) {
      this.addFooter(doc);
      doc.addPage();
      doc.setFont(this._fontfamily, "normal");
      yPos = 20; // Restart height position
      return yPos;
    },

    addFooter: function(doc) {
      const d = new Date();
      const dateToShow = '' + this.model.get('pdf').filename + ' - ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear() + '';
        
      const centerPos = 100;
      const maxWidth = 190;
      const bottomPos = 292;

      if(this.model.get('pdf')._footer && this.model.get('pdf')._footer.image !== null) {
        const pdfImageFooter = this.model.get('pdf')._footer.image;
        const imgArray = pdfImageFooter.split(".");
        const imgType = imgArray[imgArray.length-1];

        const wPercVar = doc.internal.pageSize.width/100;
        const hPercVar = doc.internal.pageSize.height/100;
        let widthVar = Math.round(this.model.get('pdf')._footer._imageStyling._width * wPercVar)+1;
        let heightVar = Math.round(this.model.get('pdf')._footer._imageStyling._height * hPercVar);
        let leftVar = Math.round(this.model.get('pdf')._footer._imageStyling._left * wPercVar)-1;
        let topVar = Math.round((100-this.model.get('pdf')._footer._imageStyling._bottom) * hPercVar);
        console.log(leftVar, topVar, widthVar, heightVar);

        doc.addImage(pdfImageFooter, imgType, leftVar, topVar, widthVar, heightVar, '', 'none', 0);
      }

      

      doc.setFontSize(this.model.get('pdf')._footer._fontSize);
      this.setTextColorHexToRgb(doc, this.model.get('pdf')._footer._fontColour);
      if(this._fontfamily !== "default") {
        doc.setFont(this._fontfamily, "italic");
      }
      doc.text(dateToShow, centerPos, bottomPos, { align: 'center', maxWidth: maxWidth });
    },

    /**
     * determines which element should be used for inview logic - body, instruction or title - and returns the selector for that element
     */
    getInviewElementSelector: function() {
     return 'reflection__message';
    },

    checkIfResetOnRevisit: function() {
      var isResetOnRevisit = this.model.get('_isResetOnRevisit');

      _.delay(() => {
        //let reflectionData = 'c-182^Reflection 1^Info about the refection for the PDF export ...$0^Step 1^Subtitle content goes in here ...^What are we asking ...?^D$$c-180^Reflection 1^Info about the refection for the PDF export ...$0^Step 1^Subtitle content goes in here ...^What are we asking ...?^A$1^Step 2^ ^What are we asking for this reflection input ...?^B$2^ ^ ^Question ...?^C$$';
        let reflectionData = Adapt.offlineStorage.get('reflection_data');

        if (reflectionData !== 'undefined' && reflectionData !== null && reflectionData !== "") {

          const reflectActivities = reflectionData.split("$$");
          for(let a=0; a<reflectActivities.length; a++) {
            const reflects = reflectActivities[a].split("$");

            let _id = "";
            let countVar = reflects.length;
            if(this.model.get('_items').length === 1) {
              countVar = reflects.length-1;
            }
            for(let r=0; r<countVar; r++){
              let reflect = reflects[r].split("^");
              if(r === 0 ) {
                _id = reflect[0];
              } else {
                // one input ...?
                if(countVar === 1) {
                  $('.'+ _id + '').find('.js-reflection-textbox').eq(0).val(reflect[4]);
                } else {
                  this.model.get('_items').forEach((item, i) => {
                    if(i === Number(reflect[0])) {
                      $('.' + _id + '').find('.js-reflection-textbox').eq(i).val(reflect[4]);
                      const charCountLeft = 255 - this.$('.reflection__item-textbox').eq(i).val().length;
                      this.$('.reflection__character-count').eq(i).html('' + charCountLeft + '');
                    }
                  });
                }
                
                if(this.model.get('exportText') != "") {
                  this.$('.js-reflection-export-click').addClass('is-visible');
                }

              }
            }

          }

        }
      }, 1000);

      // If reset is enabled set defaults
      if (isResetOnRevisit) {
        this.model.reset(isResetOnRevisit);
      }
    }


  },
  {
    template: 'reflection'
  });

  return Adapt.register('reflection', {
    model: ComponentModel.extend({}),// create a new class in the inheritance chain so it can be extended per component type if necessary later
    view: ReflectionView
  });
});
