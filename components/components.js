

(function(){


xtag.create('x-views', class extends XTagElement {
  set 'view::attr' (id){
    Array.from(this.children).forEach(view => view.removeAttribute('view-active'));
    var select = this.querySelector('#'+ id);
    if (select) {
      select.setAttribute('view-active', '');
      xtag.fireEvent(select, 'viewchange', { detail: id });
    }
  }
});

function selectMenuItem(menu, item){
  Array.from(menu.children).forEach(z => z.removeAttribute('selected'));
  item.setAttribute('selected', '');
  var view = item.getAttribute('view');
  var views = document.getElementById(menu.getAttribute('for'));
  if (view && views) views.view = view;
}

xtag.create('x-view-menu', class extends XTagElement {
  constructor (){
    super();
    var selected = this.querySelector('x-view-menu [selected]');
    if (selected) selectMenuItem(this, selected);
  }
  'click::event:delegate(x-view-menu > [view])'(event){
    selectMenuItem(event.currentTarget, this);
  }
});

xtag.create('x-modal', class extends XTagElement {
  set 'active::attr(boolean)' (val){
    if (val) {
      this.show();
      xtag.fireEvent(this, 'modalshow');
    }
    else {
      xtag.fireEvent(this, 'modalhide');
      this.hide();
    }
  }
  show (){
    this.active = true;
  }
  hide (){
    this.active = false;
  }
  'click::event' (e){
    if (e.target === this && String(this.getAttribute('hide')).includes('outertap')) {
      this.hide();
    }
  }
});


xtag.create('x-notifier', class extends XTagElement {
  set 'unread::attr' (val){
    
  }
  show (title, obj = {}){
    var notice = document.createElement('figure');
    if (obj.duration !== false) notice.setAttribute('duration', obj.duration || 3000);
    if (obj.hide) notice.setAttribute('hide', obj.hide);
    notice.innerHTML = `<header>${title}</header><p>${obj.body || ''}</p>`;
    this.appendChild(notice);
    requestAnimationFrame(() => requestAnimationFrame(() => notice.setAttribute('showing', '')));
  }
  hide (notice, when){
    if (notice.hasAttribute('showing')) {
      if (notice.dataset.timeout) clearTimeout(notice.dataset.timeout);
      notice.dataset.timeout = setTimeout(() => notice.removeAttribute('showing'), Number(when || 0));
    }
    else if (notice.parentNode) notice.parentNode.removeChild(notice);
  }
  'transitionend::event:delegate(x-notifier > figure)' (e){
    e.currentTarget.hide(this, this.getAttribute('duration'));
  }
  'click::event:delegate(x-notifier > figure[hide~="tap"])' (e){
    e.currentTarget.hide(this);
  }
});

})();