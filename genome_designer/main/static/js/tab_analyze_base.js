/**
 * @fileoverview Base object for views related to analysis.
 */

gd.TabAnalyzeBaseView = Backbone.View.extend({
  /** Element that Backbone attches this component to. */
  el: '#gd-page-container',


  /** Backbone initialize method. */
  initialize: function() {
    // The DataTableComponent currently in view.
    this.datatable = null;

    // Current list of variants being displayed.
    this.variantList = null;

    // Datatable field config.
    this.fieldConfig = null;

    // List of variant sets belonging to the user.
    this.variantSetList = null;
  },


  /** Backbone sugar for registering event listeners. */
  events: {
    'click #gd-analyze-select-ref-genome': 'handleRefGenomeSelect',
    'click .gd-variant-set-action': 'handleVariantSetClick',
  },


  /** Handles a Reference Genome being selected from the dropdown menu. */
  handleRefGenomeSelect: function(e) {
    var refGenomeUid = $(e.target).val();

    // Show the entity select (i.e. Variants, VariantSets, etc.)
    // TODO: Implement support for switching among entities.
    $('#gd-analyze-select-search-entity').fadeIn();

    // Kick off request to update the Variant data being displayed.
    this.updateVariantList(refGenomeUid);
  },


  /** Kicks off the process for updating the list of displayed variants. */
  updateVariantList: function(refGenomeUid) {
    var requestData = {
      'projectUid': this.model.get('project').uid,
      'refGenomeUid': refGenomeUid,
    };

    $.get('/_/variants', requestData,
        _.bind(this.handleGetVariantListResponse, this));
  },


  /** Handles the server response containing Variants data. */
  handleGetVariantListResponse: function(response) {
    // Repopulate json data from response
    this.variantList = JSON.parse(response.variant_list_json).obj_list;
    this.fieldConfig = JSON.parse(response.variant_list_json).field_config;
    this.variantSetList = JSON.parse(response.variant_set_list_json).obj_list;

    // TODO: Is there a cleaner way to create the instance but not necessarily
    // draw it?
    if (!this.datatable) {
      this.drawDatatable();
    }

    // Redraw the datatable.
    this.datatable.update(this.variantList);

    // Does this need to be called every time?
    this.drawDropdowns();
  },


  /** Redraws the datatable based on the selection. */
  drawDatatable: function() {
    this.datatable = new gd.DataTableComponent({
        el: $('#gd-datatable-hook'),
        objList: this.variantList,
        fieldConfig: this.fieldConfig,
    });
  },


  /* Adds options to the variant set dropdown menu. */
  drawDropdowns: function() {
    // Create 'add selected to set' button, display list of available sets
    this.addVariantSetDropdownSubmenu(
        this.variantSetList, 'add', 'Add to set');
    this.addVariantSetDropdownSubmenu(
        this.variantSetList, 'remove', 'Remove from set');
  },


  /*
   * Create a dropdown submenu with a list of all variant sets, to which
   * selected variants will be added.
   */
  addVariantSetDropdownSubmenu: function(allVariantSets, varSetAction,
      varSetActionText) {
    var setListHTML = (
      '<li class="dropdown-submenu pull-left">' +
        '<a tabindex="-1" href="#">' +
          varSetActionText +
        '</a>' +
        '<ul class="dropdown-menu">' +
          _.map(allVariantSets,
            function(variantSet) {
              return this.addIndividualSetListItem(variantSet, varSetAction);
            }, this).join('') +
        '</ul>' +
      '</li>');

    this.datatable.addDropdownOption(setListHTML, '');
  },


  /**
   * Create a single html list object for a sub-dropdown set option.
   *
   * @param variantSet The variant set dictionary object from the
   *     django adapter.
   * @param variantSetAction The action to perform, either 'add' or 'remove'
   */
  addIndividualSetListItem: function(variantSet, variantSetAction) {
    return (
      '<li><a tabindex="-1" class="gd-variant-set-action" ' +
        'data-variant-set-uid="' + variantSet.uid + '" ' +
        'data-variant-set-action="' + variantSetAction +
        '" href="#">' + variantSet.label + '</a></li>');
  },


  /** Handles a click on a variant set action button. */
  handleVariantSetClick: function(ev) {
    // Post to this same view for now.
    var postUrl = window.location.pathname;

    // Grab the selected rows.
    var postData = {
        variantUidList: this.datatable.getCheckedRowUids(),
        variantSetAction: $(ev.target).data('variant-set-action'),
        variantSetUid: $(ev.target).data('variant-set-uid')
    };

    var validationResult = this.validatePostData(postData);
    if (!validationResult.is_success) {
      this.showAlertMessage(validationResult.error_msg, 'error');
      return;
    }

    var onSuccess = _.bind(function(response) {
      // Repopulate json data from response
      this.variantList = JSON.parse(response.variant_list_json).obj_list;
      this.variantSetList = JSON.parse(response.variant_set_list_json).obj_list;

      // Show alert message based on response.
      this.showAlertMessage(response.alert_msg, response.alert_type);

      // Redraw the datatable.
      this.datatable.update(this.variantList);
      this.drawDropdowns();
    }, this);

    // Execute the post. Should return a redirect response.
    $.post(postUrl, JSON.stringify(postData), onSuccess);
  },


  /**
   * Validate the post data before submitting.
   * @param {object} postData The creation data to be posted to the server.
   * @return {object} Response with keys:
   *     * is_success {boolean} Whether validation succeded.
   *     * error_msg {string} Human-readable description of the error.
   */
  validatePostData: function(postData) {
    if (!postData.variantUidList.length) {
      return {
          is_success: false,
          error_msg: 'Please select at least one variant.'
      };
    }

    return {
          is_success: true,
          error_msg: ''
    };
  },


  /** Shows an alert message. */
  showAlertMessage: function(msg, alertType) {
    $('#gd-variant-set-action-submit-alert-msg').text(msg);
    $('#gd-variant-set-action-submit-alert').removeClass(
        'alert-warn alert-info alert-error');
    $('#gd-variant-set-action-submit-alert').addClass('alert-' + alertType);
    $('#gd-variant-set-action-submit-alert').show();
  }
});
