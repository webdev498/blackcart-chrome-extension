/* globals $, chrome*/
(function() {
  'use strict';
  // vars
  var manifest = chrome.runtime.getManifest();
  var version = manifest.version;
  // var globals = window.Blackcart.globals;
  var utils = window.Blackcart.utils;
  var config = window.BLACKCART_CONFIG;
  // function defs
  function setIconActive(tabId) {
    chrome.browserAction.setIcon({
      'path': {
        '128': 'images/icon-128-active.png'
      },
      tabId: tabId
    });
  }

  /*function setIconInactive(tabId) {
    chrome.browserAction.setIcon({
      'path': {
        '16': 'images/icon-16.png',
        '128': 'images/icon-128.png'
      },
      tabId: tabId
    });
  }*/

  function getActiveTabStatus(cb) {
    /* callback nightmare */
    chrome.tabs.query({
      active: true
    }, function(tabs) {
      var err = null;
      var tab;
      if (!tabs || !tabs.length) {
        err = 'Could not retrieve tab.';
        return cb(err);
      }
      tab = tabs[0];
      chrome.tabs.sendMessage(tab.id, {
        evt: 'blackcart-is-tab-active'
      }, function(resp) {
        if (!resp || !resp.status) {
          cb(err, false, tab.id);
        } else {
          cb(err, true, tab.id);
        }
      });
    });
  }

  function broadcastToTabs(message, ignoreThisTab) {
    ignoreThisTab = ignoreThisTab || {};
    chrome.tabs.query({}, function(tabs) {
      for (var i = 0; i < tabs.length; ++i) {
        if (tabs[i].id === ignoreThisTab.id) {
          continue;
        }
        chrome.tabs.sendMessage(tabs[i].id, message);
      }
    });
  }

  function _translate(retailer) {
    var obj = {};
    obj.thumbnail = retailer.BThumbnail;
    obj.PSource = retailer.BTitle;
    obj.url = retailer.URL;
    return obj;
  }

  function _mergeRetailers(local, remote) {
    var finalRetailers = [];
    $.each(remote, function() {
      var remoteRetailer;
      var localRetailer;
      if (this.Active) {
        remoteRetailer = _translate(this);
        localRetailer = $.grep(local, function(listObj) {
          return listObj.PSource === remoteRetailer.PSource;
        });
        if (!localRetailer.length) {
          // $.extend to create a copy of remoteRetailer; in case there is a need to mutate
          // the localRetailer copy
          localRetailer = $.extend(true, {}, remoteRetailer);
        } else {
          localRetailer = localRetailer[0];
          localRetailer = $.extend(true, localRetailer, remoteRetailer);
        }
        finalRetailers.push(localRetailer);
      }
    });
    return {
      'retailers': finalRetailers
    };
  }

  var Background = function Background() {
    this._bindEvents();
    this.$config = this.getConfig();
    this.config = null;
    this.configError = null;
    this.$config.done(function(response) {
      getActiveTabStatus(function(err, status, activeTabID) {
        if (err) {
          return true;
        }
        if (activeTabID && status) {
          setIconActive(activeTabID);
        }
      });
    });

  };
  Background.prototype = $.extend(Background.prototype, utils.UtilsClass, {
    retailersConfigURL: 'config/retailers.json',
    _bindEvents: function() {
      var self = this;
      chrome.runtime.onInstalled.addListener(function(details) {
        console.log('previousVersion', details.previousVersion);
      });

      chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        var imgURL;
        var image;
        var tab = sender.tab;

        // requests coming from the popup do not have a tab
        if (request.evt === 'blackcart-is-tab-active') {
          getActiveTabStatus(function(err, status) {
            if (err) {
              sendResponse({
                status: false
              });
              console.error(err);
            } else {
              sendResponse({
                status: status
              });
            }
          });
          return true;
        }

        if (request.evt === 'blackcart-login-success') {
          self._onLoginSuccess();
          sendResponse({
            evt: 'blackcart-login-success:OK'
          });
          return true;
        }

        if (!tab) {
          return false;
        }

        if (request.evt === 'blackcart-site-supported') {
          setIconActive(tab.id);
          sendResponse({
            evt: 'blackcart-site-supported:OK'
          });
          return true;
        }

        if (request.evt === 'blackcart-get-config') {
          if (self.config) {
            sendResponse({
              status: 'OK',
              config: self.config
            });
            return true;
          }
          if (self.configError) {
            sendResponse({
              status: 'ERR',
              err: self.configError
            });
            return true;
          }

          self.$config.done(function() {
            self.config = Array.prototype.slice.call(arguments);
            self.configError = null;
            sendResponse({
              status: 'OK',
              config: self.config
            });
          }).fail(function(err) {
            self.config = null;
            self.configError = err;
            sendResponse({
              status: 'ERR',
              err: self.configError
            });
          });
          return true;
        }

        if (request.evt === 'capture-tab') {
          chrome.tabs.captureVisibleTab(function(dataURL) {
            sendResponse({
              dataURL: dataURL
            });
          });
          return true;
        }

        if (request.evt === 'get-dataurl') {
          imgURL = request.imgURL;
          image = new Image();
          image.onload = function() {
            var canvas = document.createElement('canvas');
            canvas.width = this.naturalWidth;
            canvas.height = this.naturalHeight;

            canvas.getContext('2d').drawImage(this, 0, 0);
            sendResponse({
              dataURL: canvas.toDataURL()
            });
          };
          image.onerror = function() {
            console.trace('Image load failed for ' + this.src);
            sendResponse({
              resp: 'get-dataurl:err'
            });
          };
          image.src = imgURL;
          return true;
        }

        if (request.evt === 'check-image-load') {
          imgURL = request.imgURL;
          image = new Image();
          image.onload = function() {
            sendResponse({
              resp: 'check-image-load:ok'
            });
          };
          image.onerror = function() {
            sendResponse({
              resp: 'check-image-load:err'
            });
          };
          image.src = imgURL;
          return true;
        }

        // receive and relay messages
        /*if ([
            'blackcart-order-changed',
            'blackcart-order-submit-started',
            'blackcart-order-submit-done'
          ].indexOf(request.evt) >= 0) {
          broadcastToTabs({
            evt: request.evt
          }, sender.tab || '');
          return true;
        }*/

        /*if (request.evt === 'blackcart-user-logged-in') {
          chrome.storage.sync.set({
            UID: request.user.UID,
            UEmailID: request.user.UEmailID,
            UName: request.user.UName
          }, function(res) {
            // sendResponse({
            //   response: 'blackcart-user-logged-in:OK'
            // });
            // Broadcast to all tabs that user has logged in. Allows re-injection
            chrome.tabs.query({}, function(tabs) {
              var message = {
                evt: 'blackcart-user-logged-in'
              };
              for (var i = 0; i < tabs.length; ++i) {
                chrome.tabs.sendMessage(tabs[i].id, message);
              }
            });
            chrome.browserAction.setPopup({
              popup: ''
            });
            addClickHandler();
          });
          return true;
        }*/
      });

      chrome.tabs.onActivated.addListener(function(tab) {
        chrome.tabs.sendMessage(tab.tabId, {
          evt: 'blackcart-update-collection'
        });
      });

      chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse) {
        if (request && request.message) {
          if (request.message === 'blackcart-version') {
            sendResponse({
              version: version
            });
          } else if (request.message === 'blackcart-login-user-external') {
            self
              ._getUserFromUID(request.uid)
              .done(function(resp) {
                chrome.storage.sync.get({
                  UID: '',
                  UserName: '',
                  UName: ''
                }, function(user) {
                  if (user.UID !== resp.UID) {
                    chrome.storage.sync.set({
                      UID: resp.UID,
                      UEmailID: resp.UEmailID,
                      UName: resp.UName
                    }, function() {
                      chrome.runtime.sendMessage({
                        evt: 'blackcart-external-login'
                      });
                      self._onLoginSuccess();
                    });
                  }
                });

              });
          }
        }

        return true;
      });
    },

    getConfig: function() {
      return $.when(this._getRetailers(), this._getOptions(), this._getUser(), this._getTokens());
    },

    _getBrands: function() {
      return this.rest({
        endpoint: config.server.endPoints.getBrands,
        method: 'GET'
      });
    },

    _getRetailers: function() {
      var $dfd = $.Deferred();
      $.when($.getJSON(this.getChromeURL(this.retailersConfigURL)), this._getBrands())
        .then(function(retailers, brands) {
          $dfd.resolve({
            retailersList: _mergeRetailers(retailers[0].retailers, brands[0]),
            brands: brands[0]
          });
        }, function(err) {
          $dfd.reject(err);
        });
      return $dfd;
    },

    _getOptions: function() {
      var $dfd = $.Deferred();
      $dfd.resolve([]);
      return $dfd;
    },

    _getTokens: function() {
      return utils.getImgurToken();
    },

    _getUser: function() {
      var $dfd = $.Deferred();
      chrome.storage.sync.get({
        UID: '',
        UserName: '',
        UName: ''
      }, function(res) {
        if (!res.UID) {
          $dfd.reject('user-error');
          console.error('Please log in first.');
          return;
        }
        $dfd.resolve(res);
      });
      return $dfd;
    },

    _getUserFromUID: function(uid) {
      return $.ajax({
        url: config.server.baseURL + config.server.endPoints.getUserByID + uid,
        type: 'GET',
        dataType: 'json',
        cache: false,
        contentType: 'application/json',
        processData: false
      });
    },

    _onLoginSuccess: function() {
      var self = this;
      this.$config = this.getConfig();
      this.config = null;
      this.configError = null;
      broadcastToTabs({
        evt: 'blackcart-user-logged-in'
      });

      // redirect active tab to post login page
      chrome.tabs.query({
        active: true
      }, function(tabs) {
        var err = null;
        var tab;
        if (!tabs || !tabs.length) {
          err = 'Could not retrieve tab.';
          console.error(err);
          return;
        }
        tab = tabs[0];
        chrome.tabs.sendMessage(tab.id, {
          evt: 'blackcart-redirect-page'
        }, function() {
          setTimeout(function() {
            chrome.storage.sync.set({
              showSpinAnimation: true
            });
          }, 500);
        });
      });
    }
  });

  return new Background();
}());