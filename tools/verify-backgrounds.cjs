const assert=require('assert'),createEnv=require('./test-harness.cjs');
const t=createEnv(true,null,true,{images:'manual',autoCards:false});
t.start();while(t.context.window.MeaningIntroduction.isPlaying())t.tickNext();
t.click('pause-read'); // Isolate background loading from the automatic opening intertitle.
const b=t.context.window.MeaningBackgrounds,el=t.el;
const request=pattern=>t.images.findLast(image=>image.onload&&pattern.test(image.src));
const train=request(/train\.png$/);assert(train);
b.switchTo('barracks');const barracks=request(/barracks\.png$/);assert(barracks);
train.succeed();assert.notEqual(el('story').dataset.background,'train','late scene must not overwrite the selected scene');
barracks.succeed();assert.equal(el('story-background').src,'assets/barracks.png');assert.equal(el('story').dataset.background,'barracks');
b.switchTo('ward');request(/ward\.png$/).fail();
for(let n=0;!request(/ward\.png\?retry=\d+-1$/);n++){assert(n<10);t.tickNext();}
const retry=request(/ward\.png\?retry=\d+-1$/);assert(retry);retry.fail();
assert.equal(el('story').dataset.backgroundState,'error');assert(!el('retry-background').hidden);assert.equal(el('story-background').src,'assets/barracks.png','failed request preserves the last valid image');
t.click('retry-background');request(/ward\.png$/).succeed();assert.equal(el('story-background').src,'assets/ward.png');assert(el('retry-background').hidden);
b.switchTo('sunset');const sunset=request(/sunset\.png$/);b.switchTo('ward');sunset.succeed();assert.equal(el('story-background').src,'assets/ward.png');
b.switchTo('paper');let steps=0;while(!t.images.some(i=>/paper\.png\?retry=\d+-1$/.test(i.src))){assert(steps++<20);t.tickNext();}
request(/paper\.png\?retry=\d+-1$/).succeed();assert.equal(el('story').dataset.background,'paper');
console.log('Backgrounds passed: late responses ignored, direct scene commit, failed loads retried, explicit retry, timeout recovery and return to an already loaded image.');
