


/*
  Include the DID Headers in all requests
    DID-Support:
      0 = no support for DID-related features
      1 = browser supports DID-related features
    Did-User: the user owns one or more DIDs
*/

EXT.ready.then(() => {
  console.log(3)
  function modifyHeader(e) {
    e.requestHeaders['DID-Support'] = 1;
    e.requestHeaders['DID-User'] = !!User.didCount;
    return {requestHeaders: e.requestHeaders};
  }

  browser.webRequest.onBeforeSendHeaders.addListener(
    modifyHeader,
    {
      urls: ["<all_urls>"]
    },
    ["blocking", "requestHeaders"]
  );

  browser.runtime.onMessage.addListener(function(msg, sender){
    switch(msg.type) {
      case 'reload': browser.runtime.reload(); break;
      case 'hub_protocol_handler':
        browser.tabs.update(sender.tab.id, {
          url: browser.extension.getURL('views/profile/profile.html?url=') + msg.url
        }).then(val => {
          console.log(val);
        }).catch(e => console.log(e));
        break;
    }
    return true;
  });


  // browser.tabs.onCreated.addListener((tab) => {
  //   console.log(tab.id);
  //   browser.tabs.executeScript(tab.id, {code:'alert(1)'});
  // });

  // browser.webRequest.onBeforeSendHeaders.addListener(
  //   handleRequests,
  //   {
  //     urls: ["<all_urls>"]
  //   },
  //   ["blocking", "requestBody"]
  // );


  /*** Popup Handling ***/

  // browser.browserAction.onClicked.addListener(tab => {
  //   // disable the active tab
  //   browser.browserAction.disable(tab.id);
  //   // requires the "tabs" or "activeTab" permission
  //   console.log(tab.url);
  // });

});