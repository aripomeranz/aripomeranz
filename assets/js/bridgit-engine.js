(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BridgitEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Vertices and edges agree with the TikZ board in the paper.
  const vertices = [
    { x: 70, y: 225, label: 's' }, { x: 230, y: 100 },
    { x: 230, y: 225 }, { x: 230, y: 350 }, { x: 410, y: 100 },
    { x: 410, y: 225 }, { x: 410, y: 350 }, { x: 570, y: 225, label: 't' }
  ];
  const edges = [
    [0,1], [0,2], [0,3], [1,4], [2,5], [3,6], [1,2],
    [2,3], [4,5], [5,6], [4,7], [5,7], [6,7], [0,7]
  ];
  const defaultLines = [2,3,0,4,5,0,6,7,8,9,10,1,1];
  const colors = ['#16865a','#cf4a45','#52637b','#7954a1','#bd7420',
    '#007d91','#ad4d85','#657532','#4d6dc4','#956335','#68798b','#75634e','#8c5b79'];
  function forest(mask) {
    const parent = vertices.map((_, i) => i);
    const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    for (let i = 0; i < edges.length; i++) if (mask & (1 << i)) {
      const a = find(edges[i][0]), b = find(edges[i][1]);
      if (a === b) return false;
      parent[a] = b;
    }
    return true;
  }
  const forests = [];
  for (let mask = 0; mask < (1 << edges.length); mask++) if (forest(mask)) {
    let size = 0;
    for (let bits = mask; bits; bits &= bits - 1) size++;
    forests.push({ mask, size });
  }
  forests.sort((a,b) => b.size-a.size);
  function makeGame(assignments, first = 'Join') {
    if (!Array.isArray(assignments) || assignments.length !== 13 ||
        !assignments.every(x => Number.isInteger(x) && x >= 0 && x < 13)) throw new Error('Invalid line assignments.');
    if (!['Join','Cut'].includes(first)) throw new Error('Invalid first player.');
    const ids = [...new Set(assignments)].sort((a,b) => a-b);
    const mapping = assignments.map(id => ids.indexOf(id));
    const target = ids.length;
    const capacity = ids.map(id => assignments.filter(x => x === id).length).concat(1);
    const typedForests = forests.map(f => {
      const type = capacity.map(() => 0);
      for (let i = 0; i < 14; i++) if (f.mask & (1 << i)) type[i === 13 ? target : mapping[i]]++;
      return { ...f, type };
    });
    const cache = new Map();
    function rank(bounds) {
      const key = bounds.join(',');
      if (cache.has(key)) return cache.get(key);
      for (const f of typedForests) if (f.type.every((v,i) => v <= bounds[i])) {
        cache.set(key, f.size); return f.size;
      }
      throw new Error('Rank bounds must be nonnegative.');
    }
    function dualRank(bounds) {
      return bounds.reduce((a,b) => a+b, 0) - 7 + rank(capacity.map((v,i) => v-bounds[i]));
    }
    const history = [];
    function status() {
      const hands = { Join: capacity.map(() => 0), Cut: capacity.map(() => 0) };
      history.forEach(move => hands[move.player][move.line]++);
      const remaining = capacity.map((v,i) => i === target ? 0 : v-hands.Join[i]-hands.Cut[i]);
      const joinPlus = hands.Join.slice(); joinPlus[target] = 1;
      const cutPlus = hands.Cut.slice(); cutPlus[target] = 1;
      const joinWins = rank(joinPlus) === rank(hands.Join);
      const cutWins = dualRank(cutPlus) === dualRank(hands.Cut);
      if (joinWins && cutWins) throw new Error('Both players cannot win.');
      const winner = joinWins ? 'Join' : cutWins ? 'Cut' : null;
      const turn = history.length % 2 ? (first === 'Join' ? 'Cut' : 'Join') : first;
      return { hands, remaining, winner, turn, history: history.slice() };
    }
    function move(line) {
      const state = status();
      if (state.winner || !Number.isInteger(line) || line < 0 || line >= target || !state.remaining[line]) return false;
      history.push({ player: state.turn, line }); return true;
    }
    function winningTickets() {
      const state = status();
      if (!state.winner) return null;
      const r = state.winner === 'Join' ? rank : dualRank;
      const type = capacity.map(() => 0);
      // First take an independent subhand of the same rank. This ensures
      // that the minimal dependency we extract uses the reserved edge.
      for (let i = 0; i < target; i++) for (let k = 0; k < state.hands[state.winner][i]; k++) {
        type[i]++;
        if (r(type) < type.reduce((a,b) => a+b, 0)) { type[i]--; break; }
      }
      type[target] = 1;
      for (let i = 0; i < target; i++) while (type[i]) {
        type[i]--;
        if (r(type) === type.reduce((a,b) => a+b, 0)) { type[i]++; break; }
      }
      return type.slice(0, target);
    }
    return { ids, mapping, capacity, target, rank, dualRank, move, status, winningTickets,
      undo: () => history.pop(), assignments: assignments.slice(), first };
  }
  return { vertices, edges, defaultLines, colors, forest, makeGame };
});
