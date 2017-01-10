(function() {
    'use strict';
    // var globals = window.Blackcart.globals;
    var utils = window.Blackcart.utils;
    var RetailersView = utils.createCustomViewClass().extend({
        tagName: 'div',
        templateURL: 'scripts/templates/retailers.html',
        cssURL: 'styles/chromestyle.css',
        className: 'hidden',
        events:{
            'click':'onClick'
        },
        initialize: function(opts) {
            var self = this;
            // load the main template
            var tpl = this.loadTemplateFromURL(this.templateURL);
            this.brands = opts.brands;
            if (_.isString(tpl)) {
                this.template = _.template(tpl);
                this.render().hide();
            } else {
                tpl.done(function(resp) {
                    self.template = _.template(resp);
                    self.render().hide();
                }).fail(function(e) {
                    self.log('error', e);
                });
            }
            _.bindAll(this,'_onBodyClick');
        },

        render: function() {
            var el = this.$el.get(0);
            var shadow;
            if(!el.shadowRoot){
                shadow = el.createShadowRoot();
            }else{
                shadow = el.shadowRoot;
            }
            shadow.innerHTML = this.loadVendorCSS() + this.loadCSSFromURL('styles/chromestyle.css') + this.template({
                chromeURL: function(url) {
                    return chrome.extension.getURL(url);
                },
                brands:this.brands,
                _:_
            });
            this.position();
            return this;
        },

        position: function() {
            this.$el.css({
                // top:window.innerHeight/2-this.$el.height()/2,
                left: window.innerWidth / 2 - this.$el.width() / 2
            });
            return this;
        },

        show: function() {
            this.$el.removeClass('hidden');
            this.position();
            setTimeout(_.bind(function() {
                this.listenToBody();
            }, this), 100);
            return this;
        },

        hide: function() {
            this.stopListening().$el.addClass('hidden');
            return this;
        },

        onClick: function(e) {
            var originalEvent = e.originalEvent;
            var path = originalEvent.path[0];
            if (path.id === 'retailer_window_close_btn') {
                this.hide();
            }
        },

        _onBodyClick:function(e){
            if(!$(e.target).is(this.$el)){
                this.hide();
            }
        },

        listenToBody:function(){
            $('body').on('click',this._onBodyClick);
            return this;
        },

        stopListening:function(){
            $('body').off('click',this._onBodyClick);
            return this;
        }
    });

    window.Blackcart.views.RetailersView = RetailersView;
}());