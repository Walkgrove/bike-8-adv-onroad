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

    _xapi: null,
    _actorDetails: null,

    _courseid: "bikeability-adv-on-road-cycle-training",
    _activityId: "https://cloud.scorm.com/",

    _reflectdata: null,
    _state: false,
    
    preRender: function() {
      this.checkIfResetOnRevisit();

      Handlebars.registerHelper('if_eq', function(a, b, opts) {
        if (a == b) {
            return opts.fn(this);
        } else {
            return opts.inverse(this);
        }
      });
      this.listenTo(Adapt, {
        'reflect:data': this.onGetXAPIState
      });

      let reflectionData = Adapt.offlineStorage.get('reflection_data');
      let dataFound = true;
      let activityFound = false;
      let _xapiID;
      const activityID = '_apiID';
      if (reflectionData === 'undefined' || reflectionData === null || reflectionData === "") {
        dataFound = false;
        reflectionData = "";
      }
      if(dataFound === true) {
        const reflectActivities = reflectionData.split("$$");  
        for(let a=0; a<reflectActivities.length-1; a++) {
          const reflects = reflectActivities[a].split("$");
          for(let r=0; r<reflects.length; r++){
            let reflect = reflects[r].split("^");
            if(r === 0) {
              if(reflect[0] === activityID) {
                activityFound = true;
                _xapiID = reflect[1];
              }
            }
          }
        }
      }
      if(!activityFound) {
        _xapiID = new Date().valueOf();
        reflectionData += "_apiID^" + _xapiID + ""  + "$$"; 
        Adapt.offlineStorage.set('r', reflectionData);
      }
      
      this._activityId += "" + this._courseid + "",
      this._stateId = this._activityId + "/" + _xapiID,

      // console.log(this._stateId);

      require(['https://unpkg.com/@xapi/xapi'], (XAPI) => {
        const learnerdata = Adapt.offlineStorage.get("learnerinfo");

        let _endpoint = "https://cloud.scorm.com/lrs/DQKRU0EHDD/";
        let _auth = `Basic ${btoa('tbBmy5FNh0-AOScGIdE:CeJeS3Q7pWIKBFlND-M')}`; // `Basic ${btoa('accounts@walkgrove.co.uk:Trap3z1um$22')}`;

        let agentName = learnerdata.name;
        let agentMbox = "mailto:" + learnerdata.id;

        const queryParamsString = location.search;
        const queryParamsObject = XAPI.getSearchQueryParamsAsObject(queryParamsString);
        // if there is an activity id, i.e. on an LRS
        if(queryParamsObject.activity_id) {

          _endpoint = queryParamsObject.endpoint;
          _auth = queryParamsObject.auth; 
          // actorDetails = queryParamsObject.actor;
          // registration = queryParamsObject.registration;

          agentName = queryParamsObject.actor.name;
          if(queryParamsObject.actor.mbox){
            agentMbox = queryParamsObject.actor.mbox;
          } else if(queryParamsObject.actor.account && queryParamsObject.actor.account.name) {
            const res = queryParamsObject.actor.account.name.split("|");
            agentMbox = "mailto:" + res[1];
          }
        } 

        this._xapi = new XAPI({
          endpoint: _endpoint,
          auth: _auth
        });

        this._actorDetails = {
          objectType: "Agent",
          name: agentName,
          mbox: agentMbox
        };

        this.onGetXAPIState();
      })
    },

    postRender: function() {
      this.setReadyStatus();

      this.setupInview();

      this.$('.js-reflection-save-click').prop('disabled', true);

      // console.log(this.model, this.model.get('_buttons'), this.model.get('_buttons').save);

      this.model.set('_isAnswered', false);

      if(this.model.get('_buttons') && this.model.get('_buttons').save === "") {
        this.$('.js-reflection-export-click').addClass('is-visible');
        this.$('.js-reflection-save-click').addClass('is-hidden');
      }

      
    },

    onGetXAPIState: function() {
      this.$('.reflection__loader').removeClass('is-hidden');
      // GET the xAPI state ...
      this._xapi.getState({
        agent: this._actorDetails,
        activityId: this._activityId,
        stateId: this._stateId
      }).then((result) => {
        console.log('>>>> getState', result.data);
        this._reflectdata = result.data;
        this._state = true;
        this.$('.reflection__loader').addClass('is-hidden');
        this.checkIfResetOnRevisit();
      }).catch((error) => {
        // console.log("no coursestate");
        this._state = false;
        this.$('.reflection__loader').addClass('is-hidden');
        this.onCreateXAPIState();
      });
    },

    onCreateXAPIState: function() {
      // if not one, then CREATE one!
      this._xapi.createState({
        agent: this._actorDetails,
        activityId: this._activityId,
        stateId: this._stateId,
        state: this._reflectdata
      });
      this._state = true;

      this.onSaveXAPIState();
    },

    onSaveXAPIState: function() {
      // SET
      this._xapi.setState({
        agent: this._actorDetails, 
        activityId: this._activityId, 
        stateId: this._stateId, 
        state: this._reflectdata
      });
    },        

    onSaveActive: function() {

      let allowSave = true;

      //check if all textboxes have data ...
      this.$('.reflection__item-textbox').each((index) => {
        if(this.$('.reflection__item-textbox').eq(index).val() === '') {
          allowSave = false;
        }
        const charCountLeft = 500 - this.$('.reflection__item-textbox').eq(index).val().length;
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

      if(this.model.get('_isNested') === true) {
        //GET
        this.onGetXAPIState();
      }

      _.delay(() => {
        this.model.set('_isAnswered', true);
        this.model.set('_isComplete', true);
        Adapt.trigger('intvid:unlock');

        // save to scorm data
        //let reflectionData = 'c-182^Reflection 1^Info about the refection for the PDF export ...$0^Step 1^Subtitle content goes in here ...^What are we asking ...?^D$$c-180^Reflection 1^Info about the refection for the PDF export ...$0^Step 1^Subtitle content goes in here ...^What are we asking ...?^A$1^Step 2^ ^What are we asking for this reflection input ...?^B$2^ ^ ^Question ...?^C$$';
        // this.onGetXAPIState();
        let reflectionData = this._reflectdata; //Adapt.offlineStorage.get('reflection_data');

        let dataFound = true;
        if (reflectionData === 'undefined' || reflectionData === null || reflectionData === "") {
          dataFound = false;
        }

        let activityFound = false;
        let activityID = this.model.get('_id');

        const activityTitle = this.model.get('_activity').title ? this.model.get('_activity').title : ' ';
        const activityBody = this.model.get('_activity').body ? this.model.get('_activity').body : ' ';

        // add initial activity info ...
        const reflectionActivityData = this.model.get('_id') + '^' + activityTitle + '^' + activityBody + '$';
        
        let reflectionDataNew = '';
        let newData = '';

        let activityToChange = false;

        if(dataFound === true) {
          let reflectActivities = reflectionData.split("$$");  
          activityFound = false;
          for(let a=0; a<reflectActivities.length-1; a++) {
            
            const reflects = reflectActivities[a].split("$");
            activityToChange = false;
            for(let r=0; r<reflects.length; r++){
              let reflect = reflects[r].split("^");

              if(r === 0) {
    
                if(reflect[0] === activityID) {
                  activityFound = true;
                  activityToChange = true;
                }
                newData += reflect[0] + '^' + reflect[1] + '^' + reflect[2];
              } else {
                if(reflects.length-1 === 1) {
                  if(activityToChange === true) {
                    reflect[4] = this.$('.js-reflection-textbox').eq(0).val();
                  }
                  newData += reflect[0] + '^' + reflect[1] + '^' + reflect[2] + '^' + reflect[3] + '^' + reflect[4] + '';
                } else {
                  for(let i=0; i<reflects.length-1; i++){
                    if(i === Number(reflect[0])) {
                      if(activityToChange === true) {
                        reflect[4] = this.$('.js-reflection-textbox').eq(i).val();
                      }
                      newData += reflect[0] + '^' + reflect[1] + '^' + reflect[2] + '^' + reflect[3] + '^' + reflect[4] + '';
                    }
                  }
                }
              }
              
              newData += '$';
    
            }
            newData += '$';

          }
        }
        
        // add any new activity data
        if(dataFound === false || activityFound === false) {

          if(this.model.get('_items').length === 1) {

            const titleText = this.model.get('_items')[0].title ? this.model.get('_items')[0].title : ' ';
            const subTitleText = this.model.get('_items')[0].subtitle ? this.model.get('_items')[0].subtitle : ' ';
            const questionText = this.model.get('_items')[0].question ? this.model.get('_items')[0].question : ' ';

            newData += reflectionActivityData + '0^' + titleText + '^' + subTitleText + '^' + questionText + '^' + this.$('.js-reflection-textbox').eq(0).val() + '$$';

          } else {

            newData += '' + reflectionActivityData;
            this.model.get('_items').forEach((item, i) => {
              const titleText = item.title ? item.title : ' ';
              const subTitleText = item.subtitle ? item.subtitle : ' ';
              const questionText = item.question ? item.question : ' ';
              newData += '' + i + '^' + titleText + '^' + subTitleText + '^' + questionText + '^' + this.$('.js-reflection-textbox').eq(i).val() + '$';
            });
            newData += '$';

          }
          
        }

        
        reflectionDataNew += newData;

        this._data = reflectionDataNew;
        // save to SCORM
        this._reflectdata = this._data; //Adapt.offlineStorage.set('r', this._data);
        // if(this._state === false) {
        //   this.onCreateXAPIState();
        // } else {
          this.onSaveXAPIState();
        // }

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
        
      }, 1000);    

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
        let reflectionData = this._reflectdata; //Adapt.offlineStorage.get('reflection_data');
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
        const PDFHeaderSubitle = this.model.get('pdf')._header.subtitle ? this.model.get('pdf')._header.subtitle : ' ';

        // console.log(PDFHeaderTitle, PDFHeaderSubitle);

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
        // const boxH = this.model.get('pdf')._header._titleStyling._fontSize + vPadding/2;
        // doc.rect(0, this.model.get('pdf')._header._titleStyling._top, this.model.get('pdf')._header._titleStyling._width, this.model.get('pdf')._header._titleStyling._height, "F");
        // -- title
        doc.setFontSize(this.model.get('pdf')._header._titleStyling._fontSize);
        this.setTextColorHexToRgb(doc, this.model.get('pdf')._header._titleStyling._fontColour);
        if(this._fontfamily !== "default") {
          doc.setFont(this._fontfamily, "bold");
        }
        let leftP = this.model.get('pdf')._header._titleStyling._left + leftPos;
        switch(this.model.get('pdf')._header._titleStyling._fontAlign){
          case "center":
            leftP = maxWidth/2;
            break;
          case "right":
            leftP = maxWidth - leftPos;
            break;
        }
        doc.text(PDFHeaderTitle, leftP, this.model.get('pdf')._header._titleStyling._top, { align: this.model.get('pdf')._header._titleStyling._fontAlign, maxWidth: maxWidth - 20 });
        
        yPos += (this.model.get('pdf')._header._titleStyling._height + (vPadding*2));

        if(PDFHeaderSubitle !== " ") {
          this.setTextColorHexToRgb(doc, this.model.get('pdf')._header._subtitleStyling._fontColour);
          doc.text(PDFHeaderSubitle, leftP, yPos, { align: this.model.get('pdf')._header._subtitleStyling._fontAlign, maxWidth: maxWidth - 20 });
          
          yPos += vPadding*2;
        }


        if(this._fontfamily !== "default") {
          doc.setFont(this._fontfamily, "normal");
        }

        // INPUT CONTENT

        //split into each activity
        const reflectActivities = this._data.split("$$");

        for(let a=0; a<reflectActivities.length-1; a++) {

          if(a !== 0 ) {
            yPos = this.newPagePDF(doc, yPos);
          }

          const reflects = reflectActivities[a].split("$");

          //loop through each activity
          for(let r=0; r<reflects.length; r++){
            const reflect = reflects[r].split("^");

            if(reflect.length > 1 ) {
              
              var str1 = reflect[1];
              var str2 = "slider";
              let sliderData = false;
              if(str1.indexOf(str2) !== -1){
                sliderData = true;
              }
              if(sliderData === false) {

                if(r === 0) {
                  // console.log(reflect);
                  this.setTextColorHexToRgb(doc, this.model.get('pdf')._activityStyling._fontColour);

                  //activityTitle
                  const activityTitle = reflect[1];
                  const actTitleSize = this.model.get('pdf')._activityStyling._fontTitleSize;
                  if(activityTitle !== ' ') {
                    doc.setFontSize(actTitleSize);
                    doc.text(activityTitle, leftP, yPos, { align: this.model.get('pdf')._header._titleStyling._fontAlign, maxWidth: maxWidth - 20 });
                    yPos += vPadding*2; //(actTitleSize/2 + vPadding);
                    yPos = this.checkNewPagePDF(doc, yPos, pageHeight);
                  }

                  this.setTextColorHexToRgb(doc, this.model.get('pdf')._fontColour);

                  //activityBody
                  const activityBody = reflect[2];
                  const actBodySize = this.model.get('pdf')._fontSize;
                  if(activityBody !== ' ') {
                    doc.setFontSize(actBodySize);
                    doc.text(activityBody, leftP, yPos, { align: this.model.get('pdf')._header._titleStyling._fontAlign, maxWidth: maxWidth - 20 });
                    const rows = Math.round(activityBody.length/75)+1;
                    yPos += ((rows * 5) + 10);
                    yPos = this.checkNewPagePDF(doc, yPos, pageHeight);
                  }

                } else {

                  // item title
                  let itemTitle = reflect[1];
                  if(itemTitle !== ' ') {
                    this.setTextColorHexToRgb(doc, this.model.get('pdf')._items._titleStyling._fontColour);
                    doc.setFontSize(this.model.get('pdf')._items._titleStyling._fontSize);
                
                    itemTitle = itemTitle.replace(/(<([^>]+)>)/ig,"");
                    doc.text(itemTitle, leftPos, yPos, { align: 'left', maxWidth: maxWidth - 20 });
                    yPos += vPadding*1.5;
                    yPos = this.checkNewPagePDF(doc, yPos, pageHeight);
                  }
                  
                  // item subtitle
                  let itemSubtitle = reflect[2];
                  if(itemSubtitle !== ' ') {
                    this.setTextColorHexToRgb(doc, this.model.get('pdf')._items._subtitleStyling._fontColour);
                    doc.setFontSize(this.model.get('pdf')._items._subtitleStyling._fontSize);
                
                    itemSubtitle = itemSubtitle.replace(/(<([^>]+)>)/ig,"");
                    doc.text(itemSubtitle, leftPos, yPos, { align: 'left', maxWidth: maxWidth - 20 });
                    yPos += vPadding*1.5;
                    yPos = this.checkNewPagePDF(doc, yPos, pageHeight);
                  }

                  // item question
                  let itemQuestion = reflect[3];
                  // console.log('|' + itemQuestion + '|', reflect[4]);
                  if(itemQuestion !== ' ') {//} && itemQuestion !== undefined && itemQuestion !== 'undefined') {
                    this.setTextColorHexToRgb(doc, this.model.get('pdf')._items._questionStyling._fontColour);
                    doc.setFontSize(this.model.get('pdf')._items._questionStyling._fontSize);
                  
                    itemQuestion = itemQuestion.replace(/(<([^>]+)>)/ig,"");
                    doc.text(itemQuestion, leftPos, yPos, { align: 'left', maxWidth: maxWidth - 20 });
                    const rows = Math.round(itemQuestion.length/75)+1;
                    yPos += ((rows * 6) + 12);
                    yPos = this.checkNewPagePDF(doc, yPos, pageHeight);
                  }

                  const boxY = Number(yPos) - Number(vPadding);

                  // input content
                  this.setTextColorHexToRgb(doc, this.model.get('pdf')._fontColour);
                  const contentTextSize = this.model.get('pdf')._fontSize;
                  doc.setFontSize(contentTextSize);

                  const inputContent = reflect[4];
                  // if(inputContent !== '' && inputContent !== undefined && inputContent !== 'undefined') {
                    doc.text(inputContent, leftPos + 10, yPos, { align: 'left', maxWidth: maxWidth - 40 }); ///to fit inside box
                    const rows = Math.round(inputContent.length/75)+1;
                    yPos += ((rows * 5) + vPadding + 10);

                    this.setFillColorHexToRgb(doc, '#f2f2f2');
                    doc.setLineWidth(0.1);
                    doc.roundedRect(leftPos, boxY, maxWidth-20, (rows*5)+10, 3, 3);

                    yPos = this.checkNewPagePDF(doc, yPos, pageHeight);
                  // }

                }

              }


            }
          }
        }

        // yPos = this.newPagePDF(doc, yPos);

        this.addFooter(doc);

        let filename = this.model.get('pdf').filename;
        filename.replace(" ", "-");
        // doc.save("" + filename + "-" + dateToday + ".pdf");
        var blob = doc.output("blob");
        window.open(URL.createObjectURL(blob));

      });

      

    },

    checkNewPagePDF: function(doc, yPos, pageHeight) {
      if (yPos >= pageHeight) {
          this.addFooter(doc);
          doc.addPage();
          yPos = 20; // Restart height position
      }
      return yPos;
    },

    newPagePDF: function(doc, yPos) {
      this.addFooter(doc);
      doc.addPage();
      yPos = 20; // Restart height position
      return yPos;
    },

    addFooter: function(doc) {
      const d = new Date();
      const dateToShow = '' + this.model.get('pdf').filename + ' - ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear() + '';
        
      const centerPos = 100;
      const maxWidth = 190;
      const bottomPos = 290;

      if(this.model.get('pdf')._footer && this.model.get('pdf')._footer.image !== null) {
        const pdfImageFooter = this.model.get('pdf')._footer.image;
        const imgArray = pdfImageFooter.split(".");
        const imgType = imgArray[imgArray.length-1];

        const wPercVar = doc.internal.pageSize.width/100;
        const hPercVar = doc.internal.pageSize.height/100;
        let widthVar = Math.round(this.model.get('pdf')._footer._imageStyling._width * wPercVar);
        let heightVar = Math.round(this.model.get('pdf')._footer._imageStyling._height * hPercVar);
        let leftVar = Math.round(this.model.get('pdf')._footer._imageStyling._left * wPercVar);
        let topVar = Math.round((100-this.model.get('pdf')._footer._imageStyling._bottom) * hPercVar);

        doc.addImage(pdfImageFooter, imgType, leftVar, topVar, widthVar, heightVar, '', 'none', 0);
      }

      

      doc.setFontSize(this.model.get('pdf')._footer._fontSize);
      this.setTextColorHexToRgb(doc, this.model.get('pdf')._footer._fontColour);
      if(this._fontfamily !== "default") {
        doc.setFont(this._fontfamily, "italic");
      }
      doc.text(dateToShow, centerPos, bottomPos, { align: 'center', maxWidth: maxWidth });
      doc.setFont(this._fontfamily, "normal");
    },

    /**
     * determines which element should be used for inview logic - body, instruction or title - and returns the selector for that element
     */
    getInviewElementSelector: function() {
     return 'reflection__main';
    },

    checkIfResetOnRevisit: function() {
      var isResetOnRevisit = this.model.get('_isResetOnRevisit');

      _.delay(() => {
        //let reflectionData = 'c-182^Reflection 1^Info about the refection for the PDF export ...$0^Step 1^Subtitle content goes in here ...^What are we asking ...?^D$$c-180^Reflection 1^Info about the refection for the PDF export ...$0^Step 1^Subtitle content goes in here ...^What are we asking ...?^A$1^Step 2^ ^What are we asking for this reflection input ...?^B$2^ ^ ^Question ...?^C$$';
        let reflectionData = this._reflectdata; //Adapt.offlineStorage.get('reflection_data');

        if (reflectionData !== 'undefined' && reflectionData !== null && reflectionData !== "") {

          // console.log(reflectionData);

          const reflectActivities = reflectionData.split("$$");
          for(let a=0; a<reflectActivities.length; a++) {
            const reflects = reflectActivities[a].split("$");

            let _reflectId = this.model.get('_id');
            let _id = "";
            let countVar = reflects.length;
            // if(this.model.get('_items').length === 1) {
            //   countVar = reflects.length-1;
            // }
            for(let r=0; r<countVar; r++){
              let reflect = reflects[r].split("^");
              if(r === 0 ) {
                _id = reflect[0];
              } else {
                if(_id === _reflectId) {
                  // one input ...?
                  console.log(countVar);
                  if(countVar === 1) {
                    this.$('.js-reflection-textbox').eq(0).val(reflect[4]);
                    // console.log('>>>>>>>>>>>>>>', _id, _reflectId, reflect[4]);
                  } else {
                    this.model.get('_items').forEach((item, i) => {
                      if(i === Number(reflect[0])) {
                        this.$('.js-reflection-textbox').eq(i).val(reflect[4]);
                        const charCountLeft = 500 - this.$('.reflection__item-textbox').eq(i).val().length;
                        this.$('.reflection__character-count').eq(i).html('' + charCountLeft + '');
                      }
                    });
                  }
                  // if(this.model.get('exportText') != "") {
                  //   this.$('.js-reflection-export-click').addClass('is-visible');
                  // }
                  this.model.set('_isAnswered', true);
                  this.model.set('_isComplete', true);
                  if(this.model.get('_message')._inline === true) {
                    // ... inline
                    this.$('.reflection__message').addClass('is-visible');
                  }
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
