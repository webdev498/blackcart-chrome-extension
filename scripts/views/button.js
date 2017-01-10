/* global $, chrome, _ */
(function() {
    'use strict';
    var Blackcart = window.Blackcart;

    // globals & utils
    // var config = window.BLACKCART_CONFIG;
    // var globals = Blackcart.globals;
    var utils = Blackcart.utils;


    var _getAbsoluteUrl = (function() {
        var a;
        return function(url) {
            if (!a) {
                a = document.createElement('a');
            }
            a.href = url;
            return a.href;
        };
    })();

    var _processPrice = function(rawPrice) {
        if (rawPrice && rawPrice.indexOf('|') >= 0) {
            rawPrice = rawPrice.split('|')[0];
        }
        var price = rawPrice.replace(/[A-Z\$\n\s\t\:]/ig, '');
        if(price.indexOf("-") > -1){
            price = price.split("-")[0];
        }
        return price;
    };

    var _attributeRE = /\:attr\([\w\-]+\)/g;
    var _posRE = /\:nth\(\d+\)/g;
    var _whiteSpaceRE=/[\s\t\r\n]/g;
    // var _attributeReplaceRE = /\:attr|[\(\)]/g;

    var Button = utils.createCustomViewClass().extend({
        tagName: 'div',
        templateURL: 'scripts/templates/cartbutton.html',
        cssURL: 'styles/chromestyle.css',
        events: {
            'click': 'onClick'
        },
        initialize: function(opts) {
            var self = this;
            var tpl;
            // load the main template
            this.user = opts.user;
            this.order = opts.order;
            this.injectType = opts.injectType || '';
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
            this.retailer = opts.retailer;
            if (opts.isIframe) {
                this.$iframe = opts.$iframe;
                this._getNodeFromString = this._createGetNodeFromString(this.$iframe);
            } else {
                this._getNodeFromString = this._createGetNodeFromString(
                    this.injectType === 'popup' ?
                    this.retailer.alternates.popup.root :
                    this.retailer.root);

            }
            this.$parentEl = opts.$parentEl;

            return this;
        },

        render: function() {
            var el = this.$el.get(0);
            var shadow;
            if (!el.shadowRoot) {
                shadow = el.createShadowRoot();
            } else {
                shadow = el.shadowRoot;
            }
            shadow.innerHTML = this.loadVendorCSS() + this.loadCSSFromURL('styles/chromestyle.css') + this.template({
                chromeURL: function(url) {
                    return chrome.extension.getURL(url);
                }
            });
            return this;
        },
        /*the root element or the iframe element*/
        _createGetNodeFromString: function(root) {
            /* TODO: when root is false, the first argument is no longer necessary*/
            if (_.isObject(root)) {
                return function($el,str){
                    return root.contents().find(str);
                };

            } else {
                return root ? function($el, str) {
                    return $el.parents(root).find(str);
                } : function($el, str) {
                    return $(str);
                };
            }
        },

        _getImageURL: function($node, attribute) {
            var bg;
            var imgURL;
            // var urlSelector = this.retailer.content.PThumbnail;
            if (this.retailer.isBG) {
                bg = $node.css('background-image') || $node.css('background');
                if (bg.indexOf('url(') < 0) {
                    throw new Error('Could not extract image.');
                } else {
                    imgURL = bg.replace('url("', '').replace('")', '');
                }
            } else if (attribute === 'background-image' || attribute === 'background') {
                imgURL = $node.css(attribute).replace('url("', '').replace('")', '');
            } else if (attribute) {
                imgURL = $node.attr(attribute);
            } else {
                imgURL = $node.attr('src');
            }
            return _getAbsoluteUrl(imgURL);
        },

        _getAttributeFromNode: function($node, attribute) {
            /* jQuery.text() returns the combined text of all children. This may not be the desired behaviour
             *  When trying to extract text, we get only the first text-node
             */
            var $textNode;
            if (attribute === 'text') {
                if ($node.children().length > 0) {
                    $textNode = $node.contents().filter(function() {
                        return this.nodeType === 3 && this.nodeValue.replace(_whiteSpaceRE,'') !== '';
                    });
                    return $($textNode[0] || $textNode).text();
                }
                return $node.text();
            } else {
                return $node.attr(attribute);
            }

        },

        _processMetaInformationForSelector: function(selector) {
            var newSelector = selector.substr(0);
            var metaData = {
                idx: -1
            };
            if (newSelector.indexOf(':attr(') >= 0) {
                metaData.attr = selector.split(':attr(')[1].replace(')', '').replace(/\s+/g, '');
                newSelector = newSelector.replace(_attributeRE, '');
            }

            if (newSelector.indexOf(':nth(') >= 0) {
                metaData.idx = parseInt(newSelector.split(':nth(')[1].replace(')', '').replace(/\s+/g, ''), 10) - 1;
                newSelector = newSelector.replace(_posRE, '');
            }

            return [newSelector, metaData];
        },

        /*
         * Custom processor cos CSS isn't enough
         */
        _processSelector: function(selector) {
            var $node;
            var $el = this.$el;
            var subSelectors;
            var self = this;
            var attribute;
            var metaInformation;

            if (selector.indexOf('||') >= 0) {
                subSelectors = selector.split('||');
                _.every(subSelectors, function(subSelector) {
                    metaInformation = self._processMetaInformationForSelector(subSelector);
                    attribute = metaInformation[1].attr;
                    $node = self._getNodeFromString($el, metaInformation[0]);
                    if (metaInformation[1].idx !== -1 && metaInformation[1].idx < $node.length) {
                        $node = $($node.get(metaInformation[1].idx));
                    }
                    if ($node.length > 0) {
                        // if it is an image, return as is
                        if ($node.is('img')) {
                            return false;
                        }

                        // if an attribute is specified check if the attribute exists before returning
                        if (attribute && $node.attr(attribute)) {
                            return false;
                        }

                        // standard check - element is visibile not empty
                        if ($node.is(':visible') && !$node.is(':empty')) {
                            return false;
                        }
                    }
                    return true;
                });


            } else {
                /*if (selector.indexOf(':nth(') >= 0) {
                    n = parseInt(selector.split(':attr(')[1].replace(')', ''), 10) - 1
                }
                if (selector.indexOf(':attr(') >= 0) {
                    attribute = selector.split(':attr(')[1].replace(')', '');
                    selector = selector.replace(_attributeRE, '');
                    $node = self._getNodeFromString($el, selector);
                } else {
                    $node = self._getNodeFromString($el, selector);
                }*/
                metaInformation = this._processMetaInformationForSelector(selector);
                attribute = metaInformation[1].attr;
                $node = self._getNodeFromString($el, metaInformation[0]);
                if (metaInformation[1].idx !== -1 && metaInformation[1].idx < $node.length) {
                    $node = $($node.get(metaInformation[1].idx));
                }

            }
            return {
                $node: $node.length > 1 ? $($node.get(0)) : $node,
                attribute: attribute
            };
        },

        extractContentsFromPage: function(url) {
            var retailer = this.retailer;
            var contentSelectors = (this.injectType === 'popup' ? retailer.alternates.popup.content : retailer.content) || {};
            var extractedContent = {
                PSource: retailer.PSource
            };
            var processedObj;
            var $node;
            var attribute;
            var self = this;
            extractedContent.ScreenshotURL = url;

            _.each(contentSelectors, function(selectorString, key) {
                processedObj = self._processSelector(selectorString);
                $node = processedObj.$node;
                attribute = processedObj.attribute;
                if (key === 'PThumbnail') {
                    extractedContent.PThumbnail = self._getImageURL($node, attribute);
                    return true;
                }
                if (key === 'Price') {
                    extractedContent.Price = _processPrice((self._getAttributeFromNode($node, attribute || 'text') || ''));
                    return true;
                }
                if (key === 'PSource') {
                    extractedContent.PSource = (self._getAttributeFromNode($node, attribute || 'text') || '').replace(/[\n\r]/ig, '');
                    return true;
                }
                extractedContent[key] = _.capitalize(self._getAttributeFromNode($node, attribute || 'text').replace(/[\n\r]/ig, '').replace(/\s{2,}/ig, ''));
            });
            extractedContent.PageURL = window.location.href;

            return extractedContent;

        },

        captureTabAndUpload: function() {
            var $dfd = $.Deferred();
            var self = this;
            chrome.runtime.sendMessage({
                evt: 'capture-tab'
            }, function(response) {
                self.$parentEl.trigger('blackcart.showLoader');
                utils.getImgurToken().done(function() {
                    utils.uploadImage(response.dataURL).done(function(resp) {
                        $dfd.resolve(resp);
                    }).fail(function(err) {
                        $dfd.reject(err);
                    });
                });
            });
            return $dfd;
        },

        onClick: function(e) {
            var originalEvent = e.originalEvent;
            var path = originalEvent.path[0];
            var self = this;
            e.preventDefault();
            if (path.id === 'blackcart-add-anchor' || path.id === 'blackcart-add-img') {
                this.captureTabAndUpload().done(function(r) {
                    if (!r.data.link) {
                        self.log('error', 'Could not retrieve URL from Imgur');
                    }
                    self.order
                        .addProduct(self.extractContentsFromPage(r.data.link || ''))
                        .fail(function() {
                            // handle failure
                        })
                        .always(function() {
                            self.$parentEl.trigger('blackcart.hideLoader');
                            self.$parentEl.trigger('blackcart.button.showCart');
                        });

                }).fail(function(err) {
                    self.$parentEl.trigger('blackcart.hideLoader');
                    self.log('error', err);
                    if (err === 'token-error') {
                        alert('There was an error. Please try again in a few minutes.');
                    }
                });
            }
        },

        show: function() {
            this.$el.removeClass('hidden');
        },

        hide: function() {
            this.$el.addClass('hidden');
        },

        destroy: function() {
            this.remove();
            return this;
        }
    });

    window.Blackcart.views.ButtonView = Button;
}());