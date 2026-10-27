/* Pure narrative rules shared by the player and route validation. */
(function (root) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  function matches(expression, flags) {
    return !expression || expression.split('&&').every(part => {
      const [key, value] = part.split('==').map(x => x.trim());
      return flags[key] === value;
    });
  }
  function next(id, flags, nodes) {
    if (id === 'KR') return flags.kurt === '听完' ? 'KT' : 'X2';
    if (id === 'DR') return flags.ward === '去' ? 'DT' : 'X3';
    if (id === 'M4') return flags.poem === '改诗' && flags.retell === '复述' ? 'X4' : 'F';
    if (id === 'CHECK') return flags.burn === '不烧' ? 'Z1' : flags.share === '谈' ? 'Z2' : 'Z3';
    return nodes[id].next;
  }
  function options(id, flags, nodes) {
    return nodes[id].options.filter(o => id !== 'TASK' || o.to === (flags.record === '寄语' ? 'END1' : 'END2'));
  }
  function pages(id, flags, name, data, incoming) {
    const scene = data.nodes[id], out = [];
    if (scene.bulletin) out.push({kind:'bulletin', text:scene.bulletin});
    const paragraphs = [...(data.transitions[incoming + '>' + id] || []), ...scene.paragraphs];
    let group = '';
    for (const para of paragraphs) {
      if (!matches(para.when, flags)) continue;
      const text = para.text.replaceAll('【名字】', name);
      if (group && group.length + text.length > 125) { out.push({kind:'prose',text:group}); group=''; }
      group += (group ? '\n\n' : '') + text;
    }
    if (group) out.push({kind:'prose',text:group});
    return out;
  }
  const core = {clone, matches, next, options, pages};
  root.MeaningCore = core;
  if (typeof module !== 'undefined') module.exports = core;
})(typeof window === 'undefined' ? globalThis : window);
