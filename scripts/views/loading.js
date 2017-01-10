(function() {
    'use strict';
    // var globals = window.Blackcart.globals;
    var utils = window.Blackcart.utils;
    var LoadingView = utils.createCustomViewClass().extend({
        tagName: 'div',
        templateURL: 'scripts/templates/loading.html',
        cssURL: 'styles/chromestyle.css',
        className: 'hidden',
        initialize: function() {
            var self = this;
            // load the main template
            var tpl = this.loadTemplateFromURL(this.templateURL);
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
                }
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
            return this;
        },

        hide: function() {
            this.$el.addClass('hidden');
            return this;
        },

        /*onClick: function(e) {
            var originalEvent = e.originalEvent;
            var path = originalEvent.path[0];
            if (path.id === 'blackcart-add-anchor' || path.id === 'blackcart-add-img') {
                this.showLoader();
            } else if (path.id === 'blackcart-add-input') {

            }
        }*/
    });

    window.Blackcart.views.LoadingView = LoadingView;
}());