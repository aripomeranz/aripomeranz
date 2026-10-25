(function () {
  'use strict';
  const E = window.BridgitEngine;
  const root = document.getElementById('ticket-game');
  if (!E || !root) return;
  const $ = id => document.getElementById('tg-' + id);
  const key = 'ari-bridgit-tickets-v1';
  let mode = 'paper', draft = E.defaultLines.slice(), palette = E.colors.slice(), game;
  const colorNames = ['Green','Red','Slate','Purple','Amber','Teal','Rose','Olive','Blue','Brown','Grey','Sand','Plum'];
  function lineName(id) {
    if (mode === 'classic') return 'Edge ' + (id + 1);
    if (mode === 'paper' && id > 1) return 'Edge ' + (game.assignments.indexOf(id) + 1);
    return colorNames[id];
  }
  function lineColor(id) { return mode === 'classic' || (mode === 'paper' && id > 1) ? '#46584e' : palette[id]; }
  function save() {
    try { localStorage.setItem(key, JSON.stringify({ mode, assignments: game.assignments, first: game.first, palette, history: game.status().history })); } catch (_) { /* Storage is optional. */ }
  }
  function fresh() {
    const assignments = mode === 'classic' ? E.edges.slice(0,13).map((_,i) => i) : mode === 'paper' ? E.defaultLines : draft;
    game = E.makeGame(assignments, $('first').value);
    render(); save();
  }
  function purchase(line) {
    if (!game.move(line)) return;
    render(); save();
    $('map').classList.remove('tg-buy-flash');
    void $('map').offsetWidth;
    $('map').classList.add('tg-buy-flash');
  }
  function element(tag, attributes, text) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([k,v]) => n.setAttribute(k,v));
    if (text !== undefined) n.textContent = text;
    return n;
  }
  const labelPositions = [[137,145],[140,211],[132,310],[313,86],[313,211],[313,375],
    [246,164],[246,296],[426,164],[426,296],[488,146],[485,211],[492,311]];
  function renderMap(state) {
    const svg = $('map');
    // Rebuild the map with its accessible title and description.
    svg.replaceChildren(element('title',{id:'tg-map-title'},'Bridg-It metro map'),
      element('desc',{id:'tg-map-description'},'Thirteen playable connections between eight stations. Click any connection to buy a ticket for its line; no particular edge is claimed.'));
    svg.appendChild(element('path',{d:'M 70 225 C 118 -18, 522 -18, 570 225',fill:'none',stroke:'#b18a4e','stroke-width':3,'stroke-dasharray':'7 8'}));
    svg.appendChild(element('text',{x:320,y:26,'text-anchor':'middle',class:'tg-map-reserved'},'e₁₄ · reserved connection'));
    E.edges.slice(0,13).forEach(([a,b],i) => {
      const line = game.mapping[i], id = game.ids[line], color = lineColor(id);
      const group = element('g',{class:'tg-edge'});
      group.appendChild(element('title',{},'Edge '+(i+1)+' · '+lineName(id)+' · '+state.remaining[line]+' tickets left'));
      group.appendChild(element('line',{x1:E.vertices[a].x,y1:E.vertices[a].y,x2:E.vertices[b].x,y2:E.vertices[b].y,stroke:'transparent','stroke-width':23}));
      group.appendChild(element('line',{class:'tg-track',x1:E.vertices[a].x,y1:E.vertices[a].y,x2:E.vertices[b].x,y2:E.vertices[b].y,stroke:color,'stroke-width':6,'stroke-linecap':'round',opacity:state.remaining[line] ? 1 : .28}));
      const [x,y] = labelPositions[i];
      group.appendChild(element('text',{x,y,class:'tg-edge-label'},'e'+String(i+1).replace(/\d/g,d=>'₀₁₂₃₄₅₆₇₈₉'[d])));
      if (!state.winner && state.remaining[line]) group.addEventListener('click',()=>purchase(line));
      svg.appendChild(group);
    });
    E.vertices.forEach(v=>{
      svg.appendChild(element('circle',{cx:v.x,cy:v.y,r:v.label ? 25 : 6,class:v.label ? 'tg-terminal' : 'tg-station'}));
      if(v.label) svg.appendChild(element('text',{x:v.x,y:v.y+8,'text-anchor':'middle',class:'tg-station-label'},v.label));
    });
  }
  function render() {
    const state = game.status(), total = state.remaining.reduce((a,b)=>a+b,0);
    $('network-name').textContent = {paper:'Paper example',classic:'Individual edges',custom:'Your custom network'}[mode];
    $('remaining').textContent = total + (total === 1 ? ' ticket left' : ' tickets left');
    $('status').replaceChildren();
    const strong = document.createElement('strong');
    strong.textContent = state.winner ? state.winner + ' wins!' : state.turn + ' to the ticket desk';
    $('status').appendChild(strong);
    const message = document.createElement('span');
    message.textContent = state.winner ? (state.winner === 'Join' ? 'Connection secured. All aboard!' : 'Service interrupted. Cut has the win.') : 'Buy one ticket for any available line.';
    $('status').appendChild(message);
    if (state.winner) {
      const certificate = game.winningTickets();
      const small = document.createElement('small');
      small.textContent = 'Winning tickets: ' + certificate.map((v,i)=>v ? v+' × '+lineName(game.ids[i]) : '').filter(Boolean).join(', ') + ', together with the reserved connection.';
      $('status').appendChild(small);
    }
    ['Join','Cut'].forEach(player=>{
      const hand = $(player.toLowerCase()+'-hand'); hand.replaceChildren();
      $(player.toLowerCase()+'-count').textContent = state.hands[player].reduce((a,b)=>a+b,0);
      state.hands[player].slice(0,game.target).forEach((count,i)=>{
        for(let k=0;k<count;k++) {
          const ticket = document.createElement('span'); ticket.className='tg-mini-ticket';
          ticket.style.setProperty('--line',lineColor(game.ids[i])); ticket.textContent=lineName(game.ids[i]);
          hand.appendChild(ticket);
        }
      });
      if(!hand.childNodes.length) hand.textContent='No tickets yet.';
    });
    $('undo').disabled = !state.history.length;
    $('tickets').replaceChildren();
    game.ids.forEach((id,i)=>{
      const button=document.createElement('button');button.type='button';button.className='tg-ticket';
      button.style.setProperty('--line',lineColor(id));button.disabled=!!state.winner||!state.remaining[i];
      button.setAttribute('aria-label','Buy '+lineName(id)+' ticket, '+state.remaining[i]+' of '+game.capacity[i]+' remaining');
      const title=document.createElement('strong');title.textContent=lineName(id);
      const kind=document.createElement('small');kind.textContent='ONE LINE · ONE TURN';
      const stock=document.createElement('span');stock.className='tg-ticket-stock';stock.textContent=state.remaining[i]+' of '+game.capacity[i]+' left';
      const stamp=document.createElement('span');stamp.className='tg-stamp';stamp.textContent=state.remaining[i]?'ADMIT ONE':'SOLD OUT';
      button.append(kind,title,stock,stamp);button.addEventListener('click',()=>purchase(i));$('tickets').appendChild(button);
    });
    $('history').replaceChildren();
    if(!state.history.length){const li=document.createElement('li');li.textContent='The ticket desk is open. Make the first purchase.';$('history').appendChild(li);}
    state.history.forEach(m=>{const li=document.createElement('li');li.textContent=m.player+' bought '+lineName(game.ids[m.line])+'.';$('history').appendChild(li);});
    renderMap(state);
  }
  function renderCustom() {
    $('assignments').replaceChildren();
    draft.forEach((line,i)=>{
      const label=document.createElement('label');label.textContent='e'+(i+1);
      const select=document.createElement('select');select.setAttribute('aria-label','Line for edge '+(i+1));
      colorNames.forEach((name,id)=>{const option=document.createElement('option');option.value=id;option.textContent=name;option.selected=id===line;select.appendChild(option);});
      select.addEventListener('change',()=>{draft[i]=Number(select.value);renderColorPickers();});label.appendChild(select);$('assignments').appendChild(label);
    });renderColorPickers();
  }
  function renderColorPickers() {
    $('colors').replaceChildren();
    [...new Set(draft)].sort((a,b)=>a-b).forEach(id=>{
      const label=document.createElement('label');label.textContent=colorNames[id];
      const input=document.createElement('input');input.type='color';input.value=palette[id];input.setAttribute('aria-label',colorNames[id]+' line color');
      input.addEventListener('input',()=>{palette[id]=input.value;});label.appendChild(input);$('colors').appendChild(label);
    });
  }
  root.querySelectorAll('input[name=tg-mode]').forEach(input=>input.addEventListener('change',()=>{
    if(input.value==='custom'){
      draft=game.assignments.slice();$('custom').hidden=false;$('custom').open=true;renderCustom();
    } else { mode=input.value;if(mode==='paper')palette=E.colors.slice();$('custom').hidden=true;fresh(); }
  }));
  $('apply').addEventListener('click',()=>{mode='custom';fresh();$('custom').open=false;});
  $('new').addEventListener('click',()=>{
    const chosen=root.querySelector('input[name=tg-mode]:checked').value;
    mode=chosen;if(mode==='paper')palette=E.colors.slice();fresh();
  });
  $('undo').addEventListener('click',()=>{game.undo();render();save();});
  let restored=false;
  try {
    const data=JSON.parse(localStorage.getItem(key));
    if(data&&['paper','classic','custom'].includes(data.mode)&&Array.isArray(data.history)&&data.history.length<=13){
      const loaded=E.makeGame(data.assignments,data.first);
      for(const move of data.history){if(move.player!==loaded.status().turn||!loaded.move(move.line))throw new Error('Invalid saved game.');}
      if(Array.isArray(data.palette)&&data.palette.length===13&&data.palette.every(c=>/^#[0-9a-f]{6}$/i.test(c)))palette=data.palette;
      game=loaded;mode=data.mode;draft=game.assignments.slice();$('first').value=game.first;
      root.querySelector('input[value='+mode+']').checked=true;restored=true;
      if(mode==='custom'){$('custom').hidden=false;renderCustom();}
      render();
    }
  }catch(_){/* Start a fresh game if the saved state is missing or invalid. */}
  if(!restored)fresh();
})();
