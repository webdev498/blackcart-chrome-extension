/* global  $, chrome, _, Backbone */
(function() {
    'use strict';
    var templateCache = {};
    // var imgur_access_token = 'eee1521d17d042ce8b3bab7bef573614b98a294f';
    // var imgur_refresh_token = '5b1240088d64ec773b40fe8a73f9b8390c91d8f7';
    var imgur_access_token = '';
    var imgur_refresh_token = '';
    var config = window.BLACKCART_CONFIG;
    var IMGUR_RETRY_DELAY = 800;
    var MAX_RETRY_ATTEMPTS = 1;

    /*function _dataURLtoBlob(dataURL) {
        // convert base64/URLEncoded data component to raw binary data held in a string
        var byteString;
        if (dataURL.split(',')[0].indexOf('base64') >= 0) {
            byteString = window.atob(dataURL.split(',')[1]);
        } else {
            byteString = window.unescape(dataURL.split(',')[1]);

        }

        // separate out the mime component
        var mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];

        // write the bytes of the string to a typed array
        var ia = new Uint8Array(byteString.length);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        return new Blob([ia], {
            type: mimeString
        });
    }*/
    var _ajax = function _ajax(options) {
        var ajaxOpts = {
            url: options.url,
            type: options.method,
            dataType: 'json',
            cache: false,
            processData: false
        };
        if (options.data) {
            if (!options.contentType && options.method !== 'GET') {
                ajaxOpts.contentType = 'application/json';
            }
            if (ajaxOpts.contentType === 'application/json') {
                ajaxOpts.data = JSON.stringify(options.data);
            } else {
                ajaxOpts.data = options.data;
            }
        }

        return $.ajax(ajaxOpts);
    };

    var _rest = function _rest(options) {
        var baseURL = window.BLACKCART_CONFIG.server.baseURL;
        var endpoint = options.endpoint;
        options.url = baseURL + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
        return _ajax(options);
    };

    window.Blackcart.utils = {
        extendMany: function() {
            var args = Array.prototype.slice.call(arguments);
            var targetClass = args.shift();
            return _.reduce(args, function(prevClass, nextClass) {
                return prevClass.extend(nextClass);
            }, targetClass);
        },

        createCustomViewClass: function() {
            return this.extendMany(Backbone.View, this.UtilsClass, this.TemplateLoader);
        },

        UtilsClass: {
            log: function( /*arguments*/ ) {
                var args = Array.prototype.slice.call(arguments);
                if (args.length === 1) {
                    console.log('Blackcart:', args[0]);
                } else if (args.length >= 2 && console[args[0]]) {
                    console[args[0]]('Blackcart:', args[1]);
                }
            },

            getChromeURL: function(url) {
                return chrome.extension.getURL(url);
            },
            ajax: _ajax,
            rest: _rest,
            getShadowElement: function(query) {
                var el = this.$el.get(0);
                var shadowRoot = el.shadowRoot;
                return shadowRoot.querySelectorAll(query);
            }
        },

        TemplateLoader: {
            vendorCSS: [
                // 'styles/vendor/font-awesome-dev.min.css',
                'styles/vendor/font-awesome.min.css',
                'bower_components/bootstrap/dist/css/bootstrap.min.css',
                'bower_components/bootstrap/dist/css/bootstrap-theme.min.css'
            ],
            loadTemplateFromURL: function(url) {
                var $dfd;
                if (templateCache[url]) {
                    return templateCache[url];
                }
                $dfd = $.get(this.getChromeURL(url));
                $dfd.done(function(data) {
                    templateCache[url] = data;
                });
                return $dfd;
            },

            loadCSSFromURL: function(cssURL) {
                return '<style> @import "' + chrome.extension.getURL(cssURL) + '"; </style>';
            },

            loadVendorCSS: function() {
                return _.map(this.vendorCSS, function(css) {
                    return '<style> @import "' + chrome.extension.getURL(css) + '"; </style>';
                }).join('\n');
            }
        },

        generateRandom: function(digits) {
            var base = Math.pow(10, digits || 5);
            return Math.round(Math.random() * base);
        },

        /* imgur helpers*/
        resetImgurToken: function() {
            imgur_access_token = null;
            imgur_refresh_token = null;
            return this;
        },

        getImgurToken: function() {
            var url = config.server.baseURL + config.server.endPoints.getToken + '/imgur';
            var $dfd = $.Deferred();

            if (imgur_access_token) {
                return $dfd.resolve();
            }
            $.ajax({
                url: url,
                type: 'GET',
            }).done(function(token) {
                // set the tokens to private vars imgur_access_token and imgur_refresh_token
                imgur_access_token = token.access_token;
                imgur_refresh_token = token.refresh_token;
                $dfd.resolve();
            }).fail(function() {
                $dfd.reject();
            });
            return $dfd;
        },

        refreshImgurToken: function() {
            var url = config.server.baseURL + config.server.endPoints.refreshToken + '/imgur';
            // var $dfd = $.Deferred();
            return $.ajax({
                url: url,
                type: 'POST'
            });
        },

        getDataURI: function(url, callback) {
            // var image = new Image();
            chrome.runtime.sendMessage({
                evt: 'get-dataurl',
                imgURL: url
            }, function(response) {
                callback(response.dataURL);
            });
        },

        checkImageLoad: function(url, callback) {
            chrome.runtime.sendMessage({
                evt: 'check-image-load',
                imgURL: url
            }, function(response) {
                callback(response && response.resp === 'check-image-load:ok');
            });
        },

        uploadImage: function(dataURI, retry, $dfd) {
            var self = this;

            // recursion parametersw
            $dfd = $dfd || $.Deferred();
            retry = _.isUndefined(retry) ? 0 : retry;
            if (!dataURI) {
                $dfd.reject('datauri-undefined');
                return $dfd;
            }
            if (!retry) {
                dataURI = dataURI
                    .replace('data:image/jpeg;base64,', '')
                    .replace('data:image/png;base64,', '');
            }

            $.ajax({
                url: config.uploadURL,
                type: 'POST',
                headers: {
                    Authorization: 'Bearer ' + imgur_access_token,
                    Accept: 'application/json'
                },
                data: {
                    image: dataURI,
                    type: 'file'
                }
            }).done(function(result) {
                $dfd.resolve(result);
            }).fail(function(result) {
                if (result.status === 401 || result.status === 403) {
                    /* retry only once before failing*/
                    if (retry > MAX_RETRY_ATTEMPTS) {
                        self.resetImgurToken().refreshImgurToken();
                        $dfd.reject('token-error');
                    } else {
                        retry += 1;
                        self.resetImgurToken()
                            .refreshImgurToken()
                            .done(function(response) {
                                /* if there is already a refresh in progress, try again after delay */
                                if (response && response.result === 'IN-PROGRESS') {
                                    return setTimeout(function() {
                                        self.getImgurToken().done(function() {
                                            return self.uploadImage(dataURI, retry, $dfd);
                                        }).fail(function() {
                                            $dfd.reject('token-error');
                                        });
                                    }, IMGUR_RETRY_DELAY);
                                } else if (response && response.access_token) {
                                    imgur_access_token = response.access_token;
                                    imgur_refresh_token = response.refresh_token;
                                    return self.uploadImage(dataURI, retry, $dfd);
                                } else {
                                    $dfd.reject('token-error');
                                }
                            }).fail(function() {
                                $dfd.reject('token-error');
                            });
                    }

                } else if (result.status === 504) {
                    // handle timeouts gracefully
                    self.UtilsClass.log('error', 'Gateway time out');
                    $dfd.resolve({
                        data: {}
                    });
                }
            });
            return $dfd;
        },

        logShowButton: function(user, retailer) {
            return _rest({
                endpoint: config.server.endPoints.analytics.showButton,
                data: {
                    uid: user.UID,
                    retailerName: retailer.PSource
                },
                method: 'POST'
            });
        },

        fixThumbnailURL: function(url) {
            if (!url || url.indexOf('?') < 0) {
                return url;
            }
            return url.split('?')[0];
        },

        uploadImageConditional: function(img) {
            var $uploadDataURLPromise;
            var self = this;
            var strippedImg;
            if (img && img.startsWith('data:image')) {
                if (img.startsWith('data:image/jpeg') ||
                    img.startsWith('data:image/png')) {
                    return this.uploadImage(img);
                } else {
                    $uploadDataURLPromise = $.Deferred();
                    this.getDataURI(img, function(imgDataURI) {
                        self
                            .uploadImage(imgDataURI)
                            .done(function(result) {
                                $uploadDataURLPromise.resolve(result);
                            })
                            .fail(function(err) {
                                $uploadDataURLPromise.reject(err);
                            });
                    });
                    return $uploadDataURLPromise.promise();
                }
            } else {
                $uploadDataURLPromise = $.Deferred();
                /************************Prev Version Start ****************************/
                // // strip URL of query params
                // strippedImg = this.fixThumbnailURL(img);
                // // check if new URL works
                // this.checkImageLoad(strippedImg, function(imageLoadSuccess) {
                //     if (imageLoadSuccess) {
                //         // if yes, upload as is
                //         $uploadDataURLPromise.resolve(strippedImg);
                //     } else {
                //         // if no, upload to imgur and return URL
                //         self.getDataURI(img, function(imgDataURI) {
                //             self
                //                 .uploadImage(imgDataURI)
                //                 .done(function(result) {
                //                     $uploadDataURLPromise.resolve(result);
                //                 })
                //                 .fail(function(err) {
                //                     $uploadDataURLPromise.reject(err);
                //                 });
                //         });
                //     }
                // });
                /************************Prev Version End ****************************/

                /************************New Version Start ****************************/
                self.getDataURI(img, function(imgDataURI) {
                    self
                        .uploadImage(imgDataURI)
                        .done(function(result) {
                            $uploadDataURLPromise.resolve(result);
                        })
                        .fail(function(err) {
                            $uploadDataURLPromise.reject(err);
                        });
                });
                /************************New Version End ****************************/
                
                return $uploadDataURLPromise.promise();
            }

        }
    };
}());