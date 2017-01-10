(function() {
    'use strict';
    var CustomHandlers = {
        /*this method will be added to the PageManager class and will be called in that context
        so if there are any mystery methods that aren't visible here, they will be defined in PageManager (contentscript.js)*/
        zaraCustomHandler: function(retailer) {
            var self = this;
            var timeout = 1200;
            var popupTimeout = 1500;
            /* listen to history changes*/
            window.onpopstate = function() {
                setTimeout(function() {
                    self.removeButtons().injectButton(retailer);
                }, timeout);
            };

            $('body').on('click', 'a', function() {
                var $el = $(this);
                if ($el.parent().is('li.product') || $el.parent().is('#products-nav')) {
                    setTimeout(function() {
                        self.removeButtons().injectButton(retailer);
                    }, timeout);
                }
                if ($el.hasClass('_product-popup-link')) {
                    setTimeout(function() {
                        self.removeButtons('popup').injectButton(retailer, {
                            injectType: 'popup'
                        });
                    }, popupTimeout);
                }
            });

            $('body').on('click', 'span', function() {
                var $el = $(this);
                if ($el.hasClass('arrow')) {
                    setTimeout(function() {

                        self.removeButtons('popup').injectButton(retailer, {
                            injectType: 'popup'
                        });
                    }, popupTimeout);
                }
            });
        },
        newBalanceCustomHandler: function(retailer) {
            var self = this;
            var timeout = 1200;
            var popupTimeout = 1500;
            $('body').on('click', 'li.tile', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, popupTimeout);
            });
        },
        shopBopCustomHandler: function(retailer) {
            var self = this;
            var timeout = 1200;
            var popupTimeout = 1500;
            $('body').on('click', 'li.product', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, popupTimeout);
            });
        },
        theShoeCompanyCustomHandler: function(retailer) {
            var self = this;
            var timeout = 1200;
            var popupTimeout = 1500;
            $('body').on('click', 'a.productQuickViewLink', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, popupTimeout);
            });

            $('body').on('click', '#quickviewLightbox .sizeSelector li', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, popupTimeout);
            });

            $('body').on('click', '#quickviewLightbox .dk_options_inner li > a', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, popupTimeout);
            });
        },
        americanEagleCustomHandler: function(retailer) {
            var self = this;
            var popupTimeout = 2000;
            $('body').on('click', '.aeoicon-add', function() {
                if ($(this).parent().hasClass('quickview-product-btn')) {
                    setTimeout(function() {
                        self.removeButtons('popup').injectButton(retailer, {
                            injectType: 'popup',
                            stopPolling: true
                        });
                    }, popupTimeout);
                }
            });

            $('body').on('click', '.quickview-product-btn', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, popupTimeout);
            });

            $('body').on('click', '.quickview-swatch-img', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, popupTimeout);
            });
        },
        billabongCustomHandler: function(retailer) {
            var self = this;
            var popupTimeout = 2000;
            $('body').on('click', 'a.quickview', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, popupTimeout);
            });
        },
        nikeCustomHandler: function(retailer) {
            var self = this;
            var timeout = 2800;
            $('body').on('click', 'li', function() {
                var $el = $(this);
                if ($el.parents('.color-chips').length > 0) {
                    setTimeout(function() {
                        self.removeButtons().injectButton(retailer);
                    }, timeout);
                }
            });
            
        },
        garageCustomHandler: function(retailer) {
            var self = this;
            var popupTimeout = 3000;
            $('body').on('click', 'img.quickViewImg', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, popupTimeout);
            });
        },
        footLockerCustomHandler: function(retailer) {
            var self = this;
            var popupTimeout = 1500;
            $('body').on('mousedown', 'a.quickviewButton', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, popupTimeout);
            });
        },
        hollisterCustomHandler: function(retailer) {
            var self = this;
            var popupTimeout = 1500;
            $('body').on('click', 'a.grid-product__quick-view', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, popupTimeout);
            });
            
            $('body').on('click', 'li.recommendation-product', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, popupTimeout);
            });
        },
        jackjonesCustomHandler: function(retailer) {
            var self = this;
            var popupTimeout = 2000;
            $('body').on('click', 'a.quick-view', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, popupTimeout);
            });
        },
        marcianoCustomHandler: function(retailer) {
            var self = this;
            var popupTimeout = 2000;
            $('body').on('mouseup', 'a.quickviewLink', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, popupTimeout);
            });
        },
        melanieLyneCustomHandler: function(retailer) {
            var self = this;
            // delay this a lot because everything gets loaded in an iframe. Not very efficient
            var popupTimeout = 5000;
            var timeout = 1500;
            $('body').on('click', '.quickview', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true,
                        isIframe: true
                    });
                }, popupTimeout);
            }).on('click','.swatches li.selectable',function(){
                setTimeout(function() {
                    self.removeButtons().injectButton(retailer, {
                        stopPolling: true
                    });
                }, timeout);
            });
        },

        underArmourCustomHandler: function(retailer) {
            var self = this;
            // delay this a lot because everything gets loaded in an iframe. Not very efficient
            var popupTimeout = 5000;
            $('body').on('click', '.product-quickview', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true,
                        isIframe: true
                    });
                }, popupTimeout);
            });
        },

        rwcoCustomHandler: function(retailer) {
            var self = this;
            var timeout = 1500;
            $('body').on('click', '.swatchanchor', function() {
                setTimeout(function() {
                    self.removeButtons().injectButton(retailer);
                }, timeout);
            }).on('click', 'a.btn-quickview', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, timeout);
            });
        },

        forever21Handler: function(retailer) {
            var self = this;
            var timeout = 1500;
            $('body').on('click', '.quick_view, #carousel_newarrivals .item, #carousel_bestsellers .item', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, timeout);
            });
        },

        brownShoesHandler: function(retailer) {
            var self = this;
            var timeout = 1500;
            var swatchSelectTimeout = 3800;
            $('body').on('click', '#quickviewbutton', function() {
                setTimeout(function() {
                    self.removeButtons().injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, timeout);
            }).on('click', '.quickview .swatchanchor, .quickview .swatches.Color .selected, .quickview .swatches.size .selected', function() {
                setTimeout(function() {
                    self.removeButtons().injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, swatchSelectTimeout);
            });
        },

        runningRoomCustomHandler: function(retailer) {
            var self = this;
            var timeout = 4000;
            $('body').on('mouseup', '.quickview-link', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true,
                        isIframe: true
                    });
                }, timeout);
            });
        },

        benchCustomHandler: function(retailer) {
            var self = this;
            var timeout = 9000;
            $('body').on('click', '.quickview', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true,
                        isIframe: true
                    });
                }, timeout);
            });
        },

        simonsCustomHandler: function(retailer) {
            var self = this;
            var timeout = 2000;
            $('body').on('click', 'a.quick > span', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, timeout);
            });
        },

        theBayCustomHandler: function(retailer) {
            var self = this;
            var timeout = 2000;
            $('body').on('mouseup', '.quickview', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true,
                        isIframe: true
                    });
                }, timeout);
            });
        },
        
        joeFreshCustomHandler: function(retailer) {
            var self = this;
            var timeout = 2500;
            var timer;
            var text = "Size";
            
            if($("button.quickview-button").length == 0){
                setTimeout(function(){
                    window.location.reload();
                },timeout)
            }
            
            $('body').on('click', 'button.quickview-button', function(){
                console.log("Working...");
            });
            
            $('button.quickview-button').click(function(event) {
                event.stopPropagation();
                console.log('Quick View Clicked');
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                    $("#quickview-modal .add-to-bag").find("br").remove();
                    
                    timer = setInterval(function(){
                        if(text != $("div#quickview-modal a.chzn-single span").html()){
                            text = $("div#quickview-modal a.chzn-single span").html();
                            setTimeout(function() {
                                self.removeButtons().injectButton(retailer, {
                                    injectType: 'popup',
                                    stopPolling: true
                                });
                            }, timeout);
                        }
                    },1000);
                }, timeout);
            });
            
            $('body').on('click', function(event) {
                event.stopPropagation();
                console.log('Quick View Clicked');
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                    $("#quickview-modal .add-to-bag").find("br").remove();
                    
                    timer = setInterval(function(){
                        if(text != $("div#quickview-modal a.chzn-single span").html()){
                            text = $("div#quickview-modal a.chzn-single span").html();
                            setTimeout(function() {
                                self.removeButtons().injectButton(retailer, {
                                    injectType: 'popup',
                                    stopPolling: true
                                });
                            }, timeout);
                        }
                    },1000);
                }, timeout);
            });
            
            $('body').on('change', '#variant,#qty', function() {
                setTimeout(function() {
                    self.removeButtons().injectButton(retailer, {
                        stopPolling: true
                    });
                }, timeout);
            }).on('click', 'li.active-result', function() {
                setTimeout(function() {
                    self.removeButtons().injectButton(retailer, {
                        stopPolling: true
                    });
                }, timeout);
            });
            
            $('body').on('click', 'button.close.icon-close', function(){
                clearInterval(timer);
                text = "Size";
            });
            
            
            $('body').on('click','#quickview-modal .color-selector .swatch-link span', function(event){
                event.stopPropagation();
                setTimeout(function() {
                    self.removeButtons().injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                    $("#quickview-modal .add-to-bag").find("br").remove();
                }, timeout);
            });
        },
        
        clubMonacoCustomHandler: function(retailer) {
            var self = this;
            var timeout = 5000;
            $('body').on('click', '.quickshop-link-magnify', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true,
                        isIframe: true
                    });
                }, timeout);
            });
        }
        
        ,

        urbanOutfittersCustomHandler: function(retailer) {
            var self = this;
            var timeout = 5000;
            $('body').on('click', '.product-snapshot', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, timeout);
            });
        }
        
        ,

        reitMansCustomHandler: function(retailer) {
            var self = this;
            var timeout = 2000;
            $('body').on('click', 'a.btn-quickview', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, timeout);
            });
            
            $('body').on('click', '#QuickViewDialog .product-variations .swatches li', function() {
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                }, timeout);
            });
        }
        ,

        shopTiquesCustomHandler: function(retailer) {
            var self = this;
            var timeout = 1000;
            
            $('body').on('mouseleave', '.product.with-swatches.listproduct , .products-list__product.online', function(event){
                event.stopPropagation();
                $("#blackcart-add-to-cart-0").remove();
            });
            
            $('body').on('mouseenter', '.product.with-swatches.listproduct , .products-list__product.online', function(event) {
                event.stopPropagation();
                var className = $(this).attr('class').replace(' ','.');
                if(className.indexOf('products-list__product.online') > -1){
                    // Products in main pages
                    $('.products-list__product.online').removeClass('active_product');
                    $('.products-list__product.online .products-list__product__form').removeClass('quick-buy selected focused');
                    $('.products-list__product.online .products-list__product__form .button.pink').removeClass('quick-buy-add');
                    $(this).addClass('active_product');
                    $(this).find('.products-list__product__form').addClass('quick-buy selected focused');
                    $(this).find('.products-list__product__form .button.pink').addClass('quick-buy-add');
                    
                } else {
                    // Products in Trend Page
                    $('.product.with-swatches.listproduct').removeClass('active_product');
                    $(this).addClass('active_product');
                }
                setTimeout(function() {
                    self.removeButtons('popup').injectButton(retailer, {
                        injectType: 'popup',
                        stopPolling: true
                    });
                    $(".quick-buy.selected.focused br").remove();
                }, timeout);
            });
        }
    };
    window.Blackcart.CustomHandlers = CustomHandlers;
}());