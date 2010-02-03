/**
 * Copyright 2009 Google Inc.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import("funhtml.*");
import("stringutils.startsWith");

import("etherpad.utils.*");
import("etherpad.globals.*");
import("etherpad.log");
import("etherpad.pne.pne_utils");
import("etherpad.pro.pro_accounts");
import("etherpad.pro.pro_accounts.getSessionProAccount");
import("etherpad.pro.domains");
import("etherpad.pro.pro_quotas");
import("etherpad.sessions");
import("etherpad.sessions.getSession");

import("etherpad.control.pro.pro_main_control");

jimport("java.lang.System.out.println");

function _stripComet(x) {
  if (x.indexOf('.comet.') > 0) {
    x = x.split('.comet.')[1];
  }
  return x;
}

function getProRequestSubdomain() {
  var d = _stripComet(request.domain);
  return d.split('.')[0];
}

function getRequestSuperdomain() {
  var SUPERDOMAINS = get_superdomains();
  var parts = request.domain.split('.');
  /* Loop through the domain until a superdomain is found. */
  while (parts.length > 0) {
    var domain = parts.join('.');
    if (SUPERDOMAINS[domain]) {
      return domain;
    }
    parts.shift(); // remove next level
  }
}

function isProDomainRequest() {
  // the result of this function never changes within the same request.
  var c = appjet.requestCache;
  if (c.isProDomainRequest === undefined) {
    c.isProDomainRequest = _computeIsProDomainRequest();
  }
  return c.isProDomainRequest;
}

function _computeIsProDomainRequest() {
  if (pne_utils.isPNE()) {
    return true;
  }

  var domain = _stripComet(request.domain);

  var SUPERDOMAINS = get_superdomains();
  if (SUPERDOMAINS[domain]) {
    return false;
  }

  var requestSuperdomain = getRequestSuperdomain();

  if (SUPERDOMAINS[requestSuperdomain]) {
    // now see if this subdomain is actually in our database.
    if (domains.getRequestDomainRecord()) {
      return true;
    } else {
      return false;
    }
  }

  return false;
}

function preDispatchAccountCheck() {
  // if account is not logged in, redirect to /ep/account/login
  //
  // if it's PNE and there is no admin account, allow them to create an admin
  // account.

  if (pro_main_control.isActivationAllowed()) {
    return;
  }

  if (!pro_accounts.doesAdminExist()) {
    if (request.path != '/ep/account/create-admin-account') {
      // should only happen for eepnet installs
      response.redirect('/ep/account/create-admin-account');
    }
  } else {
    pro_accounts.requireAccount();
  }

  pro_quotas.perRequestBillingCheck();
}

function renderFramedMessage(m) {
  renderFramedHtml(
      DIV(
        {style: "font-size: 2em; padding: 2em; margin: 4em; border: 1px solid #ccc; background: #e6e6e6;"},
        m));
}

function getFullProDomain() {
  // TODO: have a special config param for this? --etherpad.canonicalDomain
  return request.domain;
}

// domain, including port if necessary
function getFullProHost() {
  var h = getFullProDomain();
  var parts = request.host.split(':');
  if (parts.length > 1) {
    h += (':' + parts[1]);
  }
  return h;
}

function getFullSuperdomainHost() {
  if (isProDomainRequest()) {
    var h = getRequestSuperdomain()
    var parts = request.host.split(':');
    if (parts.length > 1) {
      h += (':' + parts[1]);
    }
    return h;
  } else {
    return request.host;
  }
}

function getEmailFromAddr() {
  var fromDomain = appjet.config['fromDomain'];
  if (pne_utils.isPNE()) {
    fromDomain = getFullProDomain();
  }
  return ('"EtherPad" <noreply@'+fromDomain+'>');
}

function renderGlobalProNotice() {
  if (request.cache.globalProNotice) {
    return DIV({className: 'global-pro-notice'}, 
      request.cache.globalProNotice);
  } else {
    return "";
  }
}

