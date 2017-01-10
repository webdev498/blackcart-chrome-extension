(function() {
  'use strict';
  var Blackcart = window.Blackcart;
  // var globals = Blackcart.globals;
  var utils = Blackcart.utils;
  // var collections = Blackcart.collections;
  var config = window.BLACKCART_CONFIG;
  var Brands = utils.createCustomViewClass().extend({
    events: {
    },
    initialize: function() {
      var self = this;
      this._getBrands().done(function(resp) {
        self.brands = resp;
        self.render();
      });
    },

    _getBrands: function() {
      return this.rest({
        endpoint: config.server.endPoints.getBrands,
        method: 'GET'
      });
    },

    render: function() {
      var $root = this.$el.find('.row');
      var htmlArr = [];
      var tplArr;
      $root.empty();
      _.each(this.brands,function(brand){
        if(brand.Active === 0){
          return true;
        }
        tplArr = ['<div class="col-md-6 column">'];
        tplArr.push( '<a class="brand-name" href="'+brand.URL+'" target="_blank" title="'+brand.BTitle+'" style="font-size:13px;">');
        tplArr.push(brand.BTitle+'</a><br/>');
        tplArr.push('<a href="'+brand.URL+'" target="_blank" title="'+brand.BTitle+'">');
        tplArr.push('<img src="'+brand.BThumbnail+'" alt="'+brand.BTitle+'" />');
        tplArr.push('</a></div>');
        htmlArr.push(tplArr.join('\n'));
        tplArr.splice(0,tplArr.length);
      });
      $root.html(htmlArr.join('\n'));
      htmlArr.splice(0,htmlArr.length);
      return this;
    },



    show: function() {
      this.$el.removeClass('hidden');
    },

    hide: function() {
      this.$el.addClass('hidden');
    },

    toggle: function(){
      if(this.$el.hasClass('hidden')){
        this.show();
      }else{
        this.hide();
      }
    }
  });

  window.Blackcart.views.Brands = Brands;
}());