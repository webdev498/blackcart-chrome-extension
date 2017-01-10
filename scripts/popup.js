$(function() {
  'use strict';
  // vars
  var config = window.BLACKCART_CONFIG;
  // var globals = Blackcart.globals;
  // var utils = Blackcart.utils;
  var Brands = Blackcart.views.Brands;
  var $brandsContainer = $('.blackcart-brands-container');
  var brandsView;
  var $errEl = $('.blackcart-auth-failure');
  var $loginButton = $('.btn-cmlogin');
  var $loginProcess = $('.login-process');

  // function defs
  function showStatus() {
    var $status = $('.blackcart-status');
    chrome.runtime.sendMessage({
      evt: 'blackcart-is-tab-active'
    }, function(resp) {
      $status[resp.status ? 'removeClass' : 'addClass']('hidden');
    });
    // return this;
  }

  showStatus();
  brandsView = new Brands({
    el: $brandsContainer
  });

  chrome.storage.sync.get({
    UID: '',
    UserName: '',
    UName: ''
  }, function(res) {
    $('.blackcart-popup-container .loading').addClass('hidden');
    if (!res.UID) {
      $('#blackcart-signin-form').removeClass('hidden');
    } else {
      $('.logged-in-user').removeClass('hidden');
    }
  });

  $('#blackcart-signin-form').on('submit', function(e) {
    e.preventDefault();
    $errEl.addClass('hidden');
    $loginButton.attr('disabled', 'disabled');
    $loginProcess.removeClass('hidden');
    $.ajax({
      url: config.server.baseURL + config.server.endPoints.auth,
      type: 'POST',
      data: JSON.stringify({
        email: $('#email').val(),
        password: $('#password').val()
      }),
      dataType: 'json',
      cache: false,
      contentType: 'application/json',
      processData: false
    }).done(function(resp) {
      $loginButton.removeAttr('disabled');
      $loginProcess.addClass('hidden');
      chrome.storage.sync.set({
        UID: resp.UID,
        UEmailID: resp.UEmailID,
        UName: resp.UName
      }, function() {
        $('#blackcart-signin-form').addClass('hidden');
        $('.logged-in-user').removeClass('hidden');
        chrome.runtime.sendMessage({
          evt: 'blackcart-login-success'
        });
        window.close();
      });
    }).fail(function(err) {
      $loginButton.removeAttr('disabled');
      $loginProcess.addClass('hidden');
      // $dfd.reject(err);
      if (err.status === 403) {
        $errEl.text('Please check your email/password.').removeClass('hidden');
      } else {
        $errEl.text('Error connecting to the server.').removeClass('hidden');
      }
      console.log(err);
    });
  });

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.evt === 'blackcart-external-login') {
      $('#blackcart-signin-form').addClass('hidden');
      $('.logged-in-user').removeClass('hidden');
      window.close();
    }
  });
  $('#open-cart').on('click', function() {
    chrome.tabs.query({
        currentWindow: true,
        active: true
      },
      function(tabs) {
        var tab = tabs[0];
        chrome.tabs.sendMessage(tab.id, {
          evt: 'blackcart-click'
        }, function(resp) {
          if (resp.farewell === 'blackcart-click:OK') {
            window.close();
          }
        });
      }
    );
  });

  $('.blackcart-brands-link').on('click', function(e) {
    e.preventDefault();
    brandsView.toggle();
  });
});