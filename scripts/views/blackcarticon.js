(function() {
    'use strict';
    var Blackcart = window.Blackcart;
    // var globals = Blackcart.globals;
    var animationInterval = 24 * 60 * 60 * 1000;
    var utils = Blackcart.utils;
    // var collections = Blackcart.collections;
    var Icon = utils.createCustomViewClass().extend({
        tagName: 'div',
        templateURL: 'scripts/templates/blackcarticon.html',
        cssURL: 'styles/chromestyle.css',
        events: {
            click: 'onClick'
        },
        initialize: function(opts) {
            var self = this;
            var tpl;
            // load the main template
            tpl = this.loadTemplateFromURL(this.templateURL);
            if (_.isString(tpl)) {
                this.template = _.template(tpl);
                this.render();
            } else {
                tpl.done(function(resp) {
                    self.template = _.template(resp);
                    self.render();
                }).fail(function(e) {
                    self.log('error', e);
                });
            }
            this.$parentEl = opts.$parentEl;
            this.icon = opts.icon;
        },

        render: function() {
            var el = this.$el.get(0);
            var shadow;
            var self = this;
            var anchorEl;
            if (!el.shadowRoot) {
                shadow = el.createShadowRoot();
            } else {
                shadow = el.shadowRoot;
            }
            if (!this.cssLoaded) {
                shadow.innerHTML = this.loadVendorCSS() + this.loadCSSFromURL('styles/chromestyle.css') +
                    this.loadCSSFromURL('styles/main.css') + this.template({
                        chromeURL: function(url) {
                            return chrome.extension.getURL(url);
                        }
                    });
                this.cssLoaded = true;
            } else {
                shadow.removeChild(shadow.querySelector('.chrome-widget'));
                shadow.appendChild($(this.template({
                    chromeURL: function(url) {
                        return chrome.extension.getURL(url);
                    }
                })).get(0));
            }

            chrome.storage.sync.get({
                lastAnimationTime: false
            }, function(data) {
                var lastAnimationTime = data.lastAnimationTime;
                if (!lastAnimationTime ||
                    (new Date().getTime() - lastAnimationTime >= animationInterval)) {
                    lastAnimationTime = new Date().getTime();
                    self.showSpinAnimation = true;
                    chrome.storage.sync.set({
                        lastAnimationTime: lastAnimationTime,
                        showSpinAnimation: true
                    });
                    setTimeout(function() {
                        self.animate();
                    }, 1500);
                }
            });

            if (_.isUndefined(this.showSpinAnimation)) {
                chrome.storage.sync.get({
                    showSpinAnimation: false
                }, function(data) {
                    self.showSpinAnimation = data.showSpinAnimation;
                    if (self.showSpinAnimation) {
                        self.animate();
                    }
                });
            }

            if (this.showSpinAnimation) {
                anchorEl = (this.getShadowElement('.icon-switcher') || [])[0];
                if (anchorEl && anchorEl.classList) {
                    anchorEl.classList.add('spin');
                    // hack to play animation
                    // anchorEl.offsetWidth = anchorEl.offsetWidth;
                    anchorEl.style.webkitAnimationPlayState = "running";
                }
                this.showSpinAnimation = false;
                chrome.storage.sync.set({
                    showSpinAnimation: false
                });
            }

            return this;
        },

        show: function() {
            this.$el.removeClass('hidden');
        },

        hide: function() {
            this.$el.addClass('hidden');
        },

        onClick: function(e) {
            var evt = e.originalEvent;
            var path = evt.path;
            var $src = $(path[0]);
            if (!$src.length) {
                return true;
            }
            if ($src.attr('id') === 'blackcart-icon-switcher-img' || $src.attr('id') === 'blackcart-icon-switcher') {
                e.preventDefault();
                this.$parentEl.trigger('blackcart.iconclick');
            }
        },

        animate: function() {
            var el = (this.getShadowElement('.icon-switcher') || [])[0];
            if (el && el.classList) {
                el.classList.add('spin');
                // hack to play animation
                // el.offsetWidth = el.offsetWidth;
                el.style.webkitAnimationPlayState = "running";
            }
            this.showSpinAnimation = false;
            chrome.storage.sync.set({
                showSpinAnimation: false
            });
        }
    });

    window.Blackcart.views.Icon = Icon;
}());