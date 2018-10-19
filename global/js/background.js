
EXT.ready.then(() => {

  /*
  Include the DID Headers in all requests
    DID-Support:
      0 = no support for DID-related features
      1 = browser supports DID-related features
    Did-User: the user owns one or more DIDs
*/


  async function modifyHeader(e) {
    e.requestHeaders['DID-Support'] = 1;
    e.requestHeaders['DID-User'] = (await DIDManager.count()) > 0 ? 1 : 0;
    return {requestHeaders: e.requestHeaders};
  }

  browser.webRequest.onBeforeSendHeaders.addListener(
    modifyHeader,
    { urls: ['<all_urls>'] },
    ['blocking', 'requestHeaders']
  );

  browser.browserAction.onClicked.addListener(function(){
    browser.tabs.create({ index: 0, url: browser.extension.getURL('views/dashboard/dashboard.html') });
  });

});